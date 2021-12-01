import { MoulinetteTileResult } from "./moulinette-tileresult.js"
import { MoulinetteAvailableAssets } from "./moulinette-available.js"

/**
 * Forge Module for tiles
 *
 * Don't remove (used for translations)
 * mtte.filtercategory, mtte.filterpublisher, mtte.filterImageType, mtte.filterTokenType, mtte.filterTokenSex
 *
 */
export class MoulinetteSearch extends FormApplication {

  static MAX_ASSETS = 100

  constructor(tab) {
    super()

    /*
    this.elastic = window.ElasticAppSearch.createClient({
      endpointBase: "https://moulinette.ent.eastus2.azure.elastic-cloud.com",
      searchKey: "search-ksjgexxsp1k1nxdowdgoetq5",
      engineName: "moulinette"
    })*/

    this.elastic = window.ElasticAppSearch.createClient({
      endpointBase: "https://my-deployment-6f2001.ent.eastus2.azure.elastic-cloud.com",
      searchKey: "search-4vvpexnkt1giga8niynfy952",
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
   * User interacted with the UI and a search must be triggered
   */
  search(terms, filters = {}, page = 1) {

    // store current terms & filters
    this.terms = terms
    this.filters = filters
    console.log(this.filters)

    // prepare the request options
    const optionsFilters = { "all" : [] }
    for(const f of Object.keys(filters)) {
      const value = {}
      value[f] = filters[f]
      optionsFilters.all.push(value)
    }

    const options = {
      page: { size: MoulinetteSearch.MAX_ASSETS, current: page },
      facets: {
        publisher:[
          { type: "value", name: "publisher", sort: { count: "desc" } }
        ],
        category:[
          { type: "value", name: "category", sort: { count: "desc" } }
        ]
      },
      filters:  optionsFilters
    }

    this.elastic
      .search(terms, options)
      .then(resultList => {
        this.searchResults = resultList.rawInfo.meta.page
        console.log(resultList)

        // build assets
        let html = ""
        for(const r of resultList.results) {
          html += `<div class="tileres draggable" title="${r.getRaw("name")}" data-idx="" data-path=""><img width="100" height="100" src="${r.getRaw("img")}"/></div>`
        }

        const totalResults = resultList.rawInfo.meta.page.total_results
        const totalDisplayed = Math.min(page * MoulinetteSearch.MAX_ASSETS, totalResults)
        this.html.find('.footer').html(game.i18n.format("mtte.searchResult", {displayed: totalDisplayed, total: totalResults}))

        // same search => append a new page of results
        if(page > 1) {
          this.html.find('.list').append(html)
          this.ignoreScroll = false
          this._reEnableListeners()
        }
        // new search => replace the entire list
        else {
          let applied = ""
          let filters = ""
          for(const f of Object.keys(resultList.info.facets)) {
            const filterName = game.i18n.localize("mtte.filter" + f)
            // applied filter
            if(Object.keys(this.filters).includes(f)) {
              applied += `<li><a class="facet" data-facet="${f}">${filterName}: ${this.filters[f]}</a></li>`
            }
            else {
              filters += `<h2>${filterName}</h2><ul data-filter="${f}">`
              const facets = resultList.info.facets[f][0].data
              for(const facet of facets) {
                filters += `<li><a class="facet" data-facet="${facet.value}">${facet.value} (${facet.count})</a></li>`
              }
              filters += `</ul>`
            }
          }
          if(applied.length > 0) {
            filters = `<h2>${game.i18n.localize("mtte.filterActive")}</h2><ul data-filter="applied">${applied}</ul>` + filters
          }

          this.html.find('.filters').html(filters)
          this.html.find('.list').scrollTop(0).html(html)
          this.html.find('.facet').click(this._onFilter.bind(this))
        }
      })
      .catch(error => {
        console.log(`error: ${error}`);
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
    if(filter == "applied") {
      if(facet in this.filters) {
        delete(this.filters[facet])
      }
    } else {
      this.filters[filter] = facet
    }
    this.search(this.terms, this.filters)
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
        const nextPage = this.search(this.terms, this.filters, this.searchResults.current+1)
      }
    }
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    this._activateCoreListeners(this.html)
  }

}
