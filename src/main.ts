// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, Configuration, Dataset, DatasetContent, KeyValueStore, log, RequestQueue } from 'apify';
import { Dictionary, PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
// import * as tokenJson from "../storage/token.json"
await Actor.init()

const { APIFY_TOKEN, APIFY_USERNAME, DATASET_NAME, DOWNLOAD_LIMIT = 100 }: { APIFY_TOKEN: string, APIFY_USERNAME: string | undefined | null, DATASET_NAME: string, DOWNLOAD_LIMIT: number | undefined }
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

export let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');

let vals: any[] = []

// await imageDownloadStatusKeyValueStore
//     .forEachKey(async (key) => {
//         let value: any = await imageDownloadStatusKeyValueStore.getValue(key)
//         if (value?.isDownloaded)
//             vals.push(value.url)
//     })

const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

// const dataSetName = APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME}` : DATASET_NAME;

// export const imageset = ((await Actor.openDataset(dataSetName, { forceCloud: true })).getData({ limit: DOWNLOAD_LIMIT })).catch(console.error)
//     .then((data) => data?.items ?? []) ?? []

// let startUrls: string[] = []
// try {
//     // Extract all the image urls from the dataset
//     startUrls = ((await imageset))?.map((item: any) => item?.images?.orig?.url) ?? [];

//     log.info(`Total links: ${startUrls.length}`);
// } catch (e: any) {
//     console.error(`Failed to read links: ${e}`)
// }

// // Filter out any pins alreadym marked as downloaded
// let delta = startUrls.filter((url) => !vals.includes(url))
// log.info(`Total links downloaded: ${vals.length}`);
// log.info(`Total links to download: ${delta.length}`);
// startUrls = delta

// const crawler = new PlaywrightCrawler({
//     // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
//     requestHandler: router,
//     maxConcurrency: 10,
//     minConcurrency: 2,
//     maxRequestRetries: 3,
//     maxRequestsPerMinute: 100,
// });

// crawler.addRequests(startUrls.map((url) => ({ url })));
await downloadZip(client)
// await crawler.run(startUrls).then(()=>downloadZip(client));

await Actor.exit()

async function downloadZip(client) {

// Initialize the ApifyClient with API token
// const client = new ApifyClient({
//     token: '<YOUR_API_TOKEN>',
// });

// Prepare actor input

const input =
{
  "keyValueStoreId": "7TxqCqthXuF9Qmykq",
  "filesPerZipFile": 1000
}
const downloadsKVS = client.openKeyValueStore('')
await imageDownloadStatusKeyValueStore
    .forEachKey(async (key) => {
        let value: any = await imageDownloadStatusKeyValueStore.getValue(key)
        if (value?.isDownloaded)
            vals.push(value.url)
    })

(async () => {
    // Run the actor and wait for it to finish
    const run = await client.actor("jaroslavhejlek/zip-key-value-store").call(input);

    // Fetch and print actor results from the run's dataset (if any)
    console.log('Results from dataset');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    items.forEach((item) => {
        console.dir(item);
    });
})();
}