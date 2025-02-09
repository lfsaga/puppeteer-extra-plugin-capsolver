import { PuppeteerExtraPlugin } from "puppeteer-extra-plugin";
import { Browser, Page } from "puppeteer";
import { Solver } from "capsolver-npm";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { SolverPluginOptions } from "./types";

declare module "puppeteer" {
  interface Page {
    solver: () => Solver;
    setSolver: (opts: { apiKey: string }) => Promise<void>;
  }
}

export class SolverPlugin extends PuppeteerExtraPlugin {
  private solver!: Solver;
  private extensionZipPath: string;
  public tempExtensionDir!: string;

  constructor(opts: Partial<SolverPluginOptions> = {}) {
    super(opts);
    this.extensionZipPath = path.join(
      __dirname,
      "resources",
      "capsolver-extension-v1.15.3.zip"
    );

    // @ts-ignore
    this.solver = new Solver({
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
      extensionConfig: null,
      availableFeatures,
      enabledFeatures: new Set([...availableFeatures]),
    };
  }

  public initExtension(): void {
    // @ts-ignore
    this.solver = new Solver({
      apiKey: this.opts.apiKey,
    });

    if (this.opts.extensionConfig !== null) {
      this.tempExtensionDir = "/tmp/capsolver-extension";

      const zip = new AdmZip(this.extensionZipPath);
      zip.extractAllTo(this.tempExtensionDir, true);

      const configPath = path.join(this.tempExtensionDir, "assets/config.js");
      const configContent = `export const defaultConfig = ${JSON.stringify({
        apiKey: this.opts.apiKey,
        appId: "",
        useCapsolver: this.opts.extensionConfig.useCapsolver ?? true,
        manualSolving: this.opts.extensionConfig.manualSolving ?? false,
        solvedCallback:
          this.opts.extensionConfig.solvedCallback ?? "captchaSolvedCallback",
        useProxy: this.opts.extensionConfig.useProxy ?? false,
        proxyType: this.opts.extensionConfig.proxyType ?? "http",
        hostOrIp: this.opts.extensionConfig.hostOrIp ?? "",
        port: this.opts.extensionConfig.port ?? "",
        proxyLogin: this.opts.extensionConfig.proxyLogin ?? "",
        proxyPassword: this.opts.extensionConfig.proxyPassword ?? "",
        enabledForBlacklistControl:
          this.opts.extensionConfig.enabledForBlacklistControl ?? false,
        blackUrlList: this.opts.extensionConfig.blackUrlList ?? [],
        enabledForRecaptcha:
          this.opts.extensionConfig.enabledForRecaptcha ?? true,
        enabledForRecaptchaV3:
          this.opts.extensionConfig.enabledForRecaptchaV3 ?? true,
        enabledForImageToText:
          this.opts.extensionConfig.enabledForImageToText ?? true,
        enabledForAwsCaptcha:
          this.opts.extensionConfig.enabledForAwsCaptcha ?? true,
        enabledForCloudflare:
          this.opts.extensionConfig.enabledForCloudflare ?? true,
        reCaptchaMode: this.opts.extensionConfig.reCaptchaMode ?? "click",
        hCaptchaMode: this.opts.extensionConfig.hCaptchaMode ?? "click",
        reCaptchaDelayTime: this.opts.extensionConfig.reCaptchaDelayTime ?? 0,
        hCaptchaDelayTime: this.opts.extensionConfig.hCaptchaDelayTime ?? 0,
        textCaptchaDelayTime:
          this.opts.extensionConfig.textCaptchaDelayTime ?? 0,
        awsDelayTime: this.opts.extensionConfig.awsDelayTime ?? 0,
        reCaptchaRepeatTimes:
          this.opts.extensionConfig.reCaptchaRepeatTimes ?? 10,
        reCaptcha3RepeatTimes:
          this.opts.extensionConfig.reCaptcha3RepeatTimes ?? 10,
        hCaptchaRepeatTimes:
          this.opts.extensionConfig.hCaptchaRepeatTimes ?? 10,
        funCaptchaRepeatTimes:
          this.opts.extensionConfig.funCaptchaRepeatTimes ?? 10,
        textCaptchaRepeatTimes:
          this.opts.extensionConfig.textCaptchaRepeatTimes ?? 10,
        awsRepeatTimes: this.opts.extensionConfig.awsRepeatTimes ?? 10,
        reCaptcha3TaskType:
          this.opts.extensionConfig.reCaptcha3TaskType ??
          "ReCaptchaV3TaskProxyLess",
        textCaptchaSourceAttribute:
          this.opts.extensionConfig.textCaptchaSourceAttribute ??
          "capsolver-image-to-text-source",
        textCaptchaResultAttribute:
          this.opts.extensionConfig.textCaptchaResultAttribute ??
          "capsolver-image-to-text-result",
        textCaptchaModule:
          this.opts.extensionConfig.textCaptchaModule ?? "common",
      })}`;

      fs.writeFileSync(configPath, configContent);
    }
  }

  async beforeLaunch(options: any): Promise<any> {
    if (this.opts.extensionConfig !== null) {
      options.headless = false;
      if (!options.args) options.args = [];

      options.args.push(`--disable-extensions-except=${this.tempExtensionDir}`);
      options.args.push(`--load-extension=${this.tempExtensionDir}`);
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
    }
  }

  async onPageCreated(page: Page): Promise<void> {
    await page.setBypassCSP(true);
    this._addSolverToPage(page);
  }

  private _addSolverToPage(page: Page): void {
    page.solver = (): Solver => {
      return this.solver;
    };

    page.setSolver = async (opts: { apiKey: string }): Promise<void> => {
      // @ts-ignore
      this.solver = new Solver({
        apiKey: opts.apiKey.toString(),
      });
    };
  }
}

export default (opts?: Partial<SolverPluginOptions>): SolverPlugin =>
  new SolverPlugin(opts);
