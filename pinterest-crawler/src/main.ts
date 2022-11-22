// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { router } from './routes.js';

export const CRAWLEE_CONSTANTS = { reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin:"dlpin" };

const startUrls = ['https://pinterest.ca/dracana96/'];


const crawler = new PlaywrightCrawler({
    headless: true,
    requestHandlerTimeoutSecs: 99_999,
    minConcurrency: 1,
    maxConcurrency: 3,
    maxRequestRetries: 3,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { persistStateKey: 'pinterest-data-crawlee', maxPoolSize: 10 },
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    // preNavigationHooks: [login],

});

// Slow mode
// crawler.launchContext.launchOptions = { slowMo: 500 }

await crawler.addRequests(startUrls)

await crawler.run();
