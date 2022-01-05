import { MoulinetteTileResult } from "./moulinette-tileresult.js"
import { MoulinetteAvailableAssets } from "./moulinette-available.js"
import { MoulinetteSearchUtils } from "./moulinette-searchUtils.js"


/**
 * Forge Module for tiles
 *
 */
export class MoulinetteSearch extends FormApplication {

  static MAX_ASSETS = 100

  constructor(tab) {
    super()

    this.elastic = window.ElasticAppSearch.createClient({
      endpointBase: "https://moulinette.ent.westus2.azure.elastic-cloud.com",
      searchKey: "search-inzzcstcgv9giei4gxaubf2n",
      engineName: "moulinette"
    })
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

    this.html = html
  }

  /**
   * User clicked on button (or ENTER on search)
   */
  async _onClickButton(event) {
    event.preventDefault();

    const source = event.currentTarget;
    // search
    if(source.classList.contains("search")) {
      const searchTerms = this.html.find("#search").val().toLowerCase()
      this.search(searchTerms)
    }
  }

  /**
   * Utility function which returns true if requirements are met
   */
  fullfillsRequirements(req) {
    if(!req) return true
    for(const k of Object.keys(req)) {
      const filterKey = ["category", "publisher"].includes(k) ? k : "cat" + k.toLowerCase()
      if(!Object.keys(this.filters).includes(filterKey) || this.filters[filterKey] != req[k]) {
        return false
      }
    }
    return true
  }

  /**
   * User interacted with the UI and a search must be triggered
   */
  search(terms, filters = {}, options = {}, page = 1) {

    // store current terms & filters
    this.terms = terms
    this.filters = filters
    this.searchOptions = options

    // prepare the request options
    const optionsFilters = { "all" : [] }
    for(const f of Object.keys(filters)) {
      const value = {}
      value[f] = filters[f]
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

    const facets = {
      publisher:[
        { type: "value", name: "publisher", sort: { count: "desc" } }
      ],
      category:[
        { type: "value", name: "category", sort: { count: "desc" } }
      ]
    }

    for(const cat of this.categories) {
      const schemaId = `cat${cat.id.toLowerCase()}`
      facets[schemaId] = [{ type: "value", name: schemaId, sort: { count: "desc" }}]
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
        //console.log(resultList)

        // build assets
        let html = ""
        for(const r of resultList.results) {
          const imageURL = `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/static/thumbs/${r.getRaw("base")}/${r.getRaw("path")}_thumb.webp`
          html += `<div class="tileres draggable" title="${r.getRaw("name")}" data-id="${r.getRaw("id")}" data-path=""><img width="100" height="100" src="${imageURL}"/></div>`
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
          let applied = ""
          let appliedCount = 0
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
            } else {
              resultList.info.facets[k].order = 0
            }
          }
          // filter facets
          const filterKeys = Object.keys(resultList.info.facets).sort((a,b) => resultList.info.facets[a].order - resultList.info.facets[b].order);
          for(const f of filterKeys) {
            const filterName = game.i18n.localize("mtte.filter" + f)

            // applied filter
            if(Object.keys(this.filters).includes(f)) {
              applied += `<li><a class="facet" data-facet="${f}">${filterName}: ${this.filters[f]}</a></li>`
              appliedCount++
            }
            else {
              // check if filter depencencies are met
              if(!this.fullfillsRequirements(resultList.info.facets[f].requires)) continue;

              // add filter
              const facets = resultList.info.facets[f][0].data
              if(facets.length == 0) continue
              filters += `<h2 data-facet="${f}"><i class="fas fa-minus-square"></i> ${filterName}</i></h2><ul data-filter="${f}">`
              for(const facet of facets) {
                filters += `<li><a class="facet" data-facet="${facet.value}">${facet.value} (${facet.count})</a></li>`
              }
              filters += `</ul>`
            }
          }
          if(applied.length > 0) {
            filters = `<h2 data-facet="applied"><i class="fas fa-minus-square"></i> ${game.i18n.localize("mtte.filterActive")}</h2><ul data-filter="applied">${applied}</ul>` + filters
          }

          // add static filters
          const staticFilters = `<h2 data-facet="visibility"><i class="fas fa-minus-square"></i> ${game.i18n.localize("mtte.filterVisibility")}</h2>` +
            `<ul data-filter="visibility"><li><input type="checkbox" id="all" name="visibility" value="all" ${this.searchOptions.all ? "checked" : ""}>
          <label for="all">${game.i18n.localize("mtte.searchAllCreators")}</label></li></ul>`

          this.html.find('.filters').html(staticFilters + filters)
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
      if(filter == "applied") {
        if(facet in this.filters) {
          delete(this.filters[facet])
        }
      } else {
        this.filters[filter] = facet
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
   * Toggle collapse/expand category
   */
  async _onToggleFacet(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const facet = $(source).data("facet")
    if(facet) {
      this.html.find(`[data-filter='${facet}']`).toggle()
      const icon = $(source).find("i")
      icon.attr("class", icon.hasClass("fa-plus-square") ? "fas fa-minus-square" : "fas fa-plus-square")
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
    if(!pack) {
      console.warn(`Moulinette Search | Not able to find pack with id ${packId}`)
      return null;
    }

    // retrieve tile from cache
    const tile = this.cache.assets.find(a => a.pack == pack.idx && a.filename.startsWith(entry.getRaw("path")))
    if(!tile) {
      console.warn(`Moulinette Search | Not able to find tile from pack "${pack.publisher} | ${pack.name}" with path "${match[1]}"`)
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
      return ui.notifications.error(game.i18n.localize("mtte.errorSearchResult"));
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
    if(result.tile.filename.endsWith(".json")) {
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
