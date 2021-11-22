import { MoulinetteTileResult } from "./moulinette-tileresult.js"
import { MoulinetteAvailableAssets } from "./moulinette-available.js"

/**
 * Forge Module for tiles
 */
export class MoulinetteSearch extends FormApplication {

  static MAX_ASSETS = 100

  constructor(tab) {
    super()

    this.elastic = window.ElasticAppSearch.createClient({
      endpointBase: "https://moulinette.ent.eastus2.azure.elastic-cloud.com",
      searchKey: "search-ksjgexxsp1k1nxdowdgoetq5",
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
      console.log(searchTerms)

      var options = {
        //search_fields: { title: {} },
        //result_fields: { id: { raw: {} }, title: { raw: {} } }
        page: {
          size: 50,
        },
        facets: {
          publisher:[
            { type: "value", name: "creator", sort: { count: "desc" } }
          ],
          category:[
            { type: "value", name: "category", sort: { count: "desc" } }
          ]
        }
      };

      this.elastic
        .search(searchTerms, options)
        .then(resultList => {
          console.log(resultList)
          console.log(resultList.rawInfo.meta.page.total_results)

          let filters = ""
          for(const f of Object.keys(resultList.info.facets)) {
            filters += `<h2>${f}</h2><ul>`
            const facets = resultList.info.facets[f][0].data
            for(const facet of facets) {
              filters += `<li>${facet.value} (${facet.count})</li>`
            }
            filters += `</ul>`
          }
          this.html.find('.filters').html(filters)

          let html = ""
          for(const r of resultList.results) {
            html += `<div class="tileres draggable" title="${r.getRaw("name")}" data-idx="" data-path=""><img width="100" height="100" src="${r.getRaw("img")}"/></div>`
          }
          this.html.find('.list').html(html)

        })
        .catch(error => {
          console.log(`error: ${error}`);
        });
    }
  }

  /**
   * Scroll event
   */
  async _onScroll(event) {
    if(this.ignoreScroll) return;
    const bottom = $(event.currentTarget).prop("scrollHeight") - $(event.currentTarget).scrollTop()
    const height = $(event.currentTarget).height();
    if(!this.assets) return;
    if(bottom - 20 < height) {
      this.ignoreScroll = true // avoid multiple events to occur while scrolling
      if(this.assetInc * MoulinetteForge.MAX_ASSETS < this.assets.length) {
        this.assetInc++
        this.html.find('.list').append(this.assets.slice(this.assetInc * MoulinetteForge.MAX_ASSETS, (this.assetInc+1) * MoulinetteForge.MAX_ASSETS))
        this._reEnableListeners()
      }
      this.ignoreScroll = false
    }
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    // re-enable core listeners (for drag & drop)
    if(!game.data.version.startsWith("0.7")) {
      this._activateCoreListeners(this.html)
    }
  }

}
