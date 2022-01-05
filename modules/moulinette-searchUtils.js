/**
 * Utility function (Elastic Search)
 */
export class MoulinetteSearchUtils {

  static CACHE = false
  static KEY_CATEGORY = "imageCategories"

  /**
   * Returns the list of categories (from cache / server)
   */
  static async getCategories() {
    let categories = null

    // retrieve categories
    if(MoulinetteSearchUtils.cache && game.moulinette.cache.hasData(MoulinetteSearchUtils.KEY_CATEGORY)) {
      categories = game.moulinette.cache.getData(MoulinetteSearchUtils.KEY_CATEGORY)
    } else {
      categories = await fetch(`${game.moulinette.applications.MoulinetteClient.SERVER_URL}/static/categories.json`).catch(function(e) {
        console.log(`MoulinetteSearchUtils | Cannot establish connection to server ${game.moulinette.applications.MoulinetteClient.SERVER_URL}`, e)
      });
      categories = await categories.json()
      categories.forEach(c => c.name = game.i18n.localize("mtte.filtercat" + c.id.toLowerCase()))
      game.moulinette.cache.setData(MoulinetteSearchUtils.KEY_CATEGORY, categories)
    }
    return categories;
  }
}
