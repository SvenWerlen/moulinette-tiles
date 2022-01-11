export class MoulinetteOptions extends FormApplication {

  constructor(dialog, callback) {
    super()
    this.dialog = dialog
    this.callback = callback
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
    return {
      dropmode: this.dialog == "dropmode",
      tilesize: this.dialog == "tilesize",
      sizes: [50, 100, 150, 200, 300]
    }
  }

  async _updateObject(event) {
    event.preventDefault();

    const customValue = this.html.find(".custom").val()
    if(customValue) {
      this.callback(customValue)
    }
    // default option
    else {
      this.callback(event.submitter.className)
    }
  }

  async activateListeners(html) {
    super.activateListeners(html);
    this.html = html
  }
}
