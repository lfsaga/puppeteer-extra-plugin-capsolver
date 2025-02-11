# puppeteer-extra-plugin-capsolver

manage to solve captcha challenges with puppeteer

- ❗ API key it's **required** [**Get here**](https://dashboard.capsolver.com/passport/register?inviteCode=CHhA_5os)

[![npm version](https://img.shields.io/npm/v/puppeteer-extra-plugin-capsolver)](https://www.npmjs.com/package/puppeteer-extra-plugin-capsolver)
[![](https://img.shields.io/badge/documentation-docs.capsolver.com-darkgreen)](https://docs.capsolver.com/guide/getting-started.html)

## Install

`npm i puppeteer puppeteer-extra puppeteer-extra-plugin-capsolver`

## Usage

#### Auto-load official Browser Extension

- **How it works?** This feature would auto-load the extension from a zipped file into static temp folder on your disk, then would load from there on demand refreshing `apiKey` on load.

- **How to use with from the plugin?**
  - Set `useExtension` on plugin init.
  - Control the extension with `await page.waitForSolverExtension({ timeout })`.

```typescript
puppeteer.use(
  new SolverPlugin({
    apiKey: process.env.APIKEY,
    useExtension: true, // # auto-loads browser extension
  })
);

// ...

await page.waitForSolverExtension({
  // timeout: 120000,
});
```

#### Common usage: call the API

- **How it works?** Make use of [`capsolver-npm`](https://github.com/lfsaga/capsolver-npm) package to perform API calls for solution retrieving.

- **How to use with from the plugin?**
  - Call to `await page.solver().<method>({})` from any Page.
  - See methods and it's usage [here](https://github.com/lfsaga/capsolver-npm?tab=readme-ov-file#-updated-examples).

```typescript
puppeteer.use(
  new SolverPlugin({
    apiKey: process.env.APIKEY,
  })
);

// ...

await page
  .solver()
  .recaptchav2classification({
    // ... parameters
  })
  .then((s: any) => {
    console.log(s);
  })
  .catch((e: SolverError) => {
    console.log(`Errored task Id: ${e.errorTaskId}`);
    console.log(`Error Code: ${e.errorCode}`);
    console.log(`Error description: ${e.errorDescription}`);
  });
```

## 📁 Updated examples

**Figure out [here](https://github.com/0qwertyy/puppeteer-extra-plugin-capsolver/tree/master/examples).**

#### Disclaimer

By using this package, you acknowledge and agree that:

- You are solely responsible for how you use the API and the author does not assume any liability for misuse, abuse, or violations of Capsolver’s terms of service.
- This package provides a service connector for the Capsolver API and is not affiliated.
