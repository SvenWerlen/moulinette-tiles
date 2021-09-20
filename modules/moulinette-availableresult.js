/*************************
 * Available result from Moulinette Cloud
 *************************/
export class MoulinetteAvailableResult extends FormApplication {
  
  constructor(creator, pack, asset) {
    super()
    this.creator = creator
    this.pack = pack
    this.asset = asset
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-availableresult",
      classes: ["mtte", "forge", "searchresult"],
      title: game.i18n.localize("mtte.availableresult"),
      template: "modules/moulinette-tiles/templates/availableresult.hbs",
      width: 620,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  async getData() {

    const client = new game.moulinette.applications.MoulinetteClient()
    const information = await client.get(`/asset/${this.creator}/${this.pack}`)

    return { 
      creator: this.creator, 
      creatorUrl: information.status == 200 ? information.data.publisherUrl : null,
      moulinetteUrl: "https://www.moulinette.cloud/getting-started/use-moulinette-to-access-creators-assets/",
      tiers: information.data.tiers,
      vanity: information.data.vanity,
      pack: this.pack,
      asset: this.asset, 
      url: `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/static/thumbs/${this.asset}`,
      assetName: this.asset.split("/").pop(),
      assetPath: this.asset.substring(0, this.asset.lastIndexOf("/"))
    }
  }
  
}
