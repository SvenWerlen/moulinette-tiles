/*************************
 * Tile result
 *************************/
export class MoulinetteTileResult extends FormApplication {
  
  static DEFAULT_WEBM_PREVIEW = "icons/svg/video.svg" // don't forget to change it also in moulinette-tiles.js
  
  constructor(tile, pack, tab) {
    super()
    this.tab = tab
    this.data = duplicate(tile);
    this.data.pack = pack;
    
    if(pack.isRemote) {
      this.imageName = this.data.filename.split('/').pop()
      this.folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
      this.filePath =  game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + `moulinette/tiles/${this.folderName}/${this.imageName}`
      this.data.sas = game.moulinette.user.sas ? "?" + game.moulinette.user.sas : ""
    } else {
      const baseURL = pack.isLocal ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
      this.imageName = tile.filename.split('/').pop()
      this.filePath = baseURL + `${pack.path}/${tile.filename}`
      this.data.sas = ""
    }
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-tileresult",
      classes: ["mtte", "forge", "searchresult"],
      title: game.i18n.localize("mtte.tileresult"),
      template: "modules/moulinette-tiles/templates/tileresult.hbs",
      width: 420,
      height: "auto",
      dragDrop: [{dragSelector: ".tileres"}],
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  async getData() {
    // support for webm
    if(this.data.assetURL.endsWith(".webm")) {
      this.data.isVideo = true
    }
    return this.data
  }
  
  _updateObject(event) {
    event.preventDefault();
    if(event.submitter.className == "createTile") {
      ui.notifications.error(game.i18n.localize("mtte.errorCreateTile"));
      throw game.i18n.localize("mtte.errorCreateTile");
    } else if(event.submitter.className == "download") {
      this._downloadFile();
    } else if(event.submitter.className == "clipboard") {
      navigator.clipboard.writeText(this.filePath)
      .catch(err => {
        console.warn("Moulinette TileResult | Not able to copy path into clipboard")
      });
      ui.notifications.info(game.i18n.localize("mtte.clipboardImageSuccess"));
    }
  }
  
  _onDragStart(event) {
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    if(this.data.pack.isRemote) {
      this._downloadFile()
    }
    
    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        img: this.filePath,
        tileSize: size
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        name: this.imageName,
        img: this.filePath
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        img: this.filePath
      };
    }    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _downloadFile() {
    // download & upload image
    const res = await fetch(this.data.assetURL + this.data.sas).catch(function(e) {
      ui.notifications.error(game.i18n.localize("mtte.errorDownload"));
      console.log(`Moulinette TileResult | Cannot download image ${this.data.filename}`, e)
      return false;
    });

    const blob = await res.blob()
    await game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], this.imageName, { type: blob.type, lastModified: new Date() }), this.imageName, "moulinette/tiles", `moulinette/tiles/${this.folderName}`, false)
    
    // copy path into clipboard
    navigator.clipboard.writeText(game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + `moulinette/tiles/${this.folderName}/${this.imageName}`)
    .catch(err => {
      console.warn("Moulinette TileResult | Not able to copy path into clipboard")
    });
    
    ui.notifications.info(game.i18n.localize("mtte.downloadImageSuccess"));
    return true
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
  }
  
}
