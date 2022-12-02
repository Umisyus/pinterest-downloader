// For more information, see https://crawlee.dev/
import { KeyValueStore, log, PlaywrightCrawler, PlaywrightCrawlingContext, PlaywrightHook, playwrightUtils, RequestQueue } from 'crawlee';
import { parsePinterestBoardJSON, router } from './routes.js';
import * as Playwright from 'playwright';
import { Actor, Dataset } from 'apify';
import { Datum } from './pin-board-data-type.js';
export const CRAWLEE_CONSTANTS = { datastorename: 'pinterest-json', reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin: "dlpin" };

const startUrls = ['https://pinterest.ca/dracana96/pins'];
const exportFileName = `unique-pins-export`;

// let kvs = await KeyValueStore.open(`${CRAWLEE_CONSTANTS.datastorename}`);
export let ds = await Dataset.open(CRAWLEE_CONSTANTS.datastorename);

const preNavigationHooks = [
    async (ctx: PlaywrightCrawlingContext) => {
        const page = ctx.page
        page.on('request', async (request: Playwright.Request) => {
            if (request.url().includes('UserPinsResource')) {

                log.debug(`XHR Request intercepted: ${request.url()}`);
                const response = await request.response();
                const body = await response?.json();
                if (body) {
                    log.debug(JSON.stringify(body, null, 2));
                    log.info(`Saving to dataset`);
                    let pinData = parsePinterestBoardJSON(body);

                    // await ds.pushData({ pins: pinData });
                    pinData.forEach(async (i) => {
                        // log.info(i.board_title);
                        // await kvs.setValue(`${CRAWLEE_CONSTANTS.datastorename}-${i.board_title.replace(/\s/g, '-')}`, i);
                        console.log(i.board_link)

                        let bname = i.board_link.pathname.split('/').filter(Boolean).slice(1, 3).join('-')
                        log.info(`Saving to board: ${bname}`);
                        await (await Dataset.open(bname)).pushData(i);
                    })
                    log.info(`Saved ${pinData.length} pins to dataset`);
                }
            }
        });
    }
];

await Actor.init()
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
    log.info('Done, will now exit...');
    await crawler.teardown()
});

await Actor.exit()
