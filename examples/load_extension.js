const puppeteer = require("puppeteer-extra");
const { SolverPlugin, SolverPluginError, SolverError } = require("../dist");

puppeteer.use(
  new SolverPlugin({
    apiKey: process.env.APIKEY,
    useExtension: true, // # this will auto-load the exntension and apiKey
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

    await page.waitForSolverExtension({
      // timeout: 120000,
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
