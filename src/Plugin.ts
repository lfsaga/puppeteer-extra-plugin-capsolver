import { PuppeteerExtraPlugin } from "puppeteer-extra-plugin";
import { Browser, Page } from "puppeteer";
import { Solver } from "capsolver-npm";
import fs from "fs-extra";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { SolverPluginOptions } from "./types";
import { SolverPluginError } from "./errors";

declare module "puppeteer" {
  interface Page {
    solver: () => Solver;
    setSolver: (opts: { apiKey: string }) => Promise<void>;
    waitForSolverCallback?: ({
      timeout,
    }: {
      timeout?: number;
    }) => Promise<boolean>;
  }
}

export class SolverPlugin extends PuppeteerExtraPlugin {
  private s!: Solver;
  private ezp: string;
  public tmd!: string;

  constructor(opts: Partial<SolverPluginOptions> = {}) {
    super(opts);

    this.ezp = path.join(
      __dirname,
      "resources",
      "capsolver-extension-v1.15.3.zip"
    );

    this.s = new Solver({
      apiKey: this.opts.apiKey,
    });
  }

  get name(): string {
    return "capsolver";
  }

  get defaults(): SolverPluginOptions {
    const availableFeatures = new Set<string>([]);
    return {
      apiKey: null,
      useExtension: false,
      useExtensionProxy: null,
      useExtensionReCaptchaMode: "click",
      availableFeatures,
      enabledFeatures: new Set([...availableFeatures]),
    };
  }

  public async onPluginRegistered(): Promise<void> {
    if (!this.opts.apiKey || this.opts.apiKey.length < 4) {
      throw new SolverPluginError(
        "bad apiKey (doc at github.com/lfsaga/puppeteer-extra-plugin-capsolver)"
      );
    }

    if (this.opts.useExtension) {
      await this._loadExtension();
    }
  }

  async beforeLaunch(options: any): Promise<any> {
    if (this.opts.useExtension) {
      options.headless = false;
      if (!options.args) options.args = [];
      options.args.push(
        `--disable-extensions-except=${this.tmd.replace(/\\/g, "/")}`
      );
      options.args.push(`--load-extension=${this.tmd.replace(/\\/g, "/")}`);
    }

    return options;
  }

  async onBrowser(browser: Browser): Promise<void> {
    if ("setMaxListeners" in browser) {
      // @ts-ignore
      browser.setMaxListeners(30);
    }

    const pages = await browser.pages();
    for (const page of pages) {
      this._addSolverToPage(page);
      if (this.opts.useExtension) {
        await this._addWaitForSolverCallbackToPage(page);
      }
    }
  }

  async onPageCreated(page: Page): Promise<void> {
    await page.setBypassCSP(true);
    this._addSolverToPage(page);

    if (this.opts.useExtension) {
      await this._addWaitForSolverCallbackToPage(page);
    }
  }

  private _addSolverToPage(page: Page): void {
    page.solver = (): Solver => {
      return this.s;
    };

    page.setSolver = async (opts: { apiKey: string }): Promise<void> => {
      this.s = new Solver({
        apiKey: opts.apiKey.toString(),
      });
    };
  }

  private async _addWaitForSolverCallbackToPage(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // @ts-ignore
      window.captchaSolvedCallbackDone = false;
      // @ts-ignore
      window.captchaSolvedCallback = () => {
        // @ts-ignore
        window.captchaSolvedCallbackDone = true;
      };
    });

    page.waitForSolverCallback = async ({
      timeout = 60000,
    }: {
      timeout?: number;
    }): Promise<boolean> => {
      return new Promise(async (resolve, reject) => {
        const startTime = Date.now();

        while (true) {
          const done = await page.evaluate(
            // @ts-ignore
            () => window.captchaSolvedCallbackDone
          );
          if (done) {
            resolve(true);
            return;
          }

          if (Date.now() - startTime > timeout) {
            reject(
              new SolverPluginError(
                "Timeout: Solver extension did not load in time"
              )
            );
            return;
          }

          await new Promise((r) => setTimeout(r, 1000));
        }
      });
    };
  }

  private async _loadExtension(): Promise<void> {
    this.tmd = path.join(os.tmpdir(), "capsolver-extension");
    fs.ensureDirSync(this.tmd);
    new AdmZip(this.ezp).extractAllTo(this.tmd, true);

    const localPath = path.join(this.tmd, "assets/config.js");
    const content = fs.readFileSync(localPath, "utf8");

    let cooked = this.updateApiKeyAndAppId(content);
    cooked = this.updateProxySettings(cooked);
    cooked = this.updateReCaptchaMode(cooked);

    fs.writeFileSync(localPath, cooked);

    this.updateManifestPermissions();
  }

  private updateApiKeyAndAppId(content: string): string {
    return content
      .replace(/apiKey: '',/, `apiKey: '${this.opts.apiKey}',`)
      .replace(/appId: '',/, `appId: 'F9E44D7F-A254-4D75-87F6-54B84EE16676',`);
  }

  private updateProxySettings(content: string): string {
    if (!this.opts.useExtensionProxy) {
      return content
        .replace(/useProxy: true,/, `useProxy: false,`)
        .replace(/hostOrIp: '[^']*',/, `hostOrIp: '',`)
        .replace(/port: '[^']*',/, `port: '',`)
        .replace(/proxyLogin: '[^']*',/, `proxyLogin: '',`)
        .replace(/proxyPassword: '[^']*',/, `proxyPassword: '',`);
    }

    const [host, port, login, password] =
      this.opts.useExtensionProxy.split(":");
    return content
      .replace(/useProxy: false,/, `useProxy: true,`)
      .replace(/hostOrIp: '',/, `hostOrIp: '${host}',`)
      .replace(/port: '',/, `port: '${port}',`)
      .replace(/proxyLogin: '',/, `proxyLogin: '${login}',`)
      .replace(/proxyPassword: '',/, `proxyPassword: '${password}',`);
  }

  private updateReCaptchaMode(content: string): string {
    if (!this.opts.useExtensionReCaptchaMode) {
      return content.replace(
        /reCaptchaMode: '[^']*',/,
        `reCaptchaMode: 'click',`
      );
    }

    return content
      .replace(
        /reCaptchaMode: 'click',/,
        `reCaptchaMode: '${this.opts.useExtensionReCaptchaMode}',`
      )
      .replace(
        /reCaptchaMode: 'token',/,
        `reCaptchaMode: '${this.opts.useExtensionReCaptchaMode}',`
      );
  }

  private updateManifestPermissions(): void {
    const manifestPath = path.join(this.tmd, "manifest.json");
    const manifestContent = fs.readJsonSync(manifestPath);
    manifestContent.permissions.push("http://*/*");
    fs.writeJsonSync(manifestPath, manifestContent);
  }
}

export default (opts?: Partial<SolverPluginOptions>): SolverPlugin =>
  new SolverPlugin(opts);
