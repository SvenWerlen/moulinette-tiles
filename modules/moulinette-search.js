import { MoulinetteTileResult } from "./moulinette-tileresult.js"
import { MoulinetteAvailableResult } from "./moulinette-availableresult.js"
import { MoulinetteSearchUtils } from "./moulinette-searchUtils.js"


/**
 * Forge Module for tiles
 *
 */
export class MoulinetteSearch extends FormApplication {

  static MAX_ASSETS = 100
  static DEF_FACET_VALUE = 10
  static MAX_FACET_VALUE = 100
  static FIXED_FIELDS = ["publisher", "category", "animated"]

  constructor() {
    super()

    // temporay increase the number of facet values listed (10 by default)
    this.facetValuesSize = {}
    this.curFilterOrder = 1
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinetteSearch",
      classes: ["mtte", "forge", "search"],
      title: game.i18n.localize("mtte.moulinetteSearch"),
      template: "modules/moulinette-tiles/templates/search.hbs",
      width: 880,
      height: 600,
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  async getData() {
    this.categories = await MoulinetteSearchUtils.getCategories()
    this.cache = await game.moulinette.applications.Moulinette.fillMoulinetteCache()

    if(game.moulinette.user && game.moulinette.user.id) {
      let results = await fetch(`${game.moulinette.applications.MoulinetteClient.SERVER_URL}/search/keys/${game.moulinette.user.id}`).catch(function(e) {
        console.log(`MoulinetteSearch | Something went wrong while fetching search keys from the server`)
        console.warn(e)
        return {}
      })

      if(results) {
        results = await results.json()
        if(results.search && results.search.length > 0) {
          this.elastic = window.ElasticAppSearch.createClient({
            endpointBase: "https://moulinette.ent.westus2.azure.elastic-cloud.com",
            searchKey: results.search,
            engineName: "moulinette",
            cacheResponses: false
          })
          this.initialized = true
          return {}
        }
      }
      console.warn(`MoulinetteSearch | You are not authorized to use this function. Make sure your Patreon account is linked to Moulinette.`)

    } else {
      ui.notifications.error(game.i18n.localize("mtte.errorSearchUIAccess"))
    }

    return {}
  }

  activateListeners(html) {
    super.activateListeners(html);

    // set focus in the search field
    html.find('#search').focus()

    // buttons
    html.find("button").click(this._onClickButton.bind(this))

    // autoload on scroll
    html.find(".list").on('scroll', this._onScroll.bind(this))

    // click on facets
    html.find(".facet").click(this._onFilter.bind(this))

    // click on options
    html.find("input[type='checkbox']").click(this._onFilter.bind(this))

    // toggle expand/collapse facets
    html.find("h2").click(this._onToggleFacet.bind(this))

    // click on an image => detail
    html.find(".tileres").click(this._onShowTile.bind(this))

    // update facets status
    const prefs = game.settings.get("moulinette", "searchPrefs")
    html.find("h2").each(function(idx, el) {
      const f = $(el).data("facet")
      if(f) {
        const collapsed = prefs.facets && prefs.facets[f]
        if(collapsed) {
          $(el).find("i").attr("class", "fas fa-plus-square")
          html.find(`[data-filter='${f}']`).toggle()
        }
      }
    })

    this.html = html
  }

  /**
   * User clicked on button (or ENTER on search)
   */
  async _onClickButton(event) {
    event.preventDefault();

    const source = event.currentTarget;
    const prefs = game.settings.get("moulinette", "searchPrefs")
    // search
    if(source.classList.contains("search")) {
      const searchTerms = this.html.find("#search").val().toLowerCase()
      this.search(searchTerms, {}, { all: prefs.showAll == true })
    }
  }

  /**
   * Utility function which returns true if requirements are met
   */
  fullfillsRequirements(req) {
    if(!req) return true
    for(const k of Object.keys(req)) {
      const filterKey = ["category", "publisher"].includes(k) ? k : "cat" + k.toLowerCase()
      if(!Object.keys(this.filters).includes(filterKey) || this.filters[filterKey].id != req[k]) {
        return false
      }
    }
    return true
  }

  /**
   * User interacted with the UI and a search must be triggered
   */
  search(terms, filters = {}, options = {}, page = 1) {

    // check that user can submit
    if(!this.initialized) {
      return ui.notifications.error(game.i18n.localize("mtte.errorSearchUIAccess"));
    }

    // store current terms & filters
    this.terms = terms
    this.filters = filters
    this.searchOptions = options

    // force filter category
    filters.category = { id: "image", order: 0 }

    // prepare the request options
    const optionsFilters = { "all" : [] }
    for(const f of Object.keys(filters)) {
      const value = {}
      value[f] = filters[f].id
      optionsFilters.all.push(value)
    }

    // apply permissions
    if(!this.searchOptions.all) {
      const perms = game.moulinette.user.pledges.map(v => Number(v.id))
      perms.push(0) // 0 = free (available to anyone)
      optionsFilters.all.push({
        perm: perms
      })
    }

    const publisherSize = "publisher" in this.facetValuesSize ? this.facetValuesSize["publisher"] : MoulinetteSearch.DEF_FACET_VALUE
    const facets = {

      publisher:[
        { type: "value", name: "publisher", sort: { count: "desc" }, size: publisherSize }
      ],
      category:[
        { type: "value", name: "category", sort: { count: "desc" } }
      ],
      animated:[
        { type: "value", name: "animated", sort: { count: "desc" } }
      ]
    }

    for(const cat of this.categories) {
      const schemaId = `cat${cat.id.toLowerCase()}`
      const facetsSize = schemaId in this.facetValuesSize ? this.facetValuesSize[schemaId] : MoulinetteSearch.DEF_FACET_VALUE
      facets[schemaId] = [{ type: "value", name: schemaId, sort: { count: "desc" }, size: facetsSize}]
    }

    const elasticOptions = {
      page: { size: MoulinetteSearch.MAX_ASSETS, current: page },
      facets: facets,
      filters:  optionsFilters
    }

    this.elastic
      .search(terms, elasticOptions)
      .then(resultList => {
        this.searchResults = resultList.rawInfo.meta.page

        // build assets
        let html = ""
        for(const r of resultList.results) {
          const imageURL = `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/static/thumbs/${r.getRaw("base")}/${r.getRaw("path")}_thumb.webp`
          html += `<div class="tileres draggable" title="${r.getRaw("name")}" data-id="${r.getRaw("id")}"><img width="100" height="100" src="${imageURL}"/></div>`
        }

        const totalResults = resultList.rawInfo.meta.page.total_results
        const totalDisplayed = Math.min(page * MoulinetteSearch.MAX_ASSETS, totalResults)
        this.html.find('.footer').html(game.i18n.format("mtte.searchResult", {displayed: totalDisplayed, total: totalResults}))

        // same search => append a new page of results
        if(page > 1) {
          this.results = this.results.concat(resultList.results)
          this.html.find('.list').append(html)
          this.ignoreScroll = false
        }
        // new search => replace the entire list
        else {
          this.results = resultList.results
          let applied = []
          let filters = ""

          // add order on facets to be able to sort them
          // add dependencies on facets to be able to show/hide them
          for(const k of Object.keys(resultList.info.facets)) {
            const match = this.categories.filter(c => `cat${c.id.toLowerCase()}` == k)
            if(match.length > 0) {
              resultList.info.facets[k].order = match[0].order
              resultList.info.facets[k].requires = match[0].requires
            } else if(k == "category") {
              resultList.info.facets[k].order = 1
            } else if(k == "animated") {
              resultList.info.facets[k].order = 2
            } else {
              resultList.info.facets[k].order = 0
            }
          }
          // filter facets
          const filterKeys = Object.keys(resultList.info.facets).sort((a,b) => resultList.info.facets[a].order - resultList.info.facets[b].order);
          for(const f of filterKeys) {
            const catId = MoulinetteSearch.FIXED_FIELDS.includes(f) ? f : f.substr(3)
            const filterName = MoulinetteSearchUtils.getTranslation(catId)
            const filterValue = f in this.filters ? MoulinetteSearchUtils.getTranslation(catId, this.filters[f].id) : catId

            // applied filter
            if(Object.keys(this.filters).includes(f)) {
              applied.push({ facet: f, name: filterName, value: filterValue, order: this.filters[f].order })
            }
            else {
              // check if filter depencencies are met
              if(!this.fullfillsRequirements(resultList.info.facets[f].requires)) continue;

              // add filter
              const facets = resultList.info.facets[f][0].data
              if(facets.length == 0) continue
              filters += `<h2 data-facet="${f}"><i class="fas fa-minus-square"></i> ${filterName}</i></h2><ul data-filter="${f}">`
              for(const facet of facets) {
                const catId = MoulinetteSearch.FIXED_FIELDS.includes(f) ? f : f.substr(3)
                const facetValue = MoulinetteSearchUtils.getTranslation(catId, facet.value)
                filters += `<li><a class="facet" data-facet="${facet.value}">${facetValue} (${facet.count})</a></li>`
              }
              if(facets.length == MoulinetteSearch.DEF_FACET_VALUE) {
                filters += `<li><a class="facet" data-facet="more">${game.i18n.localize("mtte.moreFacetValues")}</a></li>`
              }
              filters += `</ul>`
            }
          }

          // add static filters
          const staticFilters = `<h2 data-facet="visibility"><i class="fas fa-minus-square"></i> ${game.i18n.localize("mtte.filterVisibility")}</h2>` +
            `<ul data-filter="visibility"><li><input type="checkbox" id="all" name="visibility" value="all" ${this.searchOptions.all ? "checked" : ""}>
          <label for="all">${game.i18n.localize("mtte.searchAllCreators")}</label></li></ul>`

          filters = staticFilters + filters
          if(applied.length > 0) {
            let appliedHTML = ""
            applied.sort((a,b) => a.order - b.order).forEach(a => { appliedHTML += `<li><a class="facet applied" data-facet="${a.facet}" title="${a.name}">${a.value}</a></li>` })
            filters = `<h2 data-facet="applied" class="applied"><i class="fas fa-minus-square"></i> ${game.i18n.localize("mtte.filterActive")}</h2><ul data-filter="applied">${appliedHTML}</ul>` + filters
          }

          this.html.find('.filters').html(filters)
          this.html.find('.list').scrollTop(0).html(html)
        }
        this._reEnableListeners()
      })
      .catch(error => {
        console.error(error)
      });
  }

  /**
   * User clicked on button (or ENTER on search)
   */
  async _onFilter(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const filter = $(source).closest('ul').data('filter');
    const facet = source.dataset.facet;
    if(filter != "visibility") {
      if(facet == "more") {
        this.facetValuesSize[filter] = MoulinetteSearch.MAX_FACET_VALUE
      }
      else if(filter == "applied") {
        if(facet in this.filters) {
          delete(this.filters[facet])
        }
      } else {
        this.filters[filter] = { id: facet, order: this.curFilterOrder++ }
      }
    }
    // remove all filters which don't met requirements any more
    for(const c of this.categories) {
      // check if filter depencencies are met
      if(!this.fullfillsRequirements(c.requires)) {
        const filterKey = "cat" + c.id.toLowerCase()
        if(Object.keys(this.filters).includes(filterKey)) {
          delete this.filters[filterKey]
        }
      }
    }

    // check if all creators is selelected
    const allCreators = this.html.find("#all").is(":checked")
    this.updatePreferencesVisibility(allCreators)

    // refresh the search
    this.search(this.terms, this.filters, { all: allCreators })
  }

  /**
   * Scroll event
   */
  async _onScroll(event) {
    if(this.ignoreScroll) return;
    const bottom = $(event.currentTarget).prop("scrollHeight") - $(event.currentTarget).scrollTop()
    const height = $(event.currentTarget).height();
    if(!this.searchResults) return;
    if(bottom - 20 < height) {
      if(this.searchResults.current < this.searchResults.total_pages) {
        this.ignoreScroll = true // avoid multiple events to occur while scrolling
        const nextPage = this.search(this.terms, this.filters, this.searchOptions, this.searchResults.current+1)
      }
    }
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    this._activateCoreListeners(this.html)
  }

  /**
   * Updates settings with new facet status
   */
  async updatePreferencesFacet(facet, status) {
    const prefs = game.settings.get("moulinette", "searchPrefs")
    if(!prefs.facets) {
      prefs.facets = {}
    }
    if(status) {
      prefs.facets[facet] = status // true means facet is collapsed
    } else {
      delete prefs.facets[facet]
    }

    await game.settings.set("moulinette", "searchPrefs", prefs)
  }

  /**
   * Updates settings with new visibility state
   */
  async updatePreferencesVisibility(allCreatorsVisible) {
    const prefs = game.settings.get("moulinette", "searchPrefs")
    prefs.showAll = allCreatorsVisible
    await game.settings.set("moulinette", "searchPrefs", prefs)
  }

  /**
   * Toggle collapse/expand category
   */
  async _onToggleFacet(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const facet = $(source).data("facet")
    if(facet) {
      this.html.find(`[data-filter='${facet}']`).toggle()
      const icon = $(source).find("i")
      const wasCollapsed = icon.hasClass("fa-plus-square")
      // change icon
      icon.attr("class", wasCollapsed ? "fas fa-minus-square" : "fas fa-plus-square")
      // store into settings
      await this.updatePreferencesFacet(facet, !wasCollapsed)
    }
  }

  /**
   * Retrieves the pack and tile from cache
   * Based on the provided search result ID
   */
  getAssetFromSearchResult(id) {
    const entry = this.results.find(r => r.getRaw("id") == id)
    if(!entry || !this.cache) {
      return console.warn("Moulinette Search | Not able find selected image from cache")
    }

    // retrieve pack from cache
    const packId = entry.getRaw("packid")
    const pack = this.cache.packs.find(p => p.packId == packId)
    // retrieve pack from available assets
    if(!pack) {
      const creator = entry.getRaw("publisher")
      const pack = entry.getRaw("pack")
      const asset = entry.getRaw("path")
      const basepath = entry.getRaw("base")
      new MoulinetteAvailableResult(creator, pack, `${basepath}/${asset}_thumb.webp`).render(true)
      return null;
    }

    // retrieve tile from cache
    const tile = this.cache.assets.find(a => a.pack == pack.idx && a.filename.startsWith(entry.getRaw("path")))
    if(!tile) {
      console.warn(`Moulinette Search | Not able to find tile from pack "${pack.publisher} | ${pack.name}" with path "${entry.getRaw("path")}"`)
      return null;
    }

    // prepare URL & SAS
    tile.assetURL = `${game.moulinette.applications.MoulinetteFileUtil.getBaseURL()}${pack.path}/${tile.filename}`
    if(tile.data && tile.data.img) {
      tile.baseURL = `${game.moulinette.applications.MoulinetteFileUtil.getBaseURL()}${pack.path}/${tile.data.img.substring(0, tile.data.img.lastIndexOf('.'))}`
    }
    tile.sas = "?" + pack.sas

    return { pack: pack, tile: tile }
  }

  _onDragStart(event) {
    const div = event.currentTarget;
    const id = div.dataset.id;
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    const result = this.getAssetFromSearchResult(id)
    if(!result) {
      return;
    };

    let pack = result.pack
    let tile = result.tile

    // when dropping a scene, the tile must be converted to point to the image (rather than the JSON)
    if(tile.filename.endsWith(".json")) {
      tile = duplicate(tile)
      tile.filename = tile.data.img
      delete tile.data
    }

    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        tile: tile,
        pack: pack,
        tileSize: size
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        tile: tile,
        pack: pack
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        tile: tile,
        pack: pack
      };
    }

    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }


  _onShowTile(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const id = source.dataset.id;

    const result = this.getAssetFromSearchResult(id)
    if(!result) return;

    // tile or scene?
    if(result.tile && result.tile.filename.endsWith(".json")) {
      const sceneModule = game.moulinette.forge.find( f => f.id == "scenes" )
      if(!sceneModule) {
        console.warn("Moulinette Search | moulinette-scenes (module) is not installed or enabled!")
      } else {
        sceneModule.instance.previewScene(result.tile, result.pack)
      }
    } else {
      new MoulinetteTileResult(duplicate(result.tile), duplicate(result.pack)).render(true)
    }
  }
}
