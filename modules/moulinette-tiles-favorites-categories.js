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
      height: "auto",
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: false
    });
  }


  async getData() {

    // retrieve categories
    if(game.moulinette.cache.hasData(MoulinetteTilesFavoritesCategories.KEY_CATEGORY)) {
      this.categories = game.moulinette.cache.getData(MoulinetteTilesFavoritesCategories.KEY_CATEGORY)
    } else {
      const categories = await fetch(`${game.moulinette.applications.MoulinetteClient.SERVER_URL}/static/categories.json`).catch(function(e) {
        console.log(`MoulinetteTilesFavoritesCategories | Cannot establish connection to server ${game.moulinette.applications.MoulinetteClient.SERVER_URL}`, e)
      });
      if(categories) {
        this.categories = await categories.json()
        this.categories.forEach(c => c.name = game.i18n.localize("mtte.filter" + c.id))
        game.moulinette.cache.setData(MoulinetteTilesFavoritesCategories.KEY_CATEGORY, this.categories)
      }
    }

    for(const c of this.categories) {
      c.options = []
      for(const v of c.values) {
        c.options.push({
          id: v,
          name: game.i18n.localize("mtte.filterValue" + c.id),
          selected: false
        })
      }
    }
    return { group: this.groupName, count: this.elements.length, icon: this.group.icon, categories: this.categories }
  }

  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
  }

  async _updateObject(event) {
    event.preventDefault();
    if(event.submitter.className == "applyCategories") {

      // retrieve favorites
      const favs = duplicate(game.settings.get("moulinette", "favorites"))

      let idx = 0
      for(const fav of this.elements) {

        // update progressBar
        idx++
        SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.updating"), pct: Math.round(idx * 100 / this.elements.length)});

        // prepare payload
        const payloads = []
        this.html.find('.combo').each(function(idx, sel) {
          const categoryId = $(sel).data('id')
          const categoryVal = $(sel).find(":selected").val()

          if(categoryVal.length > 0) {
            payloads.push({
              packId: fav.packId,
              asset: fav.asset,
              categoryKey: categoryId,
              categoryVal: categoryVal
            })
          }
        });

        await fetch(`${game.moulinette.applications.MoulinetteClient.SERVER_URL}/search/categories/${game.moulinette.user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloads)
        }).catch(function(e) {
          console.log(`MoulinetteTilesFavoritesCategories | Something went wrong while updating the categories on the server`)
          console.warn(e)
        });
      }

      // completed
      SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.updating"), pct: 100});
      ui.notifications.info(game.i18n.localize("mtte.categoriesUpdateCompleted"));
    }
  }
}
