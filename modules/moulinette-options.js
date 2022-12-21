export class MoulinetteOptions extends FormApplication {

  constructor(dialog, callback, options = {}) {
    super(null, { width: options.width, height: options.height })
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
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  async getData() {
    const macros = []
    let macroError = null
    if(this.dialog == "macros") {
      const config = game.settings.get("moulinette-tiles", "macroCompendium")
      const selMacros = this.mtteOptions.macros
      if(config && config.length > 0) {
        const compendium = game.packs.get(config)
        if(!compendium) {
          console.error(`MoulinetteOptions | Couldn't find compendium '${config}' configured`)
          macroError = game.i18n.localize("mtte.errorMissingMacroCompendium")
        } else {
          const index = await compendium.getIndex()
          for(const m of index.values()) {
            const macro = duplicate(m)
            macro.selected = selMacros && selMacros.includes(m._id)
            macros.push(macro)
          }
          macros.sort((a,b) => '' + (a.name.toLowerCase()).localeCompare(b.name.toLowerCase()))

          if(macros.length == 0) {
            macroError = game.i18n.localize("mtte.errorEmptyMacroCompendium")
          }
        }
      } else {
        macroError = game.i18n.localize("mtte.errorMissingMacroCompendium")
      }
    }

    return {
      dropmode: this.dialog == "dropmode",
      tilesize: this.dialog == "tilesize",
      macros: this.dialog == "macros" && macros.length > 0 ? macros : false,
      macroError: macroError,
      sizes: [50, 100, 150, 200, 300, 400, 500, 700, 1000]
    }
  }

  async _updateObject(event) {
    event.preventDefault();

    // don't close on reset
    if(event.submitter.className == "reset") {
      return;
    }

    this.close()
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
      event.preventDefault();
      $(event.currentTarget).toggleClass("selected");
    })

    html.find(".reset").click(event => {
      this.html.find(".macro.selected").each(function(idx, el) {
        $(el).toggleClass("selected")
      })
    })

    this.html = html
    this.bringToTop()
  }
}
