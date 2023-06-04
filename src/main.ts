// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, Configuration, Dataset, DatasetContent, KeyValueStore, log, RequestQueue } from 'apify';
import { Dictionary, PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
// import * as tokenJson from "../storage/token.json"
await Actor.init()

const { APIFY_TOKEN, APIFY_USERNAME, DATASET_NAME, DOWNLOAD_LIMIT = 100, check_completed = false }: { APIFY_TOKEN: string, APIFY_USERNAME: string | undefined | null, DATASET_NAME: string, DOWNLOAD_LIMIT: number | undefined, check_completed: boolean }
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

let vals: any[] = []

if (check_completed) {
    let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');
    await imageDownloadStatusKeyValueStore
        .forEachKey(async (key) => {
            let value: any = await imageDownloadStatusKeyValueStore.getValue(key)
            if (value?.isDownloaded)
                vals.push(value.url)
        })
}
const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

const dataSetName = APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME}` : DATASET_NAME;

export const imageset = ((await Actor.openDataset(dataSetName, { forceCloud: true })).getData({ limit: DOWNLOAD_LIMIT })).catch(console.error)
    .then((data) => data?.items ?? []) ?? []

let startUrls: string[] = []
try {
    // Extract all the image urls from the dataset
    startUrls = ((await imageset))?.map((item: any) => item?.images?.orig?.url) ?? [];

    log.info(`Total links: ${startUrls.length}`);
} catch (e: any) {
    console.error(`Failed to read links: ${e}`)
}

// Filter out any pins alreadym marked as downloaded
let delta = startUrls.filter((url) => !vals.includes(url))
log.info(`Total links downloaded: ${vals.length}`);
log.info(`Total links to download: ${delta.length}`);
startUrls = delta

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    maxConcurrency: 10,
    minConcurrency: 2,
    maxRequestRetries: 3,
    maxRequestsPerMinute: 100,
});

// crawler.addRequests(startUrls.map((url) => ({ url })));

await crawler.run(startUrls);

await Actor.exit()

// async function checkDownloaded(s: string) {
//     let datasetNames = (await client.keyValueStores().list({ unnamed: false })).items.map(d => d.name);
//     let boardNames = (await imageset).map(d => d.board.name);
//     const filtered_datasets = datasetNames.filter((name) => name !== undefined ? boardNames.includes(name) : undefined).filter(Boolean)
//     let [...pulled_sets] = await Promise.all(filtered_datasets.map(async (name) => (client.keyValueStore(name!))))
//     pulled_sets.filter(Boolean).map(async d => d)
//     let urls = startUrls
// }
