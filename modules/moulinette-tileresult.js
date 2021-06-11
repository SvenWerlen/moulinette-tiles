/*************************
 * Tile result
 *************************/
export class MoulinetteTileResult extends FormApplication {
  
  static DEFAULT_WEBM_PREVIEW = "icons/svg/video.svg" // don't forget to change it also in moulinette-tiles.js
  
  constructor(tile, pack, tab) {
    super()
    this.tab = tab
    this.tile = duplicate(tile);
    this.tile.pack = pack;
    this.pack = pack
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
    if(this.tile.assetURL.endsWith(".webm")) {
      this.tile.isVideo = true
    }
    return this.tile
  }
  
  async _updateObject(event) {
    event.preventDefault();
    if(event.submitter.className == "createTile") {
      ui.notifications.error(game.i18n.localize("mtte.errorCreateTile"));
      throw game.i18n.localize("mtte.errorCreateTile");
    } else if(event.submitter.className == "download") {
      // only download if remote
      if(this.pack.isRemote) {
        const data = { tile: this.tile, pack: this.pack }
        const cTiles = await import("../../moulinette-tiles/modules/moulinette-tiles.js")
        await cTiles.MoulinetteTiles.downloadAsset(data)
      }
    } else if(event.submitter.className == "clipboard") {
      // only copy to clipboard if local
      if(!this.pack.isRemote) {
        navigator.clipboard.writeText(this.tile.assetURL)
        .catch(err => {
          console.warn("Moulinette TileResult | Not able to copy path into clipboard")
        });
        ui.notifications.info(game.i18n.localize("mtte.clipboardImageSuccess"));
      }
    }
  }
  
  _onDragStart(event) {
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        tile: this.tile,
        pack: this.pack,
        tileSize: size
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        tile: this.tile,
        pack: this.pack
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        tile: this.tile,
        pack: this.pack
      };
    }    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
  }
  
}
