// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from 'apify';
import { Configuration, PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { Input, Item } from './types.js';
import { PinData } from './Pinterest DataTypes.js';
// import * as tokenJson from "../storage/token.json"
await Actor.init()


const { APIFY_TOKEN, APIFY_USERNAME, DATASET_NAME, DOWNLOAD_LIMIT = undefined } = await Actor.getInput<any>();
let token = APIFY_TOKEN ?? process.env.APIFY_TOKEN

const client = new ApifyClient({ token });
const dataSetToDownload = APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME}` : DATASET_NAME;
const completedDownloads = 'completed-downloads';

export const getImageset = async (dataSetName: string = dataSetToDownload) =>
    await client.dataset(dataSetName).listItems({ limit: DOWNLOAD_LIMIT })
        //  (await ((await Actor.openDataset(dataSetName, {forceCloud: true,})).getData({ limit: DOWNLOAD_LIMIT }))
        .then((data) => data?.items as unknown as PinData[] ?? [])
        .catch(console.error)
export let imageDownloadStatusKeyValueStore = await KeyValueStore.open(completedDownloads);
export const pin_items: PinData[] = await getImageset(dataSetToDownload) ?? [];

await Actor.main(async () => {

    if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
        console.log('No APIFY_TOKEN provided!');
        await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
    }

    if (!DATASET_NAME && !process.env.DATASET_NAME) {
        console.log('No DATASET_NAME provided!');
        await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No DATASET_NAME provided!' });
    }

    let vals: string[] = []

    await imageDownloadStatusKeyValueStore
        .forEachKey(async (key) => {
            let value = await imageDownloadStatusKeyValueStore.getValue(key) as Item
            if (!(value?.isDownloaded) === true)
                vals.push(value?.url)
        })

    let startUrls: string[] = []
    try {
        // Extract all the image urls from the dataset
        // @ts-ignore
        // startUrls.map((item: PinData) => item?.images?.orig?.url)
        // startUrls = pin_items.map((item: PinData) => item?.images?.orig?.url)
        //     .filter(Boolean) ?? [];
        startUrls = vals
        log.info(`Total links: ${startUrls.length}`);
    } catch (e: any) {
        console.error(`Failed to read links: ${e}`)
    }

    // Filter out any pins already marked as downloaded
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
})

await Actor.exit()

// async function checkDownloaded(s: string) {
//     let datasetNames = (await client.keyValueStores().list({ unnamed: false })).items.map(d => d.name);
//     let boardNames = (await imageset).map(d => d.board.name);
//     const filtered_datasets = datasetNames.filter((name) => name !== undefined ? boardNames.includes(name) : undefined).filter(Boolean)
//     let [...pulled_sets] = await Promise.all(filtered_datasets.map(async (name) => (client.keyValueStore(name!))))
//     pulled_sets.filter(Boolean).map(async d => d)
//     let urls = startUrls
// }
