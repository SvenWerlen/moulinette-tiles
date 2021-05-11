import { MoulinetteTileResult } from "./moulinette-tileresult.js"

/**
 * Forge Module for tiles
 */
export class MoulinetteTiles extends game.moulinette.applications.MoulinetteForgeModule {

  static FOLDER_CUSTOM_IMAGES = "moulinette/images/custom"
  static FOLDER_CUSTOM_TILES  = "moulinette/tiles/custom"
  
  constructor() {
    super()
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + user.id,
      game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/images/custom/index.json",
      game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/tiles/custom/index.json"])
    
    // remove thumbnails from assets
    const webmList = index.assets.filter(i => i.filename.endsWith(".webm"))
    const thumbList = webmList.map(i => i.filename.substr(0, i.filename.lastIndexOf('.') + 1) + "webp")
    this.assets = index.assets.filter(a => {
      if(thumbList.includes(a.filename)) {
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
    const URL = game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    // sas (Shared access signature) for accessing remote files (Azure)
    r.sas = this.assetsPacks[r.pack].isRemote && game.moulinette.user.sas ? "?" + game.moulinette.user.sas : ""
    r.assetURL = r.filename.match(/^https?:\/\//) ? r.filename : `${URL}${this.assetsPacks[r.pack].path}/${r.filename}`
    if(r.filename.endsWith(".webm")) {
      const thumbnailURL = r.assetURL.substr(0, r.assetURL.lastIndexOf('.') + 1) + "webp"
      return `<div class="tileres video draggable fallback" title="${r.filename}" data-idx="${idx}">` +
        `<img width="100" class="cc_image" height="100" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="background-image: url(${thumbnailURL})"/>` +
        `<video width="100" height="100" autoplay loop muted><source src="" data-src="${r.assetURL}${r.sas}" type="video/webm"></video></div>`
    } else {
      return `<div class="tileres draggable" title="${r.filename}" data-idx="${idx}"><img width="100" height="100" src="${r.assetURL + r.sas}"/></div>`
    }
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack) {
    let assets = []
    this.pack = pack
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    searchTerms = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( t => {
      // pack doesn't match selection
      if( pack >= 0 && t.pack != pack ) return false
      // check if text match
      for( const f of searchTerms ) {
        if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    const viewMode = 2
    
    // view #1 (all mixed)
    if(viewMode == 1) {
      let idx = 0
      for(const r of this.searchResults) {
        idx++
        assets.push(this.generateAsset(r, idx))
      }
    }
    // view #2 (by folder)
    else {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        assets.push(`<div class="folder"><h2>${k}</h2></div>`)
        for(const a of folders[k]) {
          assets.push(this.generateAsset(a, a.idx))
        }
      }
    }
    
    return assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    // when click on tile
    this.html.find(".tileres").click(this._onShowTile.bind(this))
    
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
    
    // display hide show showCase
    if(this.pack >= 0 && this.assetsPacks[this.pack].isShowCase) {
      const pack = this.assetsPacks[this.pack]
      const showCase = this.html.find(".showcase")
      showCase.find(".link").text(pack.publisher)
      showCase.find(".link").attr('href', pack.pubWebsite)
      this.html.find(".showcase").show()
    } else {
      this.html.find(".showcase").hide()
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
    const macro = MoulinetteTiles.getMacroName()
    return `<div class="showcase">${game.i18n.localize("mtte.showCase")}</div>
      <div class="options"><div class="option">
      ${game.i18n.localize("mtte.dropmode")} <i class="fas fa-question-circle" title="${game.i18n.localize("mtte.dropmodeToolTip")}"></i> 
        <input class="dropmode" type="radio" name="mode" value="tile" ${mode == "tile" ? "checked" : ""}> ${game.i18n.localize("mtte.tile")}
        <input class="dropmode" type="radio" name="mode" value="article" ${mode == "article" ? "checked" : ""}> ${game.i18n.localize("mtte.article")}
        <input class="dropmode" type="radio" name="mode" value="actor" ${mode == "actor" ? "checked" : ""}> ${game.i18n.localize("mtte.actor")}
      </div>
      <div class="option">
        ${game.i18n.localize("FILES.TileSize")} <i class="fas fa-question-circle" title="${game.i18n.localize("FILES.TileSizeHint")}"></i> 
        <input class="tilesize" type="text" name="tilesize" value="${size}" maxlength="4">
      </div>
      <div class="option">
        ${game.i18n.localize("mtte.runMacro")} <i class="fas fa-question-circle" title="${game.i18n.localize("mtte.runMacroToolTip")}"></i> 
        <input class="macro" type="text" name="macro" value="${macro}">
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
      await FileUtil.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "moulinette/tiles", MoulinetteTiles.FOLDER_CUSTOM_TILES, true)
      // scan images
      publishers = await FileUtil.scanAssets(MoulinetteTiles.FOLDER_CUSTOM_IMAGES, EXT)
      if(customPath) {
        publishers.push(...await FileUtil.scanAssetsInCustomFolders(customPath, EXT))
      }
      publishers.push(...await FileUtil.scanSourceAssets("images", EXT))
      await FileUtil.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "moulinette/images", MoulinetteTiles.FOLDER_CUSTOM_IMAGES, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
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

    let filePath;
    let imageName;
    
    if(!pack.isRemote) {
      imageName = tile.filename.split('/').pop()
      filePath =  tile.filename.match(/^https?:\/\//) ? tile.filename : game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + `${pack.path}/${tile.filename}`
    }
    else {
      const folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
      imageName = tile.filename.split('/').pop()
      filePath = game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + `moulinette/tiles/${folderName}/${imageName}`

      // download & upload image
      fetch(tile.assetURL + tile.sas).catch(function(e) {
        ui.notifications.error(game.i18n.localize("mtte.errorDownload"));
        console.log(`Moulinette Tiles | Cannot download image ${imageName}`, e)
        return;
      }).then( res => {
        res.blob().then( blob => game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], imageName, { type: blob.type, lastModified: new Date() }), imageName, "moulinette/tiles", `moulinette/tiles/${folderName}`, false) )
      });
    }
    
    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        img: filePath,
        tileSize: size
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        name: imageName,
        img: filePath
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        img: filePath
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
  
  static getMacroName() {
    const tileMode = game.settings.get("moulinette", "tileMode")
    return game.settings.get("moulinette", "tileMacro")[tileMode]
  }
  
  /**
   * Generate an article from the dragged image
   */
  static async createArticle(data) {
    // generate journal
    const entry = await JournalEntry.create( {name: data.name, img: data.img} )
    const coord = canvas.grid.getSnappedPosition(data.x - canvas.grid.w/2, data.y - canvas.grid.h/2)
    
    // Default Note data
    const noteData = {
      entryId: entry._id,
      x: coord.x + canvas.grid.w/2,
      y: coord.y + canvas.grid.h/2,
      icon: CONST.DEFAULT_NOTE_ICON,
      iconSize: 40,
      textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
      fontSize: 48,
      fontFamily: CONFIG.defaultFontFamily
    };

    // Create a NoteConfig sheet instance to finalize the creation
    const note = canvas.notes.preview.addChild(new Note(noteData));
    canvas.getLayer("NotesLayer").activate()
    
    // Call macro
    const macroName = MoulinetteTiles.getMacroName()
    const macro = game.macros.find(o => o.name === macroName)
    if(macro) {
      game.moulinette.param = [entry, note]
      macro.execute()
      delete game.moulinette.param
    } else {
      console.warn(`Moulinette Tiles | Macro ${macroName} couldn't be found!`)
    }
    
    await note.draw();
    note.sheet.render(true);
  }
  
  /**
   * Generate a tile from the dragged image
   */
  static async createTile(data) {
    if ( !data.img ) return;

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

    // make sure to always put tiles on top
    let maxZ = 0
    canvas.tiles.placeables.forEach( t => { 
      if(t.zIndex > maxZ) maxZ = t.zIndex
    })
    data.z = maxZ
    
    // Create the Tile
    const tile = await canvas.tiles.constructor.placeableClass.create(data);
    canvas.getLayer("TilesLayer").activate()
    
    // Call macro
    const macroName = MoulinetteTiles.getMacroName()
    const macro = game.macros.find(o => o.name === macroName)
    if(macro) {
      game.moulinette.param = [tile]
      macro.execute()
      delete game.moulinette.param
    } else {
      console.warn(`Moulinette Tiles | Macro ${macroName} couldn't be found!`)
    }
  }    
  
}
