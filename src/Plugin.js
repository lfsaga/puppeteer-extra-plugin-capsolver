'use strict';

const { PuppeteerExtraPlugin } = require("puppeteer-extra-plugin");
const Solver = require("capsolver-npm");

class SolverPlugin extends PuppeteerExtraPlugin {
    constructor(apiKey = null, verbose = 0) {
        super({ apiKey, verbose });
        this.apiKey = apiKey;
        this.verbose = verbose;
    }

    get name() {
        return 'capsolver'
    }

    get defaults() {
        return { apiKey: null, verbose: 0 }
    }

    async onPluginRegistered() {
        this.solver = new Solver(this.apiKey, this.verbose)
    }

    async onBrowser(browser) {
        const pages = await browser.pages()

        for (const page of pages) {
            this._addSolverToPage(page)
            // this._addFeaturesToPage(page)

            // for (const frame of page.mainFrame().childFrames()) {
                // this._addFeaturesToPage(frame)
            // }
        }
    }

    async onPageCreated(page) {
        await page.setBypassCSP(true)

        this._addSolverToPage(page)
        // this._addFeaturesToPage(page)

        // page.on('frameattached', frame => {
        //     if (!frame) return
        //     this._addFeaturesToPage(frame)
        // })
    }

    _addSolverToPage(page) {
        page.solver = () => { return this.solver }
        page.setSolver = async (opts) => this.solver = new Solver(opts.apiKey, opts.verbose)
    }

    // _addFeaturesToPage(page) { }
}

const defaultExport = (apiKey, verbose) => new SolverPlugin(apiKey, verbose)
module.exports = defaultExport