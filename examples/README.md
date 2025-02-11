- This plugin is intended to provide solutions to DOM challenge implementations.
- The plugin is inteded to load another plugins on demand, find them in `src/features`.

### how to test

### steps

1. `git clone https://github.com/lfsaga/puppeteer-extra-plugin-capsolver && cd puppeteer-extra-plugin-capsolver`
2. `npm install && npm run build`
3. `cd examples && npm install`
4. `cp .env.example .env`
5. `nano .env` to set your `APIKEY`.

### usage

- test a single task (copy & paste from below)
  - `npm run test:load-extension`
  - `npm run test:call-task`
