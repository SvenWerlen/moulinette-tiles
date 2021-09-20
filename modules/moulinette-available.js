import { MoulinetteAvailableResult } from "./moulinette-availableresult.js"

/*************************************************
 * Available assets (from Moulinette Cloud)
 *************************************************/
export class MoulinetteAvailableAssets extends FormApplication {
  
  static MAX_ASSETS = 100
  static BASE_URL = "http://127.0.0.1:5000/static/thumbs/"
  
  constructor(assets) {
    super()

    this.assetInc = 0
    this.assetsData = assets
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-available",
      classes: ["mtte", "forge", "available"],
      title: game.i18n.localize("mtte.availableAssets"),
      template: "modules/moulinette-tiles/templates/available.hbs",
      width: 880,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
      resizable: true,
    });
  }
  
  async getData() {
    this.assets = []
    for(let p = 0; p < this.assetsData.length; p++) {
      const pub = this.assetsData[p]
      for(let a = 0; a < pub.matches.length; a++) {
        const asset = pub.matches[a]
        this.assets.push(`<div class="tileres" title="${a}" data-pidx="${p}" data-aidx="${a}"><img width="100" height="100" src="${MoulinetteAvailableAssets.BASE_URL}${asset}"/></div>`)
      }
    }

    // randomize results (avoid some publishers to always be listed first)
    this.assets.sort((a,b) => 0.5 - Math.random())

    return { assets: this.assets.slice(0, MoulinetteAvailableAssets.MAX_ASSETS) };
  }
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    this.html.find(".tileres").click(this._onShowTile.bind(this))

    // autoload on scroll
    html.find(".list").on('scroll', this._onScroll.bind(this))
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    // re-enable core listeners (for drag & drop)
    if(!game.data.version.startsWith("0.7")) {
      this._activateCoreListeners(this.html)
    }
  }
  
  _onShowTile(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const pubIdx = source.dataset.pidx;
    const assetIdx = source.dataset.aidx;

    if(pubIdx >=0 && pubIdx < this.assetsData.length) {
      const pub = this.assetsData[pubIdx]
      
      if(assetIdx >=0 && assetIdx < pub.matches.length) {
        const asset = pub.matches[assetIdx]
        new MoulinetteAvailableResult(pub.creator, pub.pack, asset).render(true)
      }
    }
  }

  /**
   * Scroll event
   */
  async _onScroll(event) {
    if(this.ignoreScroll) return;
    const bottom = $(event.currentTarget).prop("scrollHeight") - $(event.currentTarget).scrollTop()
    const height = $(event.currentTarget).height();
    if(!this.assets) return;
    if(bottom - 20 < height) {
      this.ignoreScroll = true // avoid multiple events to occur while scrolling
      if(this.assetInc * MoulinetteAvailableAssets.MAX_ASSETS < this.assets.length) {
        this.assetInc++
        this.html.find('.list').append(this.assets.slice(this.assetInc * MoulinetteAvailableAssets.MAX_ASSETS, (this.assetInc+1) * MoulinetteAvailableAssets.MAX_ASSETS))
        this._reEnableListeners()
      }
      this.ignoreScroll = false
    }
  }
  
}
