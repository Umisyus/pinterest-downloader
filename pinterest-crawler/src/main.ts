// For more information, see https://crawlee.dev/
import { KeyValueStore, log, PlaywrightCrawler, PlaywrightCrawlingContext, PlaywrightHook, playwrightUtils, RequestQueue } from 'crawlee';
import { parsePinterestBoardJSON, router } from './routes.js';
import * as Playwright from 'playwright';
import { Actor, Dataset } from 'apify';
import { Datum } from './pin-board-data-type.js';
export const CRAWLEE_CONSTANTS = { datastorename: 'pinterest-json', reqQueue: "pinterest", login: 'login', board: "board", section: "section", pin: "pin", download_pin: "dlpin" };

const startUrls = ['https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2Fdracana96%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22dracana96%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D&_=1670391885387'];
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
// const crawler = new PlaywrightCrawler({
//     headless: true,
//     requestHandlerTimeoutSecs: 99_999,
//     minConcurrency: 1,
//     maxConcurrency: 1,
//     maxRequestRetries: 3,
//     useSessionPool: true,
//     persistCookiesPerSession: true,
//     sessionPoolOptions: { persistStateKey: 'pinterest-data-crawlee', maxPoolSize: 10 },
//     // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
//     requestHandler: router,
//     // preNavigationHooks: preNavigationHooks,

// });
// // Slow mode
// // crawler.launchContext.launchOptions = { slowMo: 500 }

// await crawler.addRequests(startUrls)

// await crawler.run().then(async () => {
//     log.info('Done, will now exit...');
//     await crawler.teardown()
// });
// NODE VERSION
let userName = 'USRENAME'
let pins_url_bookmark = (userName: string, bookmark: string) => `https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2F${userName}%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22${userName}%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%2C%22bookmarks%22%3A%5B%22${bookmark}%22%5D%7D%2C%22context%22%3A%7B%7D%7D&_=1670393784068`

let query = pins_url_bookmark(userName, '')
let list: any[] = []
let i = 0
let timer = setInterval(async () => {
    console.log(query)
    let response_json = await (await fetch(query)).json();
    let bookmark = response_json.resource.options.bookmarks[0];
    query = pins_url_bookmark(userName, bookmark)

    let pins = response_json.resource_response.data
    list.push(pins)

    console.log(`list length: ${list.length}`);
    log.info(`list length: ${list.length}`);

    if (bookmark.includes('end')) {
        console.log('end');

        ds.pushData((list.flat()))

        console.log("saved to file");
        clearInterval(timer)
        return
    }
    i++
}, 2000)

log.info('Done, will now exit...');

await Actor.exit()
