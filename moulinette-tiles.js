
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

  game.keybindings.register("moulinette-core", "searchKey", {
    name: game.i18n.localize("mtte.configSearchKey"),
    hint: game.i18n.localize("mtte.configSearchKeyHint"),
    editable: [],
    onDown: () => {
      if(game.moulinette.applications.MoulinetteSearch) {
        (new game.moulinette.applications.MoulinetteSearch()).render(true)
      } else {
        console.warn("Moulinette Tiles not enabled (or not up-to-date?)")
      }
    },
    onUp: () => {},
    restricted: true,  // Restrict this Keybinding to gamemaster only?
    reservedModifiers: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  })
})

/**
 * Ready: define new moulinette forge module
 */
Hooks.once("setup", async function () {
  const moduleClassTiles = (await import("./modules/moulinette-tiles.js")).MoulinetteTiles
  game.moulinette.forge.push({
    id: "tiles",
    layer: "tiles",
    icon: "fas fa-puzzle-piece",
    name: game.i18n.localize("mtte.tiles"),
    description: game.i18n.localize("mtte.tilesDescription"),
    instance: new moduleClassTiles(),
    actions: [
      {id: "indexImages", icon: "fas fa-sync" ,name: game.i18n.localize("mtte.indexImages"), help: game.i18n.localize("mtte.indexImagesToolTip") },
      {id: "configureSources", icon: "fas fa-cogs" ,name: game.i18n.localize("mtte.configureSources"), help: game.i18n.localize("mtte.configureSourcesToolTip") },
      //{id: "customReferences", icon: "fas fa-plus-square" ,name: game.i18n.localize("mtte.customReferences"), help: game.i18n.localize("mtte.customReferencesToolTip") },
      {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
    ],
    shortcuts: [{
      id: "favorites",
      name: game.i18n.localize("mtte.favorites"),
      icon: "fas fa-heart"
    }, {
      id: "search",
      name: game.i18n.localize("mtte.moulinetteSearch"),
      icon: "fas fa-search-plus"
    }]
  })
  
  const moduleClassPrefabs = (await import("./modules/moulinette-prefabs.js")).MoulinettePrefabs
  game.moulinette.forge.push({
    id: "prefabs",
    layer: "token",
    icon: "fas fa-users",
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
  if(data.source == "mtte" || data.source == "mtteSearch") {

    // push into history
    if(data.type == "Tile") {
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


