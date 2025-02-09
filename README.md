# capsolver puppeteer-extra plugin

- **Manage to solve captcha challenges with AI in a puppeteer-extra app (captcha service based).**
- ❗ An API key it's **required**. [**Get here.**](https://dashboard.capsolver.com/passport/register?inviteCode=CHhA_5os)

[![](https://img.shields.io/badge/2.0.1-puppeteer--extra--plugin--capsolver-darkgreen?logo=npm&logoColor=white)](https://www.npmjs.com/package/puppeteer-extra-plugin-capsolver)
[![](https://img.shields.io/badge/documentation-docs.capsolver.com-darkgreen)](https://docs.capsolver.com/guide/getting-started.html)

# ⬇️ Install

`npm i puppeteer puppeteer-extra puppeteer-extra-plugin-capsolver`

# ✋ Usage

❗ This plugin only helps retrieving solving tasks from api.capsolver.com based on [capsolver-npm](https://github.com/0qwertyy/capsolver-npm)

- Initialize `SolverPlugin` and use it within `puppeteer-extra`.
- Then call `await page.solver()` to retrieve and use the solver at any moment.

```javascript
const puppeteer = require("puppeteer-extra");
const SolverPlugin = require("puppeteer-extra-plugin-capsolver")(
  "CAP-XXXXXX ..."
);
puppeteer.use(SolverPlugin);

puppeteer.launch().then(async (browser) => {
  try {
    let page = await browser.newPage();

    await page.goto("https://example.com/");

    let solution = await page.solver().hcaptchaproxyless({
      websiteURL: "https://example.com/",
      websiteKey: "00000000-0000-0000-0000-000000000000",
    });

    // use your solution (solution.gRecaptchaResponse in this case)
    // ...
  } catch (e) {
    console.log(e);
  } finally {
    await browser.close();
  }
});
```

- Handle any `api.capsolver.com` supported task.

## 🔨 Methods

- Figure out all the supported captcha tasks in [capsolver-npm#-native-methods](https://github.com/0qwertyy/capsolver-npm?tab=readme-ov-file#-native-methods).

#### Big Disclaimer

By using this package, you acknowledge and agree that:

- You are solely responsible for how you use the API and the author does not assume any liability for misuse, abuse, or violations of Capsolver’s terms of service.
- This package provides a service connector for the Capsolver API and is not affiliated.
