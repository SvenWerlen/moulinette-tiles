import { MoulinetteTileResult } from "./moulinette-tileresult.js"

/**
 * Forge Module for tiles
 */
export class MoulinettePrefabs extends game.moulinette.applications.MoulinetteForgeModule {

  constructor() {
    super()
  }
  
  clearCache() {
    this.assets = null
    this.assetsPacks = null
    this.searchResults = null
    this.pack = null
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    if(this.assetsPacks) {
      return duplicate(this.assetsPacks)
    }
    
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
    r.sas = pack.sas ? "?" + pack.sas : ""
    r.baseURL = `${URL}${pack.path}/`
    
    return `<div class="tileres draggable" title="${r.data.name}" data-idx="${idx}" data-path="${r.filename}"><img width="100" height="100" src="${r.baseURL + r.data.img + r.sas}"/></div>`
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack, publisher) {
    let assets = []
    this.pack = pack
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!publisher || publisher.length == 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    searchTerms = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( pf => {
      // pack doesn't match selection
      if( pack >= 0 && pf.pack != pack ) return false
      // publisher doesn't match selection
      if( publisher && publisher != this.assetsPacks[pf.pack].publisher ) return false
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
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-path="${k}"><h2 class="expand">${k} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-path="${k}"><h2>${k} (${folders[k].length})</div>`)
        }
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
   * Generates moulinette folders
   */
  static async getOrCreateActorFolder(publisher, pack) {
    let moulinetteFolder = game.folders.filter( f => f.name == "Moulinette" && f.type == "Actor" )

    // main
    if( moulinetteFolder.length == 0 ) {
      moulinetteFolder = await Folder.create({name:"Moulinette", type:"Actor", parent: null})
    } else {
      moulinetteFolder = moulinetteFolder[0]
    }
    // publisher level
    let publisherFolder = moulinetteFolder.children.filter( c => c.name == publisher )
    if( publisherFolder.length == 0 ) {
      publisherFolder = await Folder.create({name: publisher, type: "Actor", parent: moulinetteFolder._id })
    } else {
      publisherFolder = publisherFolder[0]
    }
    // pack level
    let packFolder = publisherFolder.children.filter( c => c.name == pack )
    if( packFolder.length == 0 ) {
      packFolder = await Folder.create({name: pack, type: "Actor", parent: publisherFolder._id })
    } else {
      packFolder = packFolder[0]
    }
    return packFolder
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
      
      // Create actor
      const actorData = JSON.parse(jsonAsText)
      actorData.folder = await MoulinettePrefabs.getOrCreateActorFolder(pack.publisher, pack.name)
      const actor = await getDocumentClass("Actor").create(actorData);
      
      // Prepare the Token data
      let tokenData
      if(game.data.version.startsWith("0.7")) {
        const token = await Token.fromActor(actor, {x: data.x, y: data.y});
        tokenData = token.data
      } else {
        tokenData = await actor.getTokenData({x: data.x, y: data.y})
      }
      
      // Adjust token position
      const hg = canvas.dimensions.size / 2;
      tokenData.x -= tokenData.width * hg;
      tokenData.y -= tokenData.height * hg;
      if ( !canvas.grid.hitArea.contains(tokenData.x, tokenData.y) ) return false;
              
      Token.create(tokenData)
      canvas.getLayer("TokenLayer").activate()
    })
  }
    
  _onChooseMode(event) {
    const source = event.currentTarget;
    let mode = ["tile","article","actor"].includes(source.value) ? source.value : "tile"
    game.settings.set("moulinette", "tileMode", mode)
  }
  
  
}
