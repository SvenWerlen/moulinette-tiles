/*************************************************
 * Tiles favorites
 *************************************************/
import { MoulinetteTilesFavoritesSettings } from "./moulinette-tiles-favorites-settings.js"
import { MoulinetteTilesFavoritesCategories } from "./moulinette-tiles-favorites-categories.js"

export class MoulinetteTilesFavorites extends FormApplication {
  
  static MAX_ASSETS = 100
  
  constructor() {
    super()

    this.tab = game.settings.get("moulinette", "currentFav")
    this.assetInc = 0
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-favorites",
      classes: ["mtte", "forge", "favorites"],
      title: game.i18n.localize("mtte.favorites"),
      template: "modules/moulinette-tiles/templates/favorites.hbs",
      top: 0,
      left: 0,
      width: 240,
      height: 30000, // force 100%
      minimizable: false,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: true,
      submitOnClose: false
    });
  }

  /**
   * Returns the list of packs (available to that user)
   */
  async getPackList() {
    if(this.assetsPacks) {
      return duplicate(this.assetsPacks)
    }

    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/images/custom/index.json",
      game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/tiles/custom/index.json"])

    // remove thumbnails and non-images from assets
    const webmList = index.assets.filter(i => i.filename.endsWith(".webm"))
    const thumbList = webmList.map(i => i.filename.substr(0, i.filename.lastIndexOf('.') + 1) + "webp")
    this.assets = index.assets.filter(a => {
      if(a.type != "img" || thumbList.includes(a.filename)) {
        // decrease count in pack
        index.packs[a.pack].count--
        return false;
      }
      return true;
    })
    this.assetsPacks = index.packs
    return duplicate(this.assetsPacks)
  }


  /**
   * Generate a new asset (HTML) for the given result and idx
   */
  generateAsset(r, idx) {
    const pack = this.assetsPacks.find(p => p.publisher == r.pub && p.name == r.pack)

    if(!pack) {
      return null
    }

    const URL = pack.isRemote || pack.isLocal ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()

    r.sas = pack.sas ? "?" + pack.sas : "" // sas (Shared access signature) for accessing remote files (Azure)
    r.assetURL = r.asset.match(/^https?:\/\//) ? r.asset : `${URL}${pack.path}/${r.asset}`
    const thumbnailURL = pack.isRemote ? r.assetURL.substr(0, r.assetURL.lastIndexOf('.')) + "_thumb.webp" + r.sas : r.assetURL + r.sas
    return `<div class="tileres draggable" title="${r.asset}" data-idx="${idx}" data-path="${r.asset}"><img width="50" height="50" src="${thumbnailURL}"/></div>`
  }


  async getData() {
    this.curAssets = []
    await this.getPackList()

    let notFound = []
    let idx = 0
    const favs = game.settings.get("moulinette", "favorites")
    if(this.tab in favs) {
      for(const fav of favs[this.tab].list.reverse()) {
        idx++
        const html = this.generateAsset(fav, idx)
        if(html) {
          this.curAssets.push(html)
        } else {
          notFound.push(fav)
        }
      }
    }

    if(notFound.length > 0) {
      console.warn("Some assets have not been found! (probably Moulinette Cloud assets)", notFound)
    }

    const favorites = []
    for(const fav in favs) {
      if(!favs[fav].hidden) {
        favorites.push({ id: fav, icon: favs[fav].icon, active: fav == this.tab})
      }
    }

    favorites.sort(function(a, b) {
      if (a.id == "history" || a.id == "default") {
        return -1;
      } else if (b.id == "history" || b.id == "default") {
        return 1;
      }
      return a.id < b.id ? -1 : 1;
    });

    const categories = this.tab != "history"
    const random = this.tab != "history"

    console.log(favorites)

    return { assets: this.curAssets.slice(0, MoulinetteTilesFavorites.MAX_ASSETS), favorites: favorites, showCategories: categories, showRandom: random };
  }
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    //$("#controls").hide()
    //$("#logo").hide()
    //$("#navigation").hide()
    //$("#players").hide()

    // keep html for later usage
    this.html = html
    
    // navigation
    html.find(".tabs a").click(this._onNavigate.bind(this));

    // remove from favorites
    html.find(".tileres").mousedown(this._removeFav.bind(this))

    // autoload on scroll
    html.find(".tiles").on('scroll', this._onScroll.bind(this))

    // actions
    html.find(".action").click(this._onAction.bind(this));

    // close on right click
    html.find(".sidebar").mousedown(this._onMouseDown.bind(this))
  }

  _onMouseDown(event) {
    if(event.which == 3) {
      this.close()
    }
  }

  close() {
    super.close()
    //$("#controls").show()
    //$("#logo").show()
    //$("#navigation").show()
    //$("#players").show()
  }

  async _removeFav(event) {
    if(event.which == 3) {
      event.stopPropagation();
      const div = event.currentTarget;
      const idx = div.dataset.idx;

      // invalid action
      if(!this.assets || idx < 0 || idx > this.assets.length) return

      // retrieve selected favorite
      const favs = game.settings.get("moulinette", "favorites")
      if(this.tab in favs) {
        const fav = favs[this.tab].list.reverse()[idx-1]

        // retrieve pack & tile
        const pack = this.assetsPacks.find( p => p.publisher == fav.pub && p.name == fav.pack )
        const tile = this.assets.find( a => a.pack = pack.idx && a.filename == fav.asset )

        await game.moulinette.forge.find( f => f.id == "tiles" ).instance.toggleFavorite(pack, tile, true)
        $(div).hide()
      }
    }
    this.render();
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    this._activateCoreListeners(this.html)
  }

  /**
   * User clicked on another tab
   */
  _onNavigate(event) {
    event.preventDefault();
    const source = event.currentTarget;
    this.tab = source.dataset.tab;
    game.settings.set("moulinette", "currentFav", this.tab)
    this.render();
  }

  /**
   * User clicks on one of the actions
   */
  async _onAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    if(source.classList.contains("clear")) {
      const parent = this
      Dialog.confirm({
        title: game.i18n.localize("mtte.clearFavorites"),
        content: game.i18n.localize("mtte.clearFavoritesContent"),
        yes: async function() {
          await game.moulinette.forge.find( f => f.id == "tiles" ).instance.clearFavorites()
          parent.render()
        },
        no: () => {}
      });
    }
    else if(source.classList.contains("config")) {
      (new MoulinetteTilesFavoritesSettings()).render(true)
    }
    else if(source.classList.contains("mtte")) {
      const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
      new forgeClass("tiles").render(true)
    }
    else if(source.classList.contains("categories")) {
      (new MoulinetteTilesFavoritesCategories(game.settings.get("moulinette", "currentFav"), this.assetsPacks)).render(true)
      this.render()
    }
    else if(source.classList.contains("random")) {
      const favs = game.settings.get("moulinette", "favorites")
      if(this.tab in favs) {
        const randomList = favs[this.tab].list.map(fav => {
          // find matching pack
          const pack = this.assetsPacks.find( p => p.publisher == fav.pub && p.name == fav.pack )
          if(!pack) return null
          const tile = duplicate(this.assets.find( a => a.pack == pack.idx && a.filename == fav.asset ))
          tile.sas = "?" + pack.sas
          return tile
        }).filter(e => e != null)
        if(randomList && randomList.length > 0) {
          game.moulinette.cache.setData("selAssets", randomList)
          ui.notifications.info(game.i18n.format("mtte.randomNotification", {count: randomList.length}));
          canvas.moulinette.activate()
        }
      }
    }
  }

  _onDragStart(event) {
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    const mode = game.settings.get("moulinette", "tileMode")
    let size = game.settings.get("moulinette", "tileSize")

    // invalid action
    if(!this.assets || idx < 0 || idx > this.assets.length) return

    // retrieve selected favorite
    const favs = game.settings.get("moulinette", "favorites")
    const favGroup = favs[this.tab]
    const fav = favs[this.tab].list.reverse()[idx-1]
    if(favGroup.size > 0) { size = favGroup.size; }

    // retrieve pack & tile
    const pack = this.assetsPacks.find( p => p.publisher == fav.pub && p.name == fav.pack )
    const tile = this.assets.find( a => a.pack == pack.idx && a.filename == fav.asset )
    tile.sas = "?" + pack.sas

    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        tile: tile,
        pack: pack,
        tileSize: size,
        macros: favGroup.macros && favGroup.macros.length > 0 ? favGroup.macros : ""
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        tile: tile,
        pack: pack,
        macros: favGroup.macros && favGroup.macros.length > 0 ? favGroup.macros : ""
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        tile: tile,
        pack: pack,
        macros: favGroup.macros && favGroup.macros.length > 0 ? favGroup.macros : ""
      };
    }

    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Scroll event
   */
  async _onScroll(event) {
    if(this.ignoreScroll) return;
    const bottom = $(event.currentTarget).prop("scrollHeight") - $(event.currentTarget).scrollTop()
    const height = $(event.currentTarget).height();
    if(!this.curAssets) return;
    if(bottom - 20 < height) {
      this.ignoreScroll = true // avoid multiple events to occur while scrolling
      if(this.assetInc * MoulinetteTilesFavorites.MAX_ASSETS < this.curAssets.length) {
        this.assetInc++
        this.html.find('.tiles').append(this.curAssets.slice(this.assetInc * MoulinetteTilesFavorites.MAX_ASSETS, (this.assetInc+1) * MoulinetteTilesFavorites.MAX_ASSETS))
        this._reEnableListeners()
      }
      this.ignoreScroll = false
    }
  }
  
}
