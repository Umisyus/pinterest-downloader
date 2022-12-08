// For more information, see https://crawlee.dev/
import { ApifyClient } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
const client = new ApifyClient();
client.token = process.env.APIFY_TOKEN;
client.baseUrl = 'https://api.apify.com/v2/';

var dataSet = await client.dataset('0UiUYmR0kikTmpgLX' ?? 'pinterest-json').listItems({
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

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    maxConcurrency: 5,
    minConcurrency: 1,
    maxRequestRetries: 3,
    // TEST
    maxRequestsPerCrawl: 100,
    maxRequestsPerMinute: 10
});

await crawler.run(startUrls);
