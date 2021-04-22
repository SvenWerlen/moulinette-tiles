
import { MoulinetteDropAsActor } from "./modules/moulinette-dropas-actor.js"
import { MoulinetteMacros } from "./modules/moulinette-macros.js"


Hooks.once("init", async function () {
  console.log("Moulinette Tiles | Init") 
  game.settings.register("moulinette", "tileMode", { scope: "world", config: false, type: String, default: "tile" })
  game.settings.register("moulinette", "tileSize", { scope: "world", config: false, type: Number, default: 100 })
  game.settings.register("moulinette", "tileMacro", { scope: "world", config: false, type: Object, default: {} })
  game.settings.register("moulinette", "tileActorId", { scope: "world", config: false, type: String })
  game.settings.register("moulinette", "tileActorLink", { scope: "world", config: false, type: Boolean, default: true })
})

/**
 * Ready: define new moulinette forge module
 */
Hooks.once("setup", async function () {
  const moduleClass = (await import("./modules/moulinette-tiles.js")).MoulinetteTiles
  game.moulinette.forge.push({
    id: "tiles",
    icon: "fas fa-puzzle-piece",
    name: game.i18n.localize("mtte.tiles"),
    description: game.i18n.localize("mtte.tilesDescription"),
    instance: new moduleClass(),
    actions: [
      {id: "indexImages", icon: "fas fa-sync" ,name: game.i18n.localize("mtte.indexImages"), help: game.i18n.localize("mtte.indexImagesToolTip") },
      {id: "listPacks", icon: "fas fa-info-circle" ,name: game.i18n.localize("mtte.listAvailablePacks"), help: game.i18n.localize("mtte.listAvailablePacksToolTip") },
      {id: "customReferences", icon: "fas fa-plus-square" ,name: game.i18n.localize("mtte.customReferences"), help: game.i18n.localize("mtte.customReferencesToolTip") },
      {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
    ]
  })
  
  game.moulinette.applications["MoulinetteDropAsActor"] = MoulinetteDropAsActor
  Array.prototype.push.apply(game.moulinette.macros, MoulinetteMacros.macros)
});


/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for game icons
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing(".", "moulinette");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette", "moulinette/tiles");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette/tiles", "moulinette/tiles/custom");
    console.log("Moulinette Tiles | Module loaded")
  }
});

/**
 * Manage canvas dr
 */
Hooks.on('dropCanvasData', (canvas, data) => { 
  if(data.source == "mtte") {
    if(data.type == "JournalEntry") {
      import("./modules/moulinette-tiles.js").then( c => {
        c.MoulinetteTiles.createArticle(data)
      })
      return false;
    }
    else if(data.type == "Actor") {
      new MoulinetteDropAsActor(data).render(true)
      return false;
    }
    else if(data.type == "Tile") {
      import("./modules/moulinette-tiles.js").then( c => {
        c.MoulinetteTiles.createTile(data)
      })
      return false;
    }
  }
});


