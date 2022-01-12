export class MoulinetteOptions extends FormApplication {

  constructor(dialog, callback, options = {}) {
    super()
    this.dialog = dialog
    this.callback = callback
    this.mtteOptions = options
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "mtteOptionsDialog",
      classes: ["mtte", "options"],
      title: "",
      template: "modules/moulinette-tiles/templates/options.hbs",
      width: 100,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }

  async getData() {
    const macros = []
    if(this.dialog == "macros") {
      const config = game.settings.get("moulinette-tiles", "macroCompendium")
      const selMacros = this.mtteOptions.macros
      if(config && config.length > 0) {
        const compendium = game.packs.get(config)
        if(!compendium) {
          console.error(`MoulinetteOptions | Couldn't find compendium '${config}' configured`)
        } else {
          const index = await compendium.getIndex()
          for(const m of index.values()) {
            const macro = duplicate(m)
            macro.selected = selMacros && selMacros.includes(m._id)
            macros.push(macro)
          }
          macros.sort((a,b) => '' + (a.name.toLowerCase()).localeCompare(b.name.toLowerCase()))
        }
      }
    }

    return {
      dropmode: this.dialog == "dropmode",
      tilesize: this.dialog == "tilesize",
      macros: this.dialog == "macros" ? macros : false,
      sizes: [50, 100, 150, 200, 300]
    }
  }

  async _updateObject(event) {
    event.preventDefault();

    if(this.dialog == "macros") {
      const ids = []
      this.html.find(".macro.selected").each(function(idx, el) {
        ids.push($(el).data('id'))
      })
      return this.callback(ids)
    }

    const customValue = this.html.find(".custom").val()
    if(customValue) {
      return this.callback(customValue)
    }
    // default option
    else {
      return this.callback(event.submitter.className)
    }
  }

  async activateListeners(html) {
    super.activateListeners(html);

    html.find(".macro").click(event => {
      $(event.currentTarget).toggleClass("selected");
    })

    this.html = html
    this.bringToTop()
  }
}
