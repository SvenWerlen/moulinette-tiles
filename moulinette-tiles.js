
import { MoulinetteDropAsActor } from "./modules/moulinette-dropas-actor.js"
import { MoulinetteMacros } from "./modules/moulinette-macros.js"
import { MoulinetteTilesFavorites } from "./modules/moulinette-tiles-favorites.js"
import { MoulinetteSearch } from "./modules/moulinette-search.js"


Hooks.once("init", async function () {
  console.log("Moulinette Tiles | Init") 
  game.settings.register("moulinette", "tileMode", { scope: "world", config: false, type: String, default: "tile" })
  game.settings.register("moulinette", "tileSize", { scope: "world", config: false, type: Number, default: 100 })
  game.settings.register("moulinette", "tileMacro", { scope: "world", config: false, type: Object, default: {} })  // old implementation
  game.settings.register("moulinette", "tileMacros", { scope: "world", config: false, type: Object, default: {} }) // new implementation
  game.settings.register("moulinette", "tileActorId", { scope: "world", config: false, type: String })
  game.settings.register("moulinette", "tileActorLink", { scope: "world", config: false, type: Boolean, default: true })
  game.settings.register("moulinette", "tileActorType", { scope: "world", config: false, type: String })
  game.settings.register("moulinette", "searchPrefs", { scope: "world", config: false, type: Object, default: {} })
  
  game.settings.register("moulinette-tiles", "tileShowVideoThumb", {
    name: game.i18n.localize("mtte.configShowVideoThumb"), 
    hint: game.i18n.localize("mtte.configShowVideoThumbHint"), 
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
})

/**
 * Ready: define new moulinette forge module
 */
Hooks.once("setup", async function () {
  const moduleClassTiles = (await import("./modules/moulinette-tiles.js")).MoulinetteTiles
  game.moulinette.forge.push({
    id: "tiles",
    icon: "fas fa-puzzle-piece",
    name: game.i18n.localize("mtte.tiles"),
    description: game.i18n.localize("mtte.tilesDescription"),
    instance: new moduleClassTiles(),
    actions: [
      {id: "indexImages", icon: "fas fa-sync" ,name: game.i18n.localize("mtte.indexImages"), help: game.i18n.localize("mtte.indexImagesToolTip") },
      {id: "listPacks", icon: "fas fa-info-circle" ,name: game.i18n.localize("mtte.listAvailablePacks"), help: game.i18n.localize("mtte.listAvailablePacksToolTip") },
      {id: "customReferences", icon: "fas fa-plus-square" ,name: game.i18n.localize("mtte.customReferences"), help: game.i18n.localize("mtte.customReferencesToolTip") },
      {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
    ]
  })
  
  const moduleClassPrefabs = (await import("./modules/moulinette-prefabs.js")).MoulinettePrefabs
  game.moulinette.forge.push({
    id: "prefabs",
    icon: "fab fa-buffer",
    name: game.i18n.localize("mtte.prefabs"),
    description: game.i18n.localize("mtte.prefabsDescription"),
    instance: new moduleClassPrefabs(),
    actions: []
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
    await game.moulinette.applications.MoulinetteFileUtil.createFolderRecursive("moulinette/tiles/custom");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderRecursive("moulinette/images/custom");
    game.moulinette.applications["MoulinetteTilesFavorites"] = MoulinetteTilesFavorites
    game.moulinette.applications["MoulinetteSearch"] = MoulinetteSearch
    console.log("Moulinette Tiles | Module loaded")
  }

  const choices = { "": game.i18n.localize("mtte.configMacroCompendiumNone") }
  const macroCompendiums = game.packs.filter(p => p.documentName == "Macro")
  for(const p of macroCompendiums) {
    choices[`${p.metadata.package}.${p.metadata.name}`] = p.metadata.label
  }

  game.settings.register("moulinette-tiles", "macroCompendium", {
    name: game.i18n.localize("mtte.configMacroCompendiumTiles"),
    hint: game.i18n.localize("mtte.configMacroCompendiumTilesHint"),
    scope: "world",
    config: true,
    default: "default",
    choices: choices,
    type: String
  });
});

/**
 * Manage canvas drop
 */
Hooks.on('dropCanvasData', (canvas, data) => {
  if(data.source == "mtte") {

    // push into history
    if(data.type == "tile") {
      game.moulinette.forge.find( f => f.id == "tiles" ).instance.addToHistory( data.pack, data.tile )
    }

    if(data.pack && data.pack.isRemote) {
      ui.notifications.info(game.i18n.localize("mtte.downloadInProgress"));
    }
    if(data.type == "JournalEntry") {
      import("./modules/moulinette-tiles.js").then( c => {
        c.MoulinetteTiles.createArticle(data)
      })
      return false;
    }
    else if(data.type == "Actor" && !data.prefab) {
      new MoulinetteDropAsActor(data).render(true)
      return false;
    }
    else if(data.type == "Actor" && data.prefab) {
      console.log("Moulinette | The error below 'cannot read properties' is expected. Just ignore it ;-)")
      import("./modules/moulinette-prefabs.js").then( c => {
        c.MoulinettePrefabs.createPrefab(data)
      })
      return true
    }
    else if(data.type == "Tile") {
      import("./modules/moulinette-tiles.js").then( c => {
        c.MoulinetteTiles.createTile(data)
      })
      return false;
    }
  }
});


