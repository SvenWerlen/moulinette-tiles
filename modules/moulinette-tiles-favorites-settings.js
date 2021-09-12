/*************************************************
 * Tiles favorites Settings
 *************************************************/
export class MoulinetteTilesFavoritesSettings extends FormApplication {

  constructor() {
    super()
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-favorites-settings",
      classes: ["mtte", "forge", "favorites"],
      title: game.i18n.localize("mtte.favorites"),
      template: "modules/moulinette-tiles/templates/favorites-settings.hbs",
      width: 550,
      height: 600,
      resizable: false,
      submitOnClose: false
    });
  }


  async getData() {
    const favs = duplicate(game.settings.get("moulinette", "favorites"))

    const favorites = []
    for(const fav in favs) {
      favorites.push({
        id: fav,
        icon: favs[fav].icon,
        items: favs[fav].list.length,
        size: favs[fav].size > 0 ? favs[fav].size : "",
        macros: favs[fav].macros && favs[fav].macros.length > 0 ? favs[fav].macros.split(",").length : 0,
        editable: fav != "history" && fav != "default",
        visible: !favs[fav].hidden
      })
    }

    favorites.sort(function(a, b) {
      if (a.id == "history" || a.id == "default") {
        return -1;
      } else if (b.id == "history" || b.id == "default") {
        return 1;
      }
      return a.id < b.id ? -1 : 1;
    });

    return { favorites: favorites };
  }


  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html

    IconPicker.Init({
      // Required: You have to set the path of IconPicker JSON file to "jsonUrl" option. e.g. '/content/plugins/IconPicker/dist/iconpicker-1.5.0.json'
      jsonUrl: "/modules/moulinette-core/iconpicker/iconpicker.json",
      // Optional: Change the buttons or search placeholder text according to the language.
      searchPlaceholder: game.i18n.localize("mtte.searchIcon"),
      showAllButton: game.i18n.localize("mtte.showAll"),
      cancelButton: game.i18n.localize("mtte.cancel"),
      noResultsFound: game.i18n.localize("mtte.noResultsFound"),
      // v1.5.0 and the next versions borderRadius: '20px', // v1.5.0 and the next versions
    });
    IconPicker.Run('#GetIconPicker');
    IconPicker.Run('#GetIconPickerEdit');

    html.find(".actions a").click(this._onAction.bind(this));
    html.find(".actions .add").click(this._onAddGroup.bind(this));
    html.find(".actions .apply").click(this._onEditGroup.bind(this));
    html.find(".actions .cancel").click(ev => {
      this.html.find("footer .edit").hide()
      this.html.find("footer .new").show()
    });
  }

  /**
   * User clicked on any of the action button (on a group)
   */
  async _onAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const id = $(source.closest(".item")).data("id")
    const favs = game.settings.get("moulinette", "favorites")
    const icon = favs[id].icon
    const size = favs[id].size > 0 ? `${favs[id].size}` : ""
    const macros = favs[id].macros

    if(source.classList.contains("edit")) {
      if(id == "default" || id == "history") return;
      this.html.find("footer .new").hide()
      this.html.find("#IconSourceIdEdit").val(id)
      this.html.find("#IconIdEdit").val(id)
      this.html.find("#IconInputEdit").val(icon)
      this.html.find("#PreviewIconEdit").attr("class", icon);
      this.html.find("#tileSizeEdit").val(size)
      this.html.find("#macrosEdit").val(macros)
      this.html.find("footer .edit").show()
    } else if(source.classList.contains("delete")) {
      if(id == "default" || id == "history") return;
      const parent = this
      Dialog.confirm({
        title: game.i18n.localize("mtte.deleteGroup"),
        content: game.i18n.format("mtte.deleteGroupContent", { group: id }),
        yes: async function() {
          if( id in favs ) {
            delete favs[id]
            await game.settings.set("moulinette", "favorites", favs)
            parent.render()
          }
        },
        no: () => {}
      });
    } else if(source.classList.contains("toggle")) {
      if( id in favs ) {
        if( favs[id].hidden ) { delete favs[id].hidden }
        else { favs[id].hidden = true }
        await game.settings.set("moulinette", "favorites", favs)
        this.render()
      }
    }
  }

  /**
   * User clicked on "Apply" (Modify group)
   */
  async _onEditGroup(event) {
    const oldID = this.html.find("#IconSourceIdEdit").val()
    const groupId = this.html.find("#IconIdEdit").val()
    const groupIcon = this.html.find("#IconInputEdit").val()
    const tileSize = this.html.find("#tileSizeEdit").val()
    const macros = this.html.find("#macrosEdit").val()

    if (!groupId.match(/^[0-9a-zA-Z]{3,10}$/)) {
      return ui.notifications.error(game.i18n.localize("mtte.errorGroupIdInvalid"));
    }
    if (!groupIcon.match(/^fa[a-z] fa-[0-9a-z\-]+$/)) {
      return ui.notifications.error(game.i18n.localize("mtte.errorIconInvalid"));
    }

    // check that group ID doesn't exist
    const favs = game.settings.get("moulinette", "favorites")
    if( groupId in favs && oldID != groupId ) {
      return ui.notifications.error(game.i18n.localize("mtte.errorGroupIdDuplicate"));
    }

    // edit new group
    const group = duplicate(favs[oldID])
    group.icon = groupIcon

    // add additional data
    group.size = tileSize.trim().length > 0 ? parseInt(tileSize) : ""
    group.macros = macros.trim().length > 0 ? macros.trim() : ""

    // replace
    delete favs[oldID]
    favs[groupId] = group
    await game.settings.set("moulinette", "favorites", favs)
    this.render()
  }

  /**
   * User clicked on "Add Group"
   */
  async _onAddGroup(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const groupId = this.html.find("#IconId").val()
    const groupIcon = this.html.find("#IconInput").val()
    const tileSize = this.html.find("#tileSize").val()
    const macros = this.html.find("#macros").val()

    if (!groupId.match(/^[0-9a-zA-Z]{3,10}$/)) {
      return ui.notifications.error(game.i18n.localize("mtte.errorGroupIdInvalid"));
    }
    if (!groupIcon.match(/^fa[a-z] fa-[0-9a-z\-]+$/)) {
      return ui.notifications.error(game.i18n.localize("mtte.errorIconInvalid"));
    }

    // check that group ID doesn't exist
    const favs = game.settings.get("moulinette", "favorites")
    if( groupId in favs ) {
      return ui.notifications.error(game.i18n.localize("mtte.errorGroupIdDuplicate"));
    }

    // maximum number of groups reached
    if( Object.keys(favs).length >= 10 ) {
      return ui.notifications.error(game.i18n.localize("mtte.errorGroupMaximum"));
    }

    // add new group
    favs[groupId] = { icon: groupIcon, list: [] }

    // add additional data
    favs[groupId].size = tileSize.trim().length > 0 ? parseInt(tileSize) : ""
    favs[groupId].macros = macros.trim().length > 0 ? macros.trim() : ""

    await game.settings.set("moulinette", "favorites", favs)
    this.render()
  }
}
