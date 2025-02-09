const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");
const { SolverPlugin, SolverError } = require("../dist");
const ProxyRouter = require("@extra/proxy-router");

// Constants
const TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
// const WEBSITE_URL = "https://allegro.pl/listing?string=iphone%2015";
const WEBSITE_URL = "https://www.leboncoin.fr/recherche?text=awd&kst=k";
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseProxyString = (proxyString) => {
  const [host, port, username, password] = proxyString.split(":");
  if (!host || !port || !username || !password) {
    throw new Error(
      "Invalid proxy string format. Expected format: ip:port:user:pass"
    );
  }
  return `http://${username}:${password}@${host}:${port}`;
};

const retry = async (fn, { maxRetries, delay }) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(
        `\x1b[33m[warn]\x1b[0m attempt ${attempt}/${maxRetries} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      if (attempt < maxRetries) {
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
};

class PageHandler {
  constructor(page) {
    this.page = page;
  }

  async isBlockedOrCaptcha() {
    try {
      const status = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasBlockedText =
          bodyText.includes("You have been blocked") ||
          bodyText.includes("Access Denied") ||
          bodyText.includes("Captcha Required");

        const hasCaptchaIframe = !!document.querySelector(
          'iframe[src*="geo.captcha-delivery.com"]'
        );

        return {
          isBlocked: hasBlockedText,
          hasCaptcha: hasCaptchaIframe,
        };
      });

      return status;
    } catch (error) {
      console.error(
        "\x1b[33m[program]\x1b[0m error checking page status:",
        error
      );
      return { isBlocked: false, hasCaptcha: false };
    }
  }

  parseCookieString(cookieString) {
    const parts = cookieString.split(";").map((part) => part.trim());
    const cookieObject = {};

    for (let part of parts) {
      let [key, value] = part.split("=").map((s) => s.trim());

      switch (key.toLowerCase()) {
        case "datadome": // If it's the datadome cookie
          cookieObject.name = key;
          cookieObject.value = value;
          break;
        case "domain":
          cookieObject.domain = value;
          break;
        case "path":
          cookieObject.path = value;
          break;
        case "max-age":
          cookieObject.maxAge = parseInt(value, 10);
          cookieObject.expires =
            Math.floor(Date.now() / 1000) + parseInt(value, 10);
          break;
        case "secure":
          cookieObject.secure = true;
          break;
        case "httponly":
          cookieObject.httpOnly = true;
          break;
        case "samesite":
          cookieObject.sameSite = value;
          break;
      }
    }

    if (!cookieObject.name || !cookieObject.value) {
      throw new Error("Failed to extract valid cookie name or value");
    }
    if (!cookieObject.domain) {
      throw new Error("Cookie domain is missing");
    }
    if (!cookieObject.path) {
      cookieObject.path = "/"; // Default to root path
    }

    return cookieObject;
  }

  async solveCaptcha() {
    return new Promise(async (resolve, reject) => {
      const captchaIframe = await this.page.$(
        'iframe[src*="geo.captcha-delivery.com"]'
      );

      if (!captchaIframe) {
        throw new Error("Captcha iframe not found when attempting to solve");
      }

      const captchaUrl = await captchaIframe.evaluate((iframe) => iframe.src);

      if (captchaUrl.includes("t=bv")) {
        reject(
          new Error(
            'got "t=bv" at captcha url (read https://docs.capsolver.com/en/guide/captcha/datadome/)'
          )
        );
      }

      console.log(
        `\x1b[34m[info]\x1b[0m challenge url detected! \x1b[90m${captchaUrl}\x1b[0m`
      );

      // solve here
      await this.page
        .solver()
        .datadome({
          websiteURL: WEBSITE_URL,
          userAgent: USER_AGENT,
          captchaUrl,
          proxy: process.env.PROXYSTRING,
        })
        .then(async (solution) => {
          console.log(
            "\x1b[34m[info]\x1b[0m got capsolver solution! adding cookie and reloading page ..."
          );

          const cookedCookie = this.parseCookieString(solution.cookie);

          await this.page.setCookie(cookedCookie);

          await this.page.reload({
            waitUntil: "networkidle0",
            timeout: TIMEOUT,
          });
          await sleep(2000);

          const { isBlocked, hasCaptcha } = await this.isBlockedOrCaptcha();
          if (isBlocked || hasCaptcha) {
            throw new Error("Still blocked/captcha present after solving");
          }
        })
        .catch((e) => {
          console.log(
            e instanceof SolverError
              ? `\x1b[31m[solver]\x1b[0m ${e.errorCode}: ${e.errorDescription} ${e.errorTaskId ?? ""}` // show task error description
              : String(e)
          );
          reject(e);
        });

      resolve();
    });
  }

  async safeGoto(url) {
    const navigationWithRetry = async () => {
      const response = await this.page.goto(url, {
        waitUntil: "networkidle0",
        timeout: TIMEOUT,
      });

      const { isBlocked, hasCaptcha } = await this.isBlockedOrCaptcha();

      if (hasCaptcha) {
        await this.solveCaptcha();
        return this.safeGoto(url);
      }

      if (isBlocked) {
        throw new Error("Page is blocked and no captcha detected to solve");
      }

      if (!response || !response.ok()) {
        throw new Error(`Failed to load ${url}`);
      }

      return response;
    };

    return retry(navigationWithRetry, {
      maxRetries: MAX_RETRIES,
      delay: RETRY_DELAY,
    });
  }

  async safeWaitForSelector(selector) {
    return retry(
      async () => {
        const element = await this.page.waitForSelector(selector, {
          timeout: TIMEOUT,
        });
        if (!element) {
          throw new Error(`Selector ${selector} not found`);
        }
        return element;
      },
      { maxRetries: MAX_RETRIES, delay: RETRY_DELAY }
    );
  }
}

const setupPuppeteer = () => {
  puppeteer.use(
    new SolverPlugin({
      apiKey: process.env.APIKEY,
    })
  );

  if (!process.env.PROXYSTRING) {
    throw new Error("PROXYSTRING environment variable is not set");
  }

  puppeteer.use(
    ProxyRouter({
      proxies: { DEFAULT: parseProxyString(process.env.PROXYSTRING) },
      muteProxyErrorsForHost: ["fonts.googleapis.com", "accounts.google.com"],
    })
  );
};

const main = async () => {
  let browser = null;

  try {
    setupPuppeteer();

    browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    const pageHandler = new PageHandler(page);

    await page.setUserAgent(USER_AGENT);

    try {
      await pageHandler.safeGoto("https://ipwhois.app/json/");

      const { ip, country } = await page.evaluate(() => {
        try {
          return JSON.parse(document.body.textContent || "{}");
        } catch (e) {
          return {};
        }
      });

      if (ip && country) {
        console.log(`\x1b[34m[info]\x1b[0m using proxy: ${ip} (${country})`);
      } else {
        console.log("\x1b[31m[error]\x1b[0m Unable to retrieve proxy details.");
      }
    } catch (error) {
      throw new Error(
        `Proxy connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await pageHandler.safeGoto(WEBSITE_URL);

    const acceptButton = await pageHandler.safeWaitForSelector(
      '[data-testid="accept_home_view_action"]'
    );
    if (acceptButton) {
      console.log("\x1b[34m[info]\x1b[0m doing things on the page ...");
      await acceptButton.click();
    }

    await sleep(1500);

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await sleep(1500);
    await page.evaluate(() => {
      alert("Test finished");
    });
  } catch (error) {
    console.error(
      "\x1b[31m[err]",
      error instanceof SolverError
        ? `[task: ${error.errorTaskId}]${error.errorCode}: ${error.errorDescription}`
        : String(error)
    );
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

process.on("unhandledRejection", (error) => {
  console.error("unhandled rejection:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("unhandled error:", error);
  process.exit(1);
});
