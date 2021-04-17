
/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for game icons
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing(".", "moulinette");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette", "moulinette/tiles");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette/tiles", "moulinette/tiles/custom");
    
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
    
    console.log("Moulinette Tiles | Module loaded")
  }
});
