import { MoulinetteTileResult } from "./moulinette-tileresult.js"
import { MoulinetteAvailableAssets } from "./moulinette-available.js"
import { MoulinetteDropAsActor } from "./moulinette-dropas-actor.js"

/**
 * Forge Module for tiles
 */
export class MoulinetteTiles extends game.moulinette.applications.MoulinetteForgeModule {

  static FOLDER_CUSTOM_IMAGES = "moulinette/images/custom"
  static FOLDER_CUSTOM_TILES  = "moulinette/tiles/custom"
  static THUMBSIZES = [25, 50, 75, 100, 125]
  
  constructor() {
    super()
    this.thumbsize = 3
  }

  supportsThumbSizes() { return true }
  
  clearCache() {
    this.assets = null
    this.assetsPacks = null
    this.searchResults = null
    this.matchesCloud = null
    this.pack = null
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    if(this.assetsPacks) {
      return duplicate(this.assetsPacks)
    }
      
    const user = await game.moulinette.applications.Moulinette.getUser()
    const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoi/assets/" + game.moulinette.user.id,
      baseURL + "moulinette/images/custom/index.json",
      baseURL + "moulinette/tiles/custom/index.json"
    ])

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
  async generateAsset(r, idx) {
    const thumbSize = MoulinetteTiles.THUMBSIZES[this.thumbsize]
    const pack = this.assetsPacks[r.pack]
    const URL = pack.isRemote || pack.isLocal ? "" : await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    const showThumbs = game.settings.get("moulinette-tiles", "tileShowVideoThumb");
    let sasThumb = null
    
    // pre-signed url for accessing Digital Ocean Bucket
    if(Array.isArray(pack.sas)) {
      r.sas = pack.sas[2*idx-2]
      sasThumb = pack.sas[2*idx-1]
    }
    // sas (Shared access signature) for accessing remote files (Azure)
    else {
      r.sas = pack.sas ? "?" + pack.sas : ""
      sasThumb = r.sas
    }
    let html = ""
    r.assetURL = r.filename.match(/^https?:\/\//) ? r.filename : `${URL}${pack.path}/${game.moulinette.applications.MoulinetteFileUtil.encodeURL(r.filename)}`
    if(r.filename.endsWith(".webm")) {
      const thumbnailURL = showThumbs ? r.assetURL.substr(0, r.assetURL.lastIndexOf('.') + 1) + "webp" + r.sas : ""
      html = `<div class="tileres video draggable fallback" title="${r.filename}" data-idx="${idx}" data-path="${r.filename}">` +
        `<img width="${thumbSize}" class="cc_image" height="${thumbSize}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="background-image: url(${thumbnailURL})"/>` +
        `<video width="${thumbSize}" height="${thumbSize}" autoplay loop muted><source src="" data-src="${r.assetURL}${r.sas}" type="video/webm"></video>`
    } else {
      const assetName = r.data && r.data.name ? r.data.name : r.filename
      const thumbnailURL = pack.isRemote ? r.assetURL.substr(0, r.assetURL.lastIndexOf('.')) + "_thumb.webp" + sasThumb : r.assetURL + r.sas
      html = `<div class="tileres draggable" title="${assetName}" data-idx="${idx}" data-path="${r.filename}"><img width="${thumbSize}" height="${thumbSize}" src="${thumbnailURL}"/>`
    }
    const favs = this.isFavorite(pack, r)
    html += `<div class="fav">`
    for( const f of favs ) {
      html += `<i class="info ${f}"></i>`
    }
    return html + "</div></div>"
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack, publisher, type) {
    let assets = []
    this.pack = pack
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!publisher || publisher.length == 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }

    // clear folder selection (if any)
    game.moulinette.cache.setData("selAssets", null)

    
    const searchTermsList = searchTerms.split(" ")
    // filter list according to search terms and selected pack or publisher
    this.searchResults = this.assets.filter( t => {
      // pack doesn't match selection
      if( pack >= 0 && t.pack != pack ) return false
      // publisher doesn't match selection
      if( publisher && publisher != this.assetsPacks[t.pack].publisher ) return false
      // remove webm if type specified
      if( type && type != "imagevideo" && t.filename.endsWith(".webm") ) return false
      // check if text match
      for( const f of searchTermsList ) {
        if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    const viewMode = game.settings.get("moulinette", "displayMode")
    
    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      for(const r of this.searchResults) {
        idx++
        assets.push(await this.generateAsset(r, idx))
      }
    }
    // view #2 (by folder)
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        const random = `<a class="random draggable"><i class="fas fa-dice"></i></a>`
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-path="${k}"><h2 class="expand">${random} ${k} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-path="${k}"><h2>${random} ${k} (${folders[k].length}) </h2></div>`)
        }
        for(const a of folders[k]) {
          assets.push(await this.generateAsset(a, a.idx))
        }
      }
    }
    
    // retrieve available assets that the user doesn't have access to
    this.matchesCloud = await game.moulinette.applications.MoulinetteFileUtil.getAvailableMatches(searchTerms, "tiles", this.assetsPacks)
    
    return assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html, callbackSelect) {
    // keep html for later usage
    this.html = html
    
    // when click on tile
    if(callbackSelect) {
      this.html.find(".tileres").click(this._onSelect.bind(this,callbackSelect))
    } else {
      this.html.find(".tileres").click(this._onShowTile.bind(this))
    }

    // when right-click on tile
    this.html.find(".tileres").mousedown(this._onMouseDown.bind(this))

    // when right-click on folder
    this.html.find(".folder").mousedown(this._onMouseDown.bind(this))
    
    // when choose mode
    this.html.find(".options .dropmode").click(event => {
      const source = event.currentTarget;
      let mode = ["tile","article","actor"].includes(source.value) ? source.value : "tile"
      game.settings.set("moulinette", "tileMode", mode)
      // update macro
      const macroPrefs = game.settings.get("moulinette", "tileMacro")
      const macro = macroPrefs[mode] ? macroPrefs[mode] : ""
      this.html.find(".options .macro").val(macro)
    })
    
    // when change DPI
    this.html.find(".options .tilesize").change(event => {
      const source = event.currentTarget;
      if(!isNaN(source.value)) {
        game.settings.set("moulinette", "tileSize", Number(source.value))
      }
    })
    
    // when change macro
    this.html.find(".options .macro").change(event => {
      const tileMode = game.settings.get("moulinette", "tileMode")
      const macroPrefs = game.settings.get("moulinette", "tileMacro")
      macroPrefs[tileMode] = event.currentTarget.value
      game.settings.set("moulinette", "tileMacro", macroPrefs)
    })
    
    // display/hide showCase
    const showCase = this.html.find(".showcase")
    if(this.pack >= 0 && this.assetsPacks[this.pack] && this.assetsPacks[this.pack].isShowCase) {
      const pack = this.assetsPacks[this.pack]
      showCase.html(game.i18n.localize("mtte.showCase"))
      showCase.find(".link").text(pack.publisher)
      showCase.find(".link").attr('href', pack.pubWebsite)
      showCase.removeClass("clickable")
      showCase.show()
    } 
    else if(this.matchesCloud && this.matchesCloud.length > 0) {
      // display/hide additional content
      let count = 0
      this.matchesCloud.forEach( m => count += m.matches.length )
      showCase.html('<i class="fas fa-exclamation-circle"></i> ' + game.i18n.format("mtte.showCaseAssets", {count: count}))
      showCase.addClass("clickable")
      const matches = this.matchesCloud
      showCase.click(ev => new MoulinetteAvailableAssets(duplicate(matches)).render(true))
      showCase.show()
    }
    else {
      showCase.html("")
      showCase.removeClass("clickable")
      showCase.hide()
    }

    this.html.find(".random").click(event => {
      event.preventDefault();
      event.stopPropagation();
      const path = $(event.currentTarget).closest('.folder').data('path')
      const assets = this.searchResults.filter(a => a.filename.startsWith(path) && a.filename.indexOf("/", path.length) < 0)
      game.moulinette.cache.setData("selAssets", assets)
      this.html.find(".folder").removeClass("selected")
      this.html.find(`[data-path='${path}']`).addClass("selected")
      ui.notifications.info(game.i18n.format("mtte.randomNotification", {count: assets.length}));
      canvas.moulinette.activate()
    })
    
    // display hide video
    this.html.find(".tileres.video").mouseover(this._toggleOnVideo.bind(this))
    this.html.find(".tileres.video").mouseout(this._toggleOffVideo.bind(this))

    // adapt fallback size to current size
    const size = MoulinetteTiles.THUMBSIZES[this.thumbsize]
    this.html.find(".fallback").css("min-width", size).css("min-height", size)
  }
  
  
  /**
   * Footer: Dropmode
   */
  async getFooter() {
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")
    const compact = game.settings.get("moulinette-core", "uiMode") == "compact"
    const macro = MoulinetteTiles.getMacroNames()

    const tileMode = compact ? `<i class="fas fa-cubes" title="${game.i18n.localize("mtte.tile")}"></i>` : game.i18n.localize("mtte.tile")
    const articleMode = compact ? `<i class="fas fa-book-open" title="${game.i18n.localize("mtte.article")}"></i>` : game.i18n.localize("mtte.article")
    const tokenMode = compact ? `<i class="fas fa-users" title="${game.i18n.localize("mtte.actor")}"></i>` : game.i18n.localize("mtte.actor")

    return `<div class="showcase"></div>
      <div class="options"><div class="option">` +
      (compact ? "" : `${game.i18n.localize("mtte.dropmode")} <i class="fas fa-question-circle" title="${game.i18n.localize("mtte.dropmodeToolTip")}"></i>`) +
      `<input class="dropmode" type="radio" name="mode" value="tile" ${mode == "tile" ? "checked" : ""}> ${tileMode}
        <input class="dropmode" type="radio" name="mode" value="article" ${mode == "article" ? "checked" : ""}> ${articleMode}
        <input class="dropmode" type="radio" name="mode" value="actor" ${mode == "actor" ? "checked" : ""}> ${tokenMode}
      </div>
      <div class="option">` +
      (compact ? "" : `${game.i18n.localize("FILES.TileSize")} <i class="fas fa-question-circle" title="${game.i18n.localize("FILES.TileSizeHint")}"></i>`) +
      `<input class="tilesize" type="text" name="tilesize" value="${size}" maxlength="4">
      </div>
      <div class="option">` +
      (compact ? "" : `${game.i18n.localize("mtte.runMacro")} <i class="fas fa-question-circle" title="${game.i18n.localize("mtte.runMacroToolTip")}"></i>`) + 
      `<input class="macro" type="text" name="macro" value="${macro}" placeholder="${game.i18n.localize("mtte.macroExample")}">
      </div>
    </div>`
  }
  
  /**
   * Implements actions
   * - indexImages: scan folders and index found files
   * - configureSources: manage sources for indexing process
   * - customReferences: list of downloadable content
   * - howto: help on how to use the module
   */
  async onAction(classList) {
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil
    if(classList.contains("indexImages")) {
      ui.notifications.info(game.i18n.localize("mtte.indexingInProgress"));
      this.html.find(".indexImages").prop("disabled", true);
      const EXT = ["gif","jpg","jpeg","png","webp","svg", "webm"]
      // scan tiles
      let publishers = await FileUtil.scanAssets(MoulinetteTiles.FOLDER_CUSTOM_TILES, EXT)
      const customPath = game.settings.get("moulinette-core", "customPath")
      publishers.push(...await FileUtil.scanSourceAssets("tiles", EXT))
      await FileUtil.uploadFile(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", MoulinetteTiles.FOLDER_CUSTOM_TILES, true)
      // scan images
      publishers = await FileUtil.scanAssets(MoulinetteTiles.FOLDER_CUSTOM_IMAGES, EXT)
      if(customPath) {
        publishers.push(...await FileUtil.scanAssetsInCustomFolders(customPath, EXT))
      }
      publishers.push(...await FileUtil.scanSourceAssets("images", EXT))
      await FileUtil.uploadFile(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", MoulinetteTiles.FOLDER_CUSTOM_IMAGES, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      // clear cache
      game.moulinette.cache.clear()
      this.clearCache()
      return true
    }
    else if(classList.contains("configureSources")) {
      (new game.moulinette.applications.MoulinetteSources()).render(true)
    }
    else if(classList.contains("customReferences")) {
      new Dialog({title: game.i18n.localize("mtte.customReferencesPacks"), buttons: {}}, { id: "moulinette-info", classes: ["info"], template: "modules/moulinette-tiles/templates/custom-references.hbs", width: 650, height: "auto" }).render(true)
    }
    else if(classList.contains("howto")) {
      new game.moulinette.applications.MoulinetteHelp("tiles").render(true)
    }
  }
  
  onDragStart(event) {
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    // invalid action
    if(!this.searchResults || idx < 0 || idx > this.searchResults.length) return
    
    let tile, pack

    // random asset
    if(!idx) {
      const path = $(div).closest('.folder').data('path');
      const assets = this.searchResults.filter(a => a.filename.startsWith(path) && a.filename.indexOf("/", path.length) < 0)
      if(assets.length == 0) return;
      // pick 1 asset (randomly)
      tile = assets[Math.floor((Math.random() * assets.length))]
    }
    else {
      tile = this.searchResults[idx-1]
    }
    pack = this.assetsPacks[tile.pack]

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
    const idx = source.dataset.idx;
    
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      const result = this.searchResults[idx-1]
      new MoulinetteTileResult(duplicate(result), duplicate(this.assetsPacks[result.pack]), this.tab).render(true)
    }
  }
  
  async _onSelect(onSelectBind, event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = source.dataset.idx;
    
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      const tile = this.searchResults[idx-1]
      const pack = this.assetsPacks[tile.pack]
      const data = { type: "Tile", tile: tile, pack: pack }
      await MoulinetteTiles.downloadAsset(data)
      if ( onSelectBind ) onSelectBind(data.img);
    }
  }

  async _onMouseDown(event) {
    // right click
    if(event.which == 3) {
      event.preventDefault();
      const source = event.currentTarget;
      const idx = source.dataset.idx;
      const path = source.dataset.path;

      // click on single asset => toggle favorite
      if(idx) {
        if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
          const tile = this.searchResults[idx-1]
          const pack = this.assetsPacks[tile.pack]
          const icons = await this.toggleFavorite(pack, tile)

          let html = ''
          icons.forEach( i => html += `<i class="info ${i}"></i>` )
          $(source).find(".fav").html(html)
        }
      }
      // click on folder => toggle entire folder
      else {
        const selected = this.searchResults.filter(a => a.filename.startsWith(path))
        for(const s of selected) {
          const tile = s
          const pack = this.assetsPacks[s.pack]
          const icons = await this.toggleFavorite(pack, tile)

          let html = ''
          icons.forEach( i => html += `<i class="info ${i}"></i>` )
          this.html.find(`.tileres[data-path='${s.filename.replace("'", "\\'")}']`).find(".fav").html(html)
        }
      }
    }
  }
    
  _onChooseMode(event) {
    const source = event.currentTarget;
    let mode = ["tile","article","actor"].includes(source.value) ? source.value : "tile"
    game.settings.set("moulinette", "tileMode", mode)
  }
  
  _onChooseDPI(event) {
    const source = event.currentTarget;
    if(!isNaN(source.value)) {
      game.settings.set("moulinette", "tileSize", Number(source.value))
    }
  }
  
  _toggleOnVideo(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const video = $(source).find("video")
    const videoSrc = video.find("source")
    $(source).find("img").hide()
    $(source).css("background-image", "none")
    video.show()
    // play video
    videoSrc.attr('src', videoSrc.attr('data-src'));
    video.trigger('load');
  }
  
  _toggleOffVideo(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const video = $(source).find("video")
    const videoSrc = video.find("source")
    video.hide()
    $(source).find("img").show()
    $(source).css("background-image", "url(../../icons/svg/video.svg)")
    // stop video
    videoSrc.attr('src', '');
    video.trigger('pause');
  }
  
  static getMacroNames() {
    const tileMode = game.settings.get("moulinette", "tileMode")
    const macros = game.settings.get("moulinette", "tileMacro")[tileMode]
    return macros ? macros : ""
  }
  

  /**
   * Returns the list of macros (based on macro ids)
   */
  static async getMacrosV2(data) {
    const tileMode = game.settings.get("moulinette", "tileMode")
    let macroCfg = game.settings.get("moulinette", "tileMacros")[tileMode]

    if(macroCfg) {
      const compendium = game.settings.get("moulinette-tiles", "macroCompendium")
      const pack = compendium ? game.packs.get(compendium) : null
      if(pack) {
        const macros = []
        for(const id of macroCfg) {
          const macro = await pack.getDocument(id)
          if(macro) {
            macros.push(macro)
          }
        }
        return macros
      }
    }
    return [];
  }

  /**
   * Returns the list of macros (based on macro names)
   */
  static async getMacros(data) {
    if(data.source == "mtteSearch") {
      return await MoulinetteTiles.getMacrosV2(data)
    }
    const tileMode = game.settings.get("moulinette", "tileMode")
    let macros = game.settings.get("moulinette", "tileMacro")[tileMode]
    const results = []

    // add specific macros (from favorite)
    if(data.macros && data.macros.length > 0) {
      macros = macros ? macros + "," + data.macros : data.macros
    }

    if(macros) {
      const list = macros.split(",")
      for( const macroName of list ) {
        const macro = game.macros.find(o => o.name === macroName.trim())
        if(macro) {
          results.push(macro)
        } else {
          console.warn(`Moulinette Tiles | Macro ${macroName} couldn't be found!`)
        }
      }
    }
    return results;
  }

  
  /**
   * Download the asset received from event
   * - data.img will be set with local path
   */
  static async downloadAsset(data) {
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const baseURL = await FILEUTIL.getBaseURL()
    // new faceted search?
    if(data.tile.search) {
      const today = new Date()
      const imageFileName = data.tile.filename
      const publisher = FILEUTIL.generatePathFromName(data.tile.search.src)
      const pack = `${today.getFullYear()}-${(today.getMonth() < 9 ? "0" : "") + (today.getMonth() + 1)}-${(today.getDate() < 10 ? "0" : "" ) + today.getDate()}`
      const path = `moulinette/images/${publisher}/${pack}`
      
      // download & upload image
      const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: data.tile.search.url }) }
      const res = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/search/download", headers)
      const blob = await res.blob()
      await FILEUTIL.uploadFile(new File([blob], imageFileName, { type: blob.type, lastModified: today }), imageFileName, path, false)
      data.img = baseURL + `${path}/${imageFileName}`
    }
    // local assets
    else if(!data.pack.isRemote) {
      const localBaseURL = data.pack.isLocal ? "" : baseURL
      data.img =  data.tile.filename.match(/^https?:\/\//) ? data.tile.filename : localBaseURL + `${data.pack.path}/${FILEUTIL.encodeURL(data.tile.filename)}`
    }
    // moulinette cloud assets
    else {
      await FILEUTIL.downloadAssetDependencies(data.tile, data.pack, "tiles")
      data.img = baseURL + FILEUTIL.getMoulinetteBasePath("tiles", data.pack.publisher, data.pack.name) + data.tile.filename
    }

    // Clear useless info
    delete data.pack
    delete data.tile
  }
  
  /**
   * Generates moulinette folders
   */
  static async getOrCreateArticleFolder(publisher, pack) {
    let moulinetteFolder = game.folders.filter( f => f.name == "Moulinette" && f.type == "JournalEntry" )

    // main
    if( moulinetteFolder.length == 0 ) {
      moulinetteFolder = await Folder.create({name:"Moulinette", type:"JournalEntry", parent: null})
    } else {
      moulinetteFolder = moulinetteFolder[0]
    }
    // publisher level
    let publisherFolder = moulinetteFolder.children.filter( c => c.name == publisher )
    if( publisherFolder.length == 0 ) {
      publisherFolder = await Folder.create({name: publisher, type: "JournalEntry", parent: moulinetteFolder.id })
    } else {
      publisherFolder = publisherFolder[0]
    }
    // pack level
    let packFolder = publisherFolder.children.filter( c => c.name == pack )
    if( packFolder.length == 0 ) {
      packFolder = await Folder.create({name: pack, type: "JournalEntry", parent: publisherFolder.id })
    } else {
      packFolder = packFolder[0]
    }
    return packFolder
  }
  
  /**
   * Generates an article from the dragged image
   */
  static async createArticle(data, activateLayer = true) {
    if ( !data.tile || !data.pack ) return;
    
    const folder = await MoulinetteTiles.getOrCreateArticleFolder(data.pack.publisher, data.pack.name)
    await MoulinetteTiles.downloadAsset(data)    
    
    // generate journal
    const name = data.img.split('/').pop()
    const entry = await JournalEntry.create( {name: name, img: data.img, folder: folder.id} )
    const coord = canvas.grid.getSnappedPosition(data.x - canvas.grid.w/2, data.y - canvas.grid.h/2)
    
    // Default Note data
    const noteData = {
      entryId: entry.id,
      x: coord.x + canvas.grid.w/2,
      y: coord.y + canvas.grid.h/2,
      icon: CONST.DEFAULT_NOTE_ICON,
      iconSize: 40,
      textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
      fontSize: 48,
      fontFamily: CONFIG.defaultFontFamily
    };

    // Create a NoteConfig sheet instance to finalize the creation
    let note = (await canvas.scene.createEmbeddedDocuments(Note.embeddedName, [noteData], { parent: canvas.scene }))[0]
    note = note._object
    if(activateLayer) {
      canvas.notes.activate()
    }
    
    // Call macro
    const macros = await MoulinetteTiles.getMacros(data)
    for(const macro of macros) {
      game.moulinette.param = [entry, note]
      macro.execute()
      delete game.moulinette.param
    }
    
    note.sheet.render(true);
  }

  
  
  /**
   * Generate a tile from the dragged image
   */
  static async createTile(data, activateLayer = true) {
    if ( !data.tile || !data.pack ) return;
    await MoulinetteTiles.downloadAsset(data)
    
    // Determine the tile size
    const tex = await loadTexture(data.img);
    const ratio = canvas.dimensions.size / (data.tileSize || canvas.dimensions.size);
    data.width = tex.baseTexture.width * ratio;
    data.height = tex.baseTexture.height * ratio;

    // Validate that the drop position is in-bounds and snap to grid
    if ( !canvas.grid.hitArea.contains(data.x, data.y) ) return false;
    data.x = data.x - (data.width / 2);
    data.y = data.y - (data.height / 2);
    //if ( !event.shiftKey ) mergeObject(data, canvas.grid.getSnappedPosition(data.x, data.y));

    // Create the tile as hidden if the ALT key is pressed
    //if ( event.altKey ) data.hidden = true;
    const canvasClass = canvas.background
    const layer = canvas.activeLayer && canvas.activeLayer.name == "ForegroundLayer" ? canvas.foreground : canvas.background
    
    // make sure to always put tiles on top
    let maxZ = 0
    canvasClass.placeables.forEach( t => { 
      if(t.zIndex > maxZ) maxZ = t.zIndex
    })
    data.z = maxZ
    
    // Create the Tile
    let tile;
    data.overhead = layer.name == "ForegroundLayer"
    tile = (await canvas.scene.createEmbeddedDocuments(Tile.embeddedName, [data], { parent: canvas.scene }))[0]
    tile = tile._object

    if(activateLayer && canvas.activeLayer != layer) {
      layer.activate()
    } 
    
    // Call macro
    const macros = await MoulinetteTiles.getMacros(data)
    for(const macro of macros) {
      game.moulinette.param = [tile]
      macro.execute()
      delete game.moulinette.param
    }
  }    


  async onShortcut(type) {
    if(type == "favorites") {
      (new game.moulinette.applications.MoulinetteTilesFavorites()).render(true)
    } else if(type == "search") {
      (new game.moulinette.applications.MoulinetteSearch()).render(true)
    }

  }


  async onLeftClickGrid(eventData) {
    const assets = game.moulinette.cache.getData("selAssets")
    if(!assets || assets.length == 0) {
      return console.log("Moulinette Tiles | Click on a folder (dice icon) then click on the scene to randomly drop assets from that folder")
    }
    if(!this.assetsPacks) {
      await this.getPackList()
    }

    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    // random pick tile
    const tile = assets[Math.floor((Math.random() * assets.length))]
    const pack = this.assetsPacks[tile.pack]

    const data = {
      x: eventData.x,
      y: eventData.y,
      tile: tile,
      pack: pack
    }
    if(mode == "tile") {
      data.tileSize = size
    }

    if(mode == "article") {
      MoulinetteTiles.createArticle(data, false)
    }
    else if(mode == "actor") {
      const actorId = game.settings.get("moulinette", "tileActorId");
      const actorLink = game.settings.get("moulinette", "tileActorLink");
      const actor = game.actors.find( a => a.id == actorId)
      const dropAsActor = new MoulinetteDropAsActor(data)
      if(eventData.shift && actor) {
        dropAsActor.createToken(actor, actorLink, false)
      } else {
        dropAsActor.render(true)
      }
    }
    else if(mode == "tile") {
      MoulinetteTiles.createTile(data, false)
    }
  }

  onRightClickGrid(eventData) {
    const mode = game.settings.get("moulinette", "tileMode")
    if(mode == "tile") {
      canvas.background.activate()
    } else if(mode == "actor") {
      canvas.tokens.activate()
    } else if(mode == "article") {
      canvas.notes.activate()
    }
  }

  async onChangeThumbsSize(increase) {
    // change thumbsize (and check that it's within range of available sizes)
    this.thumbsize = Math.max(0, Math.min(MoulinetteTiles.THUMBSIZES.length-1, increase ? this.thumbsize + 1 : this.thumbsize -1))
    const size = MoulinetteTiles.THUMBSIZES[this.thumbsize]
    this.html.find(".tileres img").css("width", size).css("height", size)
    this.html.find(".tileres video").css("width", size).css("height", size)
    this.html.find(".fallback").css("min-width", size).css("min-height", size)
  }

}
