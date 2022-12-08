// For more information, see https://crawlee.dev/
import { Actor, ApifyClient } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
await Actor.init()
const { APIFY_TOKEN, APIFY_USERNAME, DATASET_NAME } = await Actor.getInput<any>();

const client = new ApifyClient({ token: APIFY_TOKEN || process.env.APIFY_TOKEN });
client.baseUrl = 'https://api.apify.com/v2/';
if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    console.log('No APIFY_TOKEN provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
}

if (!APIFY_USERNAME && !process.env.APIFY_USERNAME) {
    console.log('No APIFY_USERNAME provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_USERNAME provided!' });
}
if (!DATASET_NAME && !process.env.DATASET_NAME) {
    console.log('No DATASET_NAME provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No DATASET_NAME provided!' });
}

const dataSetName = `${APIFY_USERNAME}/${DATASET_NAME}`;
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
