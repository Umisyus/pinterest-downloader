// For more information, see https://crawlee.dev/
import { KeyValueStore, log, PlaywrightCrawler, PlaywrightCrawlingContext, PlaywrightHook, playwrightUtils, RequestQueue } from 'crawlee';
import { parsePinterestBoardJSON, router } from './routes.js';
import * as Playwright from 'playwright';
import { Dataset } from 'apify';
import { Datum } from './pin-board-data-type.js';
export const CRAWLEE_CONSTANTS = { datastorename: 'pinterest-json-test', reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin: "dlpin" };

const startUrls = ['https://pinterest.ca/dracana96/pins'];
const exportFileName = `unique-pins-export`;

let kvs = await KeyValueStore.open(`${CRAWLEE_CONSTANTS.datastorename}`);
export let ds = await Dataset.open(CRAWLEE_CONSTANTS.datastorename);
let d = await ds.getData()
console.log(JSON.stringify(d, null, 2));

const preNavigationHooks = [
    async (ctx: PlaywrightCrawlingContext) => {
        const page = ctx.page
        page.on('request', async (request: Playwright.Request) => {
            if (request.url().includes('UserPinsResource')) {

                log.info(`XHR Request intercepted: ${request.url()}`);
                const response = await request.response();
                const body = await response?.json();
                if (body) {
                    // .log({ body });
                    log.info(`Saving to dataset`);
                    let parsed = parsePinterestBoardJSON(body);

                    await ds.pushData(parsed);
                }
            }
        });
    }
];
const crawler = new PlaywrightCrawler({
    headless: true,
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

await crawler.run().then(async () => {
    log.info('Crawling finished, filtering duplicate data...');
    let filtered = (await ds.getData()).items
        .filter((item, index, dataset) => {
            const _thing = JSON.stringify(item);
            return index === dataset.findIndex(obj => {
                return JSON.stringify(obj) === _thing;
            });
        })
    let resultsDataset = await Dataset.open('pinterest-json-unique-results');
    await resultsDataset.pushData(filtered);

    console.log(`Found ${filtered.length} unique pins`);
    log.info('Exporting dataset...');
    await resultsDataset.exportToJSON(exportFileName);

    log.info('Done, will now exit...');
    await crawler.teardown()
});
