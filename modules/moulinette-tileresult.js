import { MoulinetteSearchUtils } from "./moulinette-searchUtils.js"

/*************************
 * Tile result
 *************************/
export class MoulinetteTileResult extends FormApplication {
  
  static DEFAULT_WEBM_PREVIEW = "icons/svg/video.svg" // don't forget to change it also in moulinette-tiles.js
  
  constructor(tile, pack, isV2 = false) {
    super()
    this.tile = duplicate(tile);
    this.tile.pack = pack;
    this.pack = pack
    this.isCloud = pack.isRemote && !pack.path.startsWith("https://mttestorage.blob.core.windows.net/user")
    this.isV2 = isV2
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-tileresult",
      classes: ["mtte", "forge", "searchresult"],
      title: game.i18n.localize("mtte.tileresult"),
      template: "modules/moulinette-tiles/templates/tileresult.hbs",
      width: 820,
      height: "auto",
      dragDrop: [{dragSelector: ".tileres"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    // support for webm
    if(this.tile.assetURL.endsWith(".webm")) {
      this.tile.isVideo = true
    }

    const cloudEnabled = game.settings.get("moulinette-core", "enableMoulinetteCloud")
    return {
      tile: this.tile,
      cloudEnabled: cloudEnabled,
      user: game.moulinette.user
    }
  }
  
  /*
   * Generates moulinette folders
   */
  static async getOrCreateSceneFolder(publisher, pack) {
    let moulinetteFolder = game.folders.filter( f => f.name == "Moulinette" && f.type == "Scene" )

    // main
    if( moulinetteFolder.length == 0 ) {
      moulinetteFolder = await Folder.create({name:"Moulinette", type:"Scene", parent: null})
    } else {
      moulinetteFolder = moulinetteFolder[0]
    }
    // publisher level
    let publisherFolder = moulinetteFolder.children ? moulinetteFolder.children.filter( c => c.folder.name == publisher ) : []
    if( publisherFolder.length == 0 ) {
      publisherFolder = await Folder.create({name: publisher, type: "Scene", parent: moulinetteFolder.id })
    } else {
      publisherFolder = publisherFolder[0].folder
    }
    // pack level
    let packFolder = publisherFolder.children ? publisherFolder.children.filter( c => c.folder.name == pack ) : []
    if( packFolder.length == 0 ) {
      packFolder = await Folder.create({name: pack, type: "Scene", parent: publisherFolder.id })
    } else {
      packFolder = packFolder[0].folder
    }
    return packFolder
  }
  
  async _updateObject(event) {
    event.preventDefault();
    if(event.submitter.className == "createTile") {
      ui.notifications.error(game.i18n.localize("mtte.errorCreateTile"));
    } else if(event.submitter.className == "download") {
      // only download if remote
      if(this.pack.isRemote) {
        const data = { tile: this.tile, pack: this.pack }
        const cTiles = await import("../../moulinette-tiles/modules/moulinette-tiles.js")
        await cTiles.MoulinetteTiles.downloadAsset(data)
        
        // put path into clipboard
        if(navigator.clipboard) {
          navigator.clipboard.writeText(data.img)
          .catch(err => {
            console.warn("Moulinette TileResult | Not able to copy path into clipboard")
          });
          ui.notifications.info(game.i18n.localize("mtte.clipboardImageSuccess"));
          this.close()
        } else {
          ui.notifications.warn(game.i18n.localize("mtte.clipboardUnsupported"));
        }
      }
    } else if(event.submitter.className == "clipboard") {
      // only copy to clipboard if local
      if(!this.pack.isRemote) {
        if(navigator.clipboard) {
          navigator.clipboard.writeText(this.tile.assetURL)
          .catch(err => {
            console.warn("Moulinette TileResult | Not able to copy path into clipboard")
          });
          ui.notifications.info(game.i18n.localize("mtte.clipboardImageSuccess"));
        } else {
          ui.notifications.warn(game.i18n.localize("mtte.clipboardUnsupported"));
        }
      }
    } else if(event.submitter.className == "createScene") {
      const img = document.getElementById("previewImage") 
      // download if remote
      const data = { tile: this.tile, pack: this.pack }
      if(this.pack.isRemote) {
        const cTiles = await import("../../moulinette-tiles/modules/moulinette-tiles.js")
        await cTiles.MoulinetteTiles.downloadAsset(data)
      } else {
        data.img = this.tile.assetURL
      }
      ui.scenes.activate() // give focus to scenes
      try {
        let jsonAsText;
        if(img) {
          jsonAsText = JSON.stringify({
            "name": game.moulinette.applications.Moulinette.prettyText(data.img.split("/").pop()),
            "navigation": false,
            "width": img.naturalWidth,
            "height": img.naturalHeight,
            "img": `${data.img}`
          })
        } else {
          console.error("Moulinette Tiles Result | HTML Image not found")
          return;
        }

        // adapt scene and create
        const sceneData = JSON.parse(jsonAsText)
        
        // configure dimensions if no width/height set
        if( !("width" in sceneData)) {
          sceneData.width = img.naturalWidth
          sceneData.height = img.naturalHeight
        }
        
        sceneData.folder = await MoulinetteTileResult.getOrCreateSceneFolder(this.pack.publisher, this.pack.name)
        let newScene = await Scene.create(sceneData);
        let tData = await newScene.createThumbnail()
        await newScene.update({thumb: tData.thumb}); // force generating the thumbnail
        
        ui.notifications.info(game.i18n.localize("mtte.forgingSuccess"), 'success')
        this.close()
      } catch(e) {
        console.log(`Moulinette | Unhandled exception`, e)
        ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error')
      }      
    } else if(event.submitter.className == "createArticle") {
      const img = document.getElementById("previewImage")
      // download if remote
      const cTiles = await import("../../moulinette-tiles/modules/moulinette-tiles.js")
      const data = { tile: this.tile, pack: this.pack }
      if(this.pack.isRemote) {
        await cTiles.MoulinetteTiles.downloadAsset(data)
      } else {
        data.img = this.tile.assetURL
      }
      // create folder (where to store the journal article)
      const folder = await cTiles.MoulinetteTiles.getOrCreateArticleFolder(this.pack.publisher, this.pack.name)
      // generate journal
      const name = data.img.split('/').pop()
      const entry = await game.moulinette.applications.Moulinette.generateArticle(name, data.img, folder.id)
      return entry.sheet.render(true)
    }
  }
  
  _onDragStart(event) {
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    let dragData = { tile: this.tile, pack: this.pack, source: this.isV2 ? "mtteSearch" : "mtte" }
    if(mode == "tile") {
      dragData.type = "Tile"
      dragData.tileSize = size
    } else if(mode == "article") {
      dragData.type = "JournalEntry"
    } else if(mode == "actor") {
      dragData.type = "Actor"
    }

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
    
    html.find('#previewImage').on("load", function() {  
      html.find('.imageSizes').text(`${this.naturalWidth} x ${this.naturalHeight}`)
    });
  }
  
}
