import { MoulinetteSearchUtils } from "./moulinette-searchUtils.js"

/*************************************************
 * Tiles favorites Categories
 *************************************************/
export class MoulinetteTilesFavoritesCategories extends FormApplication {

  static KEY_CATEGORY = "imageCategories"

  constructor(group, packs) {
    super()

    this.groupName = group
    this.packs = packs
    const favs = duplicate(game.settings.get("moulinette", "favorites"))
    this.group = favs[group]
    this.elements = []

    for(const fav of this.group.list) {
      // retrieve pack & tile
      const pack = this.packs.find( p => p.publisher == fav.pub && p.name == fav.pack )
      if(pack) {
        if(pack.packId) {
          this.elements.push({packId: pack.packId, asset: fav.asset})
        } else {
          console.warn(`MoulinetteTilesFavoritesCategories | Ignoring ${fav.asset} (not Moulinette Cloud)`)
        }
      }
    }
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-favorites-categories",
      classes: ["mtte", "forge", "categories"],
      title: game.i18n.localize("mtte.categories"),
      template: "modules/moulinette-tiles/templates/favorites-categories.hbs",
      width: 550,
      height: 600,
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: false
    });
  }


  async getData() {
    // retrieve categories
    this.categories = await MoulinetteSearchUtils.getCategories()

    return { group: this.groupName, count: this.elements.length, icon: this.group.icon, categories: this.categories }
  }

  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html

    html.find('.combo').change(this.toggleCategories.bind(this))
    this.toggleCategories()
  }

  async _updateObject(event) {
    event.preventDefault();
    if(event.submitter.className == "applyCategories") {
      $(event.submitter).prop('disabled',"disabled")

      // retrieve favorites
      const favs = duplicate(game.settings.get("moulinette", "favorites"))

      SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.updating"), pct: 1});

      let idx = 0
      let payloads = []
      for(const fav of this.elements) {

        // update progressBar
        idx++

        // prepare payload
        this.html.find('.combo').each(function(idx, sel) {
          const categoryId = $(sel).data('id')
          const categoryVal = $(sel).is(':visible') ? $(sel).find(":selected").val() : "-" // invisible means doesn't meet dependencies

          if(categoryVal.length > 0) {
            payloads.push({
              packId: fav.packId,
              asset: fav.asset,
              categoryKey: categoryId,
              categoryVal: categoryVal == "-" ? "" : categoryVal
            })
          }
        });

        // submit payload for each 10 entries (or if last)
        if(idx % 10 == 0 || idx == this.elements.length) {
          await fetch(`${game.moulinette.applications.MoulinetteClient.SERVER_URL}/search/categories/${game.moulinette.user.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloads)
          }).catch(function(e) {
            console.log(`MoulinetteTilesFavoritesCategories | Something went wrong while updating the categories on the server`)
            console.warn(e)
          });

          SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.updating"), pct: Math.round(idx * 100 / this.elements.length)});
          payloads = []
        }
      }

      // completed
      SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.updating"), pct: 100});
      ui.notifications.info(game.i18n.localize("mtte.categoriesUpdateCompleted"));

      $(event.submitter).prop('disabled',"")
    }
  }

  // automatically show/hide categories based on dependencies
  toggleCategories() {
    const parent = this
    this.html.find(".category").each(function(idx, el) {
      const id = $(el).data('id')
      const req = parent.categories.find(c => c.id == id).requires
      if(req) {
        for(const k of Object.keys(req)) {
          if(["category", "creator"].includes(k)) continue
          const value = parent.html.find(`.combo[data-id='${k}']`).val()
          if(value != req[k]) {
            return $(el).hide()
          }
        }
      }
      $(el).show()
    })
  }
}
