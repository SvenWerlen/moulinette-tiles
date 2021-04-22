
export class MoulinetteMacros {

  static macros = [
{
  name: "Tiles | Template macro",
  img: "icons/svg/dice-target.svg",
  data: `
//
// Use this template as reference for Tiles macros
// 
// Instructions: 
// * import this macro
// * depending on your asset type, provide desired implemention
// * rename it to something simple (ex: MyMacro)
// * in the Tiles screen, enter that macro name. Moulinette will then execute this macro after creating the tile
//

// sanity check
if(Array.isArray(game.moulinette.param) && game.moulinette.param.length > 0) {
  const asset = game.moulinette.param[0]

  // handle actions per type of asset
  if(asset instanceof Tile) {
    console.log("Moulinette Macro for Tile", asset)
  }
  else if(asset instanceof Token) {
    console.log("Moulinette Macro for Token", asset)
  }
  else if(asset instanceof JournalEntry) {
    console.log("Moulinette Macro for JournalEntry", asset)
    console.log("Moulinette Macro for Note", game.moulinette.param[1])
  }
}
`},
{
  name: "Tiles | Add shadow",
  img: "icons/svg/dice-target.svg",
  data: `
//
// Adds a nice drop shadow around objects
// It requires Token Magic FX module
// 
// Instructions: 
// * import this macro
// * rename it to something simple (ex: Shadow)
// * in the Tiles screen, enter that macro name. Moulinette will then execute this macro after creating the tile
//

let params = [{
  filterType: "shadow",
  filterId: "myShadow",
  rotation: 35,
  blur: 2,
  quality: 5,
  distance: 10,
  alpha: 0.7,
  padding: 10,
  shadowOnly: false,
  color: 0x000000,
  zOrder: 6000,
  animated:
  {
      blur:     
      { 
        active: false, 
        loopDuration: 1, 
        animType: "syncCosOscillation", 
        val1: 2, 
        val2: 4
      },
      rotation:
      {
        active: false,
        loopDuration: 100,
        animType: "syncSinOscillation",
        val1: 33,
        val2: 37
      }
  }
}];


// sanity check
if(Array.isArray(game.moulinette.param) && game.moulinette.param.length > 0) {
  const asset = game.moulinette.param[0]
  if(asset instanceof Tile) {    
    TokenMagic.addUpdateFilters(asset, params);
  }
}
`},
]
}
