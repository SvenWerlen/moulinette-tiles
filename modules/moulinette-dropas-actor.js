export class MoulinetteDropAsActor extends FormApplication {
  
  constructor(data) {
    super()
    this.data = data;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-dropas",
      classes: ["mtte", "forge", "dasactor"],
      title: game.i18n.localize("mtte.dropasActor"),
      template: "modules/moulinette-tiles/templates/dropas-actor.hbs",
      width: 420,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    const actorId = game.settings.get("moulinette", "tileActorId");
    const actorLink = game.settings.get("moulinette", "tileActorLink");
    const actors = game.actors.map( a => { return { id: a.id, name: a.name, selected: a.id == actorId } })
    return { actors: actors, actorId: actorId, actorLink: actorLink }
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
    html.find(".actions button").click(this._onAction.bind(this))
  }
  
  _onAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    if(source.classList.contains("ok")) {
      const selActorId = this.html.find(".actors").children("option:selected").val()
      const linked = this.html.find("input[type='checkbox'][name='actorLink']").prop('checked')
      const selActor = game.actors.has(selActorId) ? game.actors.get(selActorId) : null
      this.createToken(selActor, linked)
      // keep preferences
      game.settings.set("moulinette", "tileActorId", selActorId);
      game.settings.set("moulinette", "tileActorLink", linked);
    }
    this.close()
  }
  
  async createToken(actor, linked) {
    // Download asset
    const cTiles = await import("./moulinette-tiles.js")
    await cTiles.MoulinetteTiles.downloadAsset(this.data)
    
    // Prepare the Token data
    let token;
    let td;
    // @COMPATIBILITY 0.7-0.8 (https://foundryvtt.wiki/en/migrations/foundry-core-0_8_x)
    // The biggest change is to Tokens, which now have a TokenDocument. The recommended way to create a token from an Actor is no longer Token.fromActor but instead passing the result from Actor#getTokenData to TokenDocument's constructor.
    if(game.data.version.startsWith("0.7")) {
      token = await Token.fromActor(actor, {x: this.data.x, y: this.data.y, actorLink: linked, img: this.data.img});
      td = token.data
    } else {
      token = await actor.getTokenData({x: this.data.x, y: this.data.y, actorLink: linked, img: this.data.img});
      td = token
    }

    // Adjust token position
    const hg = canvas.dimensions.size / 2;
    td.x -= td.width * hg;
    td.y -= td.height * hg;
    mergeObject(td, canvas.grid.getSnappedPosition(td.x, td.y)); // snap to grid
    if ( !canvas.grid.hitArea.contains(td.x, td.y) ) return false;

    // Submit the Token creation request and activate the Tokens layer (if not already active)
    let newToken;
    if(game.data.version.startsWith("0.7")) {
      newToken = await Token.create(td);
    } else {
      newToken = (await canvas.scene.createEmbeddedDocuments(Token.embeddedName, [td], { parent: canvas.scene }))[0]
      newToken = newToken._object
    }
    // sometimes throws exceptions
    try {
      canvas.getLayer("TokenLayer").activate()
    } catch(e) {}
    
    // Call macro
    const macros = cTiles.MoulinetteTiles.getMacros(actor)
    for(const macro of macros) {
      game.moulinette.param = [newToken]
      macro.execute()
      delete game.moulinette.param
    }
  }    
}
