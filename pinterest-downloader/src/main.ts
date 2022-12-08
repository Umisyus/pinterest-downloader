// For more information, see https://crawlee.dev/
import { Actor, ApifyClient } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
const client = new ApifyClient({ token: process.env.APIFY_TOKEN || '' });
client.baseUrl = 'https://api.apify.com/v2/';
await Actor.init()

console.debug(process.env.APIFY_TOKEN?.slice(0, 10))
console.debug(client.token?.slice(0, 10))

const dataSetName = 'qBxQYcv2AN2xR5imr/pinterest-json';
// '0UiUYmR0kikTmpgLX' ??
var dataSet = await client.dataset(dataSetName)
    .listItems({
        // fields: [
        //     'images/orig/url',
        //     'grid_title',
        //     'id',
        //     'board/name',
        //     'board/url'
        // ]
    })

console.log(dataSet);
export const ds = dataSet;

const startUrls = dataSet.items.map((item: any) => item.images.orig.url);
console.log({ startUrls });

process.exit(0);
const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    maxConcurrency: 10,
    minConcurrency: 2,
    maxRequestRetries: 3,
    // TEST
    // maxRequestsPerCrawl: 100,
    maxRequestsPerMinute: 100,
});

await crawler.run(startUrls);

await Actor.exit()
