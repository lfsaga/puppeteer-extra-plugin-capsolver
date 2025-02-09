const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");
const { SolverPlugin, SolverError } = require("../dist");

const solverPlugin = new SolverPlugin({
  apiKey: process.env.APIKEY,
  // extensionConfig: {
  // useCapsolver: true,
  // reCaptchaMode: "click", // e.g: set recaptcha mode ("click" or "token")
  // },
});

// solverPlugin.initExtension();

puppeteer.use(solverPlugin);

const WEBSITE_URL = "https://google.com/recaptcha/api2/demo";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto(WEBSITE_URL);

    await sleep(1000);

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await sleep(100000);

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
