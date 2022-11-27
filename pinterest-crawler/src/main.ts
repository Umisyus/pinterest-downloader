// For more information, see https://crawlee.dev/
import { KeyValueStore, log, PlaywrightCrawler, PlaywrightCrawlingContext, PlaywrightHook, playwrightUtils, RequestQueue } from 'crawlee';
import { parsePinterestBoardJSON, router } from './routes.js';
import * as Playwright from 'playwright';
import { Dataset } from 'apify';
export const CRAWLEE_CONSTANTS = { reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin: "dlpin" };

const startUrls = ['https://pinterest.ca/dracana96/pins'];
let kvs = await KeyValueStore.open('pinterest-json-test');
export let ds = await Dataset.open('pinterest-json-test');
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

                    parsed.forEach(async p =>
                        await kvs.setValue(p.pin_link.split('/')[4], p));
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

