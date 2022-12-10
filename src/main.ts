// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, Configuration, Dataset, KeyValueStore, log, RequestQueue } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
// import * as tokenJson from "../storage/token.json"
await Actor.init()

const { APIFY_TOKEN, APIFY_USERNAME, DATASET_NAME }: { APIFY_TOKEN: string | null, APIFY_USERNAME: string, DATASET_NAME: string }
    = await Actor.getInput<any>();
let token =
    // tokenJson.token ??
    APIFY_TOKEN ?? process.env.APIFY_TOKEN


if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    console.log('No APIFY_TOKEN provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
}

if (!DATASET_NAME && !process.env.DATASET_NAME) {
    console.log('No DATASET_NAME provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No DATASET_NAME provided!' });
}

export let imageKeyValueStore = await KeyValueStore.open('completed-downloads');
const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

const dataSetName = APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME}` : DATASET_NAME;

export const imageset = (await (await Actor.openDataset(dataSetName, { forceCloud: true })).getData({ limit: 10 })).items;

export const startUrls: string[] = imageset.map((item: any) => item.images.orig.url);

log.info(`Total urls: ${startUrls.length}`);

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    maxConcurrency: 10,
    minConcurrency: 2,
    maxRequestRetries: 3,
    maxRequestsPerMinute: 100,
});

crawler.addRequests(startUrls.map((url) => ({ url })));

await crawler.run();

await Actor.exit()
