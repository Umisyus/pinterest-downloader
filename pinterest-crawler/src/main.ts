// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, PlaywrightHook, playwrightUtils, RequestQueue } from 'crawlee';
import { router } from './routes.js';
import * as Playwright from 'playwright';
export const CRAWLEE_CONSTANTS = { reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin: "dlpin" };

const startUrls = ['https://pinterest.ca/dracana96/pins'];

const crawler = new PlaywrightCrawler({
    headless: false,
    requestHandlerTimeoutSecs: 99_999,
    minConcurrency: 1,
    maxConcurrency: 3,
    maxRequestRetries: 3,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { persistStateKey: 'pinterest-data-crawlee', maxPoolSize: 10 },
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,

});
// Slow mode
// crawler.launchContext.launchOptions = { slowMo: 500 }

await crawler.addRequests(startUrls)

await crawler.run();
