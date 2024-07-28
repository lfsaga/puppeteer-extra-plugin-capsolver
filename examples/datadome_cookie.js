const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");

const SolverPlugin = require("../src/Plugin")(process.env.APIKEY);
puppeteer.use(SolverPlugin);

const websiteUrl = "https://allegro.pl/listing?string=iphone%2015";
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const checkAndSolve = (page) => {
    return new Promise(async (resolve, reject) => {
        const captchaIframe = await page.$("iframe[src*=\"geo.captcha-delivery.com\"]");
        if (captchaIframe) {
            let captchaUrl = await captchaIframe.evaluate(iframe => iframe.src);

            await page.solver().datadome({
                websiteURL: websiteUrl,
                userAgent: userAgent,
                captchaUrl: captchaUrl,
                proxy: process.env.PROXYSTRING  // needs proxy
            })
                .then(async (solution) => {
                    const validCookie = solution.cookie.match(/datadome=([^;]+)/)[1];
                    let cookies = await page.cookies();
                    cookies = cookies.filter(cookie => cookie.name !== "datadome");
                    cookies.push({ name: "datadome", value: validCookie, domain: ".allegro.pl" });
                    await page.setCookie(...cookies);
                    await page.reload();
                    resolve();
                })
                .catch(e => { reject(e); });
        }
    })
}

puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
}).then(async (browser) => {
    try {
        const context = await browser.createIncognitoBrowserContext();
        const page = await context.newPage();

        await page.setUserAgent(userAgent);
        await page.goto(websiteUrl);

        await checkAndSolve(page);

        // perform regular tasks over the website
        await page.waitForSelector("[data-testid=\"accept_home_view_action\"]")
        await page.click("[data-testid=\"accept_home_view_action\"]")

        await page.waitForTimeout(5000);
        await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
        await page.waitForTimeout(3000);
        await page.evaluate(() => { alert("Test finished"); });

    } catch (e) {
        console.log(e);
    } finally {
        await browser.close();
    }
});