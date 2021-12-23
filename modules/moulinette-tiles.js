import { MoulinetteTileResult } from "./moulinette-tileresult.js"
import { MoulinetteAvailableAssets } from "./moulinette-available.js"

/**
 * Forge Module for tiles
 */
export class MoulinetteTiles extends game.moulinette.applications.MoulinetteForgeModule {

  static FOLDER_CUSTOM_IMAGES = "moulinette/images/custom"
  static FOLDER_CUSTOM_TILES  = "moulinette/tiles/custom"
  
  constructor() {
    super()
  }
  
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
    const pack = this.assetsPacks[r.pack]
    const URL = pack.isRemote || pack.isLocal ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
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
    r.assetURL = r.filename.match(/^https?:\/\//) ? r.filename : `${URL}${pack.path}/${r.filename}`
    if(r.filename.endsWith(".webm")) {
      const thumbnailURL = showThumbs ? r.assetURL.substr(0, r.assetURL.lastIndexOf('.') + 1) + "webp" + r.sas : ""
      html = `<div class="tileres video draggable fallback" title="${r.filename}" data-idx="${idx}" data-path="${r.filename}">` +
        `<img width="100" class="cc_image" height="100" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="background-image: url(${thumbnailURL})"/>` +
        `<video width="100" height="100" autoplay loop muted><source src="" data-src="${r.assetURL}${r.sas}" type="video/webm"></video>`
    } else {
      const thumbnailURL = pack.isRemote ? r.assetURL.substr(0, r.assetURL.lastIndexOf('.')) + "_thumb.webp" + sasThumb : r.assetURL + r.sas
      html = `<div class="tileres draggable" title="${r.filename}" data-idx="${idx}" data-path="${r.filename}"><img width="100" height="100" src="${thumbnailURL}"/>`
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
        assets.push(this.generateAsset(r, idx))
      }
    }
    // view #2 (by folder)
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-path="${k}"><h2 class="expand">${k} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-path="${k}"><h2>${k} (${folders[k].length})</div>`)
        }
        for(const a of folders[k]) {
          assets.push(this.generateAsset(a, a.idx))
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
    
    // display hide video
    this.html.find(".tileres.video").mouseover(this._toggleOnVideo.bind(this))
    this.html.find(".tileres.video").mouseout(this._toggleOffVideo.bind(this))
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
   * - listPacks: list available packs
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
    else if(classList.contains("listPacks")) {
      // sort
      let list = duplicate(this.assetsPacks)
      list.sort((a, b) => (a.publisher == b.publisher) ? (a.name > b.name ? 1 : -1) : (a.publisher > b.publisher ? 1 : -1))
      
      let html = `<table class="mttedialog listPacks"><tr><th>${game.i18n.localize("mtte.publisher")}</th><th>${game.i18n.localize("mtte.pack")}</th><th class="num">#</th><th>${game.i18n.localize("mtte.license")}</th></tr>`
      list.forEach( t => {
        if(t.isRemote) {
          html += `<tr><td><a href="${t.pubWebsite}" target="_blank">${t.publisher}</a></td><td><a href="${t.url}" target="_blank">${t.name}</a></td><td class="num">${t.count}</td><td><a href="${t.licenseUrl}" target="_blank">${t.license}</a></td></tr>`
        } else {
          html += `<tr><td>${t.publisher}</td><td>${t.name}</td><td class="num">${t.count}</td><td>${game.i18n.localize("mtte.unknownLicense")}</td></tr>`
        }
      })
      html += "</table>"
      new Dialog({title: game.i18n.localize("mtte.listPacks"), content: html, buttons: {}}, { width: 650, height: "auto" }).render(true)
    }
    else if(classList.contains("customReferences")) {
      new Dialog({title: game.i18n.localize("mtte.customReferencesPacks"), buttons: {}}, { id: "moulinette-info", classes: ["info"], template: "modules/moulinette-tiles/templates/custom-references.hbs", width: 650, height: "auto" }).render(true)
    }
    else if(classList.contains("howto")) {
      new Dialog({title: game.i18n.localize("mtte.howto"), buttons: {}}, { id: "moulinette-help", classes: ["howto"], template: `modules/moulinette-tiles/templates/help.hbs`, width: 650, height: 700, resizable: true }).render(true)
    }
  }
  
  onDragStart(event) {
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")
    
    // invalid action
    if(!this.searchResults || idx < 0 || idx > this.searchResults.length) return
    
    const tile = this.searchResults[idx-1]
    const pack = this.assetsPacks[tile.pack]

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

      if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
        const tile = this.searchResults[idx-1]
        const pack = this.assetsPacks[tile.pack]
        const icons = await this.toggleFavorite(pack, tile)

        let html = ''
        icons.forEach( i => html += `<i class="info ${i}"></i>` )
        $(source).find(".fav").html(html)
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
  
  static getMacros(data) {
    const tileMode = game.settings.get("moulinette", "tileMode")
    let macros = game.settings.get("moulinette", "tileMacro")[tileMode]
    const results = []

    // add specific macros
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
    if(data.tile.search) {
      const today = new Date()
      const imageFileName = data.tile.filename
      const publisher = game.moulinette.applications.MoulinetteFileUtil.generatePathFromName(data.tile.search.src)
      const pack = `${today.getFullYear()}-${(today.getMonth() < 9 ? "0" : "") + (today.getMonth() + 1)}-${(today.getDate() < 10 ? "0" : "" ) + today.getDate()}`
      const path = `moulinette/images/${publisher}/${pack}`
      
      // download & upload image
      const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: data.tile.search.url }) }
      const res = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/search/download", headers)
      const blob = await res.blob()
      await game.moulinette.applications.MoulinetteFileUtil.uploadFile(new File([blob], imageFileName, { type: blob.type, lastModified: today }), imageFileName, path, false)
      data.img = game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + `${path}/${imageFileName}`
    }
    else if(!data.pack.isRemote) {
      const baseURL = data.pack.isLocal ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
      data.img =  data.tile.filename.match(/^https?:\/\//) ? data.tile.filename : baseURL + `${data.pack.path}/${data.tile.filename}`
    }
    else {
      await game.moulinette.applications.MoulinetteFileUtil.downloadAssetDependencies(data.tile, data.pack, "tiles")
      data.img = game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + game.moulinette.applications.MoulinetteFileUtil.getMoulinetteBasePath("tiles", data.pack.publisher, data.pack.name) + data.tile.filename      
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
      publisherFolder = await Folder.create({name: publisher, type: "JournalEntry", parent: moulinetteFolder._id })
    } else {
      publisherFolder = publisherFolder[0]
    }
    // pack level
    let packFolder = publisherFolder.children.filter( c => c.name == pack )
    if( packFolder.length == 0 ) {
      packFolder = await Folder.create({name: pack, type: "JournalEntry", parent: publisherFolder._id })
    } else {
      packFolder = packFolder[0]
    }
    return packFolder
  }
  
  /**
   * Generates an article from the dragged image
   */
  static async createArticle(data) {
    if ( !data.tile || !data.pack ) return;
    
    const folder = await MoulinetteTiles.getOrCreateArticleFolder(data.pack.publisher, data.pack.name)
    await MoulinetteTiles.downloadAsset(data)    
    
    // generate journal
    const name = data.img.split('/').pop()
    const entry = await JournalEntry.create( {name: name, img: data.img, folder: folder._id} )
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
    canvas.notes.activate()
    
    // Call macro
    const macros = MoulinetteTiles.getMacros(data)
    for(const macro of macros) {
      game.moulinette.param = [entry, note]
      console.log("EXECUTE MACRO")
      macro.execute()
      delete game.moulinette.param
    }
    
    note.sheet.render(true);
  }

  
  
  /**
   * Generate a tile from the dragged image
   */
  static async createTile(data) {
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

    if(canvas.activeLayer != layer) {
      layer.activate()
    } 
    
    // Call macro
    const macros = MoulinetteTiles.getMacros(data)
    for(const macro of macros) {
      game.moulinette.param = [tile]
      macro.execute()
      delete game.moulinette.param
    }
  }    
  
}
