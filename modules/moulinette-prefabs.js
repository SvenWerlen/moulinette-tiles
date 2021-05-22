import { MoulinetteTileResult } from "./moulinette-tileresult.js"

/**
 * Forge Module for tiles
 */
export class MoulinettePrefabs extends game.moulinette.applications.MoulinetteForgeModule {

  constructor() {
    super()
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id])
    
    // remove non-prefab
    this.assets = index.assets.filter(a => {
      if(!a.data || a.data["type"] !== "prefab") {
        index.packs[a.pack].count-- // decrease count in pack
        return false;
      }
      return true;
    })
    this.assetsPacks = index.packs
    return duplicate(this.assetsPacks)
  }
  
  /**
   * Generate a new asset (HTML) for the given result and idx
   */
  generateAsset(r, idx) {
    const pack = this.assetsPacks[r.pack]
    const URL = pack.isLocal || pack.isRemote ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    // sas (Shared access signature) for accessing remote files (Azure)
    r.sas = pack.isRemote && game.moulinette.user.sas ? "?" + game.moulinette.user.sas : ""
    r.baseURL = `${URL}${pack.path}/`
    
    return `<div class="tileres draggable" title="${r.data.name}" data-idx="${idx}"><img width="100" height="100" src="${r.baseURL + r.data.img + r.sas}"/></div>`
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack) {
    let assets = []
    this.pack = pack
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    searchTerms = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( pf => {
      // pack doesn't match selection
      if( pack >= 0 && pf.pack != pack ) return false
      // check if text match
      for( const f of searchTerms ) {
        if( pf.data.name.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    const viewMode = game.settings.get("moulinette", "displayMode")
    
    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      for(const r of this.searchResults) {
        idx++
        assets.push(this.generateAsset(r, idx))
      }
    }
    // view #2 (by folder)
    else {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        assets.push(`<div class="folder"><h2>${k}</h2></div>`)
        for(const a of folders[k]) {
          assets.push(this.generateAsset(a, a.idx))
        }
      }
    }
    
    return assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
  }
  
  onDragStart(event) {
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    
    // invalid action
    if(!this.searchResults || idx < 0 || idx > this.searchResults.length) return
    
    const prefab = this.searchResults[idx-1]
    const pack = this.assetsPacks[prefab.pack]

    let dragData = {
      type: "Actor",
      prefab: prefab,
      pack: pack
    };
    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }
  
  /**
   * Generate a prefab (ie actor)
   */
  static async createPrefab(data) {
    
    // Ensure the user has permission to drop the actor and create a Token
    if ( !game.user.can("TOKEN_CREATE") ) {
      return ui.notifications.warn(`You do not have permission to create new Tokens!`);
    }
    
    const prefab = data.prefab
    const pack = data.pack
      
    // Acquire dropped data and import the actor
    fetch(prefab.baseURL + prefab.filename + prefab.sas).catch(function(e) {
      ui.notifications.error(game.i18n.localize("mtte.errorDownload"));
      console.log("Moulinette Prefabs | Cannot download json data from prefab", e)
      return;
    }).then( async function(res) {
            
      // download all dependencies
      const paths = await game.moulinette.applications.MoulinetteFileUtil.downloadAssetDependencies(prefab, pack, "cloud")
      
      // replace all DEPS
      let jsonAsText = await res.text()
      for(let i = 0; i<paths.length; i++) {
        jsonAsText = jsonAsText.replace(new RegExp(`#DEP${ i == 0 ? "" : i-1 }#`, "g"), paths[i])
      }
      const actor = await Actor.create(JSON.parse(jsonAsText));
      
      // Prepare the Token data
      const token = await Token.fromActor(actor, {x: data.x, y: data.y});
      const td = token.data;
      
      // Adjust token position
      const hg = canvas.dimensions.size / 2;
      td.x -= td.width * hg;
      td.y -= td.height * hg;
      if ( !canvas.grid.hitArea.contains(td.x, td.y) ) return false;
              
      Token.create(td)
      canvas.getLayer("TokenLayer").activate()
    })
  }
    
  _onChooseMode(event) {
    const source = event.currentTarget;
    let mode = ["tile","article","actor"].includes(source.value) ? source.value : "tile"
    game.settings.set("moulinette", "tileMode", mode)
  }
  
  
}
