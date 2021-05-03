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
    const actors = game.actors.map( a => { return { id: a._id, name: a.name, selected: a._id == actorId } })
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
    // Prepare the Token data
    const token = await Token.fromActor(actor, {x: this.data.x, y: this.data.y, actorLink: linked, img: this.data.img});
    const td = token.data;

    // Adjust token position
    const hg = canvas.dimensions.size / 2;
    td.x -= td.width * hg;
    td.y -= td.height * hg;
    mergeObject(td, canvas.grid.getSnappedPosition(td.x, td.y)); // snap to grid
    if ( !canvas.grid.hitArea.contains(td.x, td.y) ) return false;

    // Submit the Token creation request and activate the Tokens layer (if not already active)
    const newToken = await Token.create(td);
    canvas.getLayer("TokenLayer").activate()
    
    // Call macro
    const macro = game.macros.find(o => o.name === game.settings.get("moulinette", "tileMacro"))
    if(macro) {
      game.moulinette.param = [newToken]
      macro.execute()
      delete game.moulinette.param
    } else {
      console.warn(`Moulinette Tiles | Macro ${game.settings.get("moulinette", "tileMacro")} couldn't be found!`)
    }
  }    
}
