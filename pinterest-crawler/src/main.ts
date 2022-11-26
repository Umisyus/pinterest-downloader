// For more information, see https://crawlee.dev/
import { log, PlaywrightCrawler, PlaywrightCrawlingContext, PlaywrightHook, playwrightUtils, RequestQueue } from 'crawlee';
import { parsePinterestBoardJSON, router } from './routes.js';
import * as Playwright from 'playwright';
import { Dataset } from 'apify';
export const CRAWLEE_CONSTANTS = { reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin: "dlpin" };

const startUrls = ['https://pinterest.ca/dracana96/pins'];
export const ds = await Dataset.open('pinterest-json-test');

const preNavigationHooks = [
    async (ctx: PlaywrightCrawlingContext) => {
        const page = ctx.page
        page.on('request', async (request: Playwright.Request) => {
            if (request.url().includes('UserPinsResource')) {

                log.info(`XHR Request intercepted: ${request.url()}`);
                const response = await request.response();
                const body = await response?.json();
                if (body) {
                    console.log({ body });
                    log.info(`Saving to dataset`);
                    let parsed = parsePinterestBoardJSON(body);
                    console.log(`${(parsed)}`);
                    ds.pushData(parsed);
                }
            }
        });
    }
];
const crawler = new PlaywrightCrawler({
    headless: false,
    requestHandlerTimeoutSecs: 99_999,
    minConcurrency: 1,
    maxConcurrency: 1,
    maxRequestRetries: 3,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { persistStateKey: 'pinterest-data-crawlee', maxPoolSize: 10 },
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    preNavigationHooks: preNavigationHooks,

});
// Slow mode
// crawler.launchContext.launchOptions = { slowMo: 500 }

await crawler.addRequests(startUrls)

await crawler.run();
