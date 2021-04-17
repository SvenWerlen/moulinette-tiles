/*************************
 * Tile result
 *************************/
export class MoulinetteTileResult extends FormApplication {
  
  constructor(tile, pack, tab) {
    super()
    this.tab = tab
    this.data = tile;
    this.data.pack = pack;
    
    if(pack.isRemote) {
      this.imageName = this.data.filename.split('/').pop()
      this.folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
      this.filePath = `moulinette/tiles/${this.folderName}/${this.imageName}`
    } else {
      this.filePath = `${pack.path}${tile.filename}`
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
  
  getData() {
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
      navigator.clipboard.writeText(this.data.assetURL)
      .catch(err => {
        console.warn("Moulinette TileResult | Not able to copy path into clipboard")
      });
      ui.notifications.info(game.i18n.localize("mtte.clipboardImageSuccess"));
    }
  }
  
  _onDragStart(event) {
    const div = event.currentTarget;

    // Set drag data
    const dragData = {
      type: "Tile",
      img: this.filePath,
      tileSize: 100
    };
    
    // Create the drag preview for the image
    const img = div.querySelector("img")
    const w = img.naturalWidth * canvas.stage.scale.x;
    const h = img.naturalHeight * canvas.stage.scale.y;
    const preview = DragDrop.createDragImage(img, w, h);
    
    //event.dataTransfer.setDragImage(preview, w/2, h/2);
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    
    if(this.data.pack.isRemote) {
      this._downloadFile()
    }
  }

  async _downloadFile() {
    // download & upload image
    const res = await fetch(this.data.assetURL).catch(function(e) {
      ui.notifications.error(game.i18n.localize("mtte.errorDownload"));
      console.log(`Moulinette TileResult | Cannot download image ${this.data.filename}`, e)
      return false;
    });

    const blob = await res.blob()
    await game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], this.imageName, { type: blob.type, lastModified: new Date() }), this.imageName, "moulinette/tiles", `moulinette/tiles/${this.folderName}`, false)
    
    // copy path into clipboard
    navigator.clipboard.writeText(`moulinette/tiles/${this.folderName}/${this.imageName}`)
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
    html.find(".thumb").css('background', `url(${this.data.assetURL}) 50% 50% no-repeat`)
  }
  
}
