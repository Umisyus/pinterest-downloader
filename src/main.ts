// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, Configuration, Dataset, KeyValueStore, RequestQueue } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
// import * as tokenJson from "../storage/token.json"
await Actor.init()

const { APIFY_TOKEN, APIFY_USERNAME, DATASET_NAME }: { APIFY_TOKEN: string | null, APIFY_USERNAME: string, DATASET_NAME: string }
    = { APIFY_TOKEN: null, APIFY_USERNAME: "customary_plum", DATASET_NAME: "pinterest-json" } //await Actor.getInput<any>();
let token =
    // tokenJson.token ??
    APIFY_TOKEN ?? process.env.APIFY_TOKEN


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

export let imageKeyValueStore = await KeyValueStore.open('completed-downloads');
const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';

const dataSetName = `${APIFY_USERNAME}/${DATASET_NAME}`;
// '0UiUYmR0kikTmpgLX' ??

let config: Configuration = new Configuration();
config.set('token', token);

// var dataSet = await Actor.openDataset('0UiUYmR0kikTmpgLX'
//     // , { forceCloud: true }
// );

// const imageset = await dataSet.getData({

//     // fields: [
//     //     'images/orig/url',
//     //     'grid_title',
//     //     'id',
//     //     'board/name',
//     //     'board/url'
//     // ]
// });
export const imageset = (await (await Actor.openDataset('customary_plum/pinterest-json', { forceCloud: true })).getData({ limit: 10 })).items;

// console.log(dataSet);
export const startUrls: string[] = imageset.map((item: any) => item.images.orig.url);
console.log({ ...startUrls });


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
crawler.addRequests(startUrls.map((url) => ({ url })));

await crawler.run();

await Actor.exit()
