require("dotenv").config();
const puppeteer = require("puppeteer-extra");
const { SolverPlugin, SolverPluginError, SolverError } = require("../dist");

puppeteer.use(
  new SolverPlugin({
    apiKey: process.env.APIKEY,
  })
);

(async () => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
    });

    const page = await browser.newPage();

    await page.goto("https://google.com/recaptcha/api2/demo");

    await page
      .solver()
      .recaptchav2proxyless({
        websiteURL: "https://google.com/recaptcha/api2/demo",
        websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
      })
      .then((s) => {
        console.log(s);
      })
      .catch((e) => {
        console.error(e);
      });

    await page.evaluate(() => {
      alert("Test finished");
    });
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
