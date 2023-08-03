// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, Dataset, KeyValueStore, log } from 'apify';
import { PlaywrightCrawler, keys } from 'crawlee';
import { router } from './routes.js';
import { Item } from './types.js';
import { PinData } from './Pinterest DataTypes.js';
import { getLocalFolderNames, zipKVS } from './zipKVS.js';
import path from 'path'
import fs from 'fs'

await Actor.init()

export let { APIFY_TOKEN = "", APIFY_USERNAME = "", DATASET_NAME = "", DOWNLOAD = false, FILES_PER_ZIP = 500, MAX_SIZE_MB = 500, MAX_FILE_DOWNLOAD, ZIP_ExcludedStores = [], ZIP_IncludedStores = [], zip = false, DOWNLOAD_CONCURRENCY = 2, DOWNLOAD_DELAY = 500 } = await Actor.getInput<any>();

const isAtHome = !Actor.isAtHome()
FILES_PER_ZIP = (0 + FILES_PER_ZIP)

const completedDownloads = 'completed-downloads';
export let imageDownloadStatusKeyValueStore = await KeyValueStore.open(completedDownloads);

export let pin_items: PinData[] = []

const token = (APIFY_TOKEN ?? process.env.APIFY_TOKEN) as string;

const client = new ApifyClient({ token });
const dataSetToDownload = (APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME}` : DATASET_NAME) as string;

await Actor.main(async () => {
    // If a key-value store ID is provided, download from it
    if (zip && (DOWNLOAD === false)) {
        await writeManyZips()
        await Actor.exit({ exit: true, exitCode: 0, statusMessage: 'Finished zipping all key-value stores!' });
    }

    if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
        console.log('No APIFY_TOKEN provided!');
        await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
    }
    if (!DATASET_NAME && !process.env.DATASET_NAME) {
        console.log('No DATASET_NAME provided!');
        await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No DATASET_NAME provided!' });
    }

    if (zip && DOWNLOAD) {
        // DROP EXISTING KVS
        let kvsNames = getLocalFolderNames().map((folderName) => path.basename(folderName))
        kvsNames = filterArrayByPartialMatch(kvsNames, ZIP_ExcludedStores)
        kvsNames.forEach(async (kvsName) => {
            console.log(`Dropping ${kvsName}...`);

            let kvs = await KeyValueStore.open(kvsName);
            await kvs.drop();
        })
    }
    if (DOWNLOAD) {

        /* a dataset item must be pinterest json, a key value store item must be image buffer */

        pin_items = (await getImageset(dataSetToDownload) ?? [])
        pin_items = pin_items.flat()

        log.info(`Total items: ${pin_items.length}`);
        log.info(`Filtering results...`);

        // Filter duplicates
        pin_items = pin_items.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.id === item.id
            )))

        if (pin_items.length === 0) {
            console.error(`Could not get data from ${dataSetToDownload}!
        Try using your APIFY_TOKEN and DATASET_NAME and APIFY_USERNAME as input or set them as environment variables.
        If the key-value store has a name, try to use the ID of the key-value store instead of it's name as input.
        `);

            if (zip) {
                console.log(`Proceeding to download and zip from all other key-value stores...`);
            }

        }

        let completedItems: string[] = []
        let startUrls: string[] = []

        try {

            // startUrls = pin_items.slice(0, MAX_FILE_DOWNLOAD)
            startUrls = pin_items.map((item) => item.images.orig.url);

            // Filter out any pins already marked as downloaded
            /* NOTE: after downloading all items the completed downloads may be reset */
            await imageDownloadStatusKeyValueStore
                .forEachKey(async (key) => {
                    let value = await imageDownloadStatusKeyValueStore.getValue(key) as string

                    // If NOT downloaded, add to the list of urls to download

                    completedItems.push(value)
                })

            await (await Dataset.open(completedDownloads)).forEach((p: { id: string, url: string }) => {
                startUrls = startUrls.filter((url) => url !== p.url)
            });

            if (completedItems.length > 0) {
                // Filter out any pins already marked as downloaded
                let delta = startUrls.filter((url) => !completedItems.includes(url))
                startUrls = delta
            }

            log.info(`Total links downloaded: ${completedItems.length}`);
            log.info(`Total links to download: ${startUrls.length}`);
        } catch (e: any) {
            console.error(`Failed to read links: ${e}`)
        }

        const crawler = new PlaywrightCrawler({
            requestHandler: router,
            maxConcurrency: 10,
            minConcurrency: 2,
            maxRequestRetries: 3,
            maxRequestsPerMinute: 100,
        });
        if (DOWNLOAD) {
            await crawler.run(startUrls)
        }
    }
    if (zip) {
        await writeManyZips()
    }
});

/* Zip downloaded files in a store (local or remote) */
async function writeManyZips() {
    let stores: string[] = [];
    let remoteStoresNamesOrIDs: string[] = (await getKeyValueStoreList(client).catch(e => {
        console.error(e);
        return []
    })).map(s => s.name ?? s.title ?? s.id) ?? [];

    if (isAtHome) {
        let storeIDsFiltered = [];

        // See if there are any store IDs provided and download it
        if (ZIP_IncludedStores.length > 0) {
            storeIDsFiltered = ZIP_IncludedStores;
        }
        else {
            // Filter out any stores that are in the excluded list
            if (DOWNLOAD) {
                log.info("Fetching all local key-value stores...");
                storeIDsFiltered = filterArrayByPartialMatch(getLocalFolderNames().map(s => path.basename(s)), ZIP_ExcludedStores);
            }
            log.info("Fetching all remote key-value stores...");

            storeIDsFiltered = filterArrayByPartialMatch(remoteStoresNamesOrIDs, ZIP_ExcludedStores);
        }

        if (storeIDsFiltered.length > 0) {
            await onlineKVS(storeIDsFiltered);
        } else {
            log.info("No KVS ID was provided...");
            log.info("Fetching all remote key-value stores...");

            await onlineKVS(remoteStoresNamesOrIDs);
        }

        await printURLs({ excludedStores: ZIP_ExcludedStores ?? ['SDK', 'INPUT'] });
        await saveURLsToDataset();
    } else {
        // Locally
        // Get items either from the listed stores or from the default store

        if (ZIP_IncludedStores.length > 0) {
            stores.push(...ZIP_IncludedStores);
        }
        else {
            log.info("No KVS ID was provided...");
            log.info("Fetching all key-value stores...");
            stores = fs.readdirSync(path.join(process.cwd(), 'storage', 'key_value_stores'))
                .map((item: string) => path.basename(item));
        }
        stores = filterArrayByPartialMatch(stores, ZIP_ExcludedStores);

        await localKVS(stores);

        printDirs(stores)
    }

}

function printDirs(stores: string[]) {
    return stores.map((s: string) => `Access your data of ${s} from this directory: ${path.join(process.cwd(), 'storage', 'key_value_stores', s)}`)
}

export async function getKeyValueStores() {
    return (await client.keyValueStores().list()).items;
}

export function filterArrayByPartialMatch(mainArray: string[], filterArray: string[]) {
    return mainArray.filter((element: string | any[]) => {
        // Check if any element in filterArray partially matches the current element in mainArray
        return !filterArray.some((filterElement: any) => element.includes(filterElement));
    });
}


async function printURLs({ excludedStores = [] }: { excludedStores?: string[] } = {}) {
    let kvStores = await Actor.openKeyValueStore();

    let kvsURLs = [];
    log.info(kvsURLs.length > 0 ? `Access your data from this URL:` : `Access your data from these URLs:`);

    await kvStores.forEachKey(async (key: string) => {
        kvsURLs.push(key);
    });
    kvsURLs = filterArrayByPartialMatch(kvsURLs, excludedStores)

    console.log('Download your data from:');
    kvsURLs.map((key: string, ind) => console.log(`#${++ind} ⫸ ${key}: ${(kvStores).getPublicUrl(key)}`));
}

async function localKVS(store: any[]) {

    log.info(`Zipping ${store.length} key-value stores...`);

    printNumberedList(store);

    for (let index = 0; index < store.length; index++) {
        const element = store[index];
        console.log("Fetching local items...");
        await zipKVS(element, undefined, FILES_PER_ZIP, MAX_SIZE_MB, isAtHome);
    }
}

async function onlineKVS(stores: any[]) {
    printNumberedList(stores.map((i) => i.name ?? i.title ?? i.id ?? i));

    // Get the ID and list all keys of the key-value store
    for (let index = 0; index < stores.length; index++) {
        const kvs = stores[index];
        const remoteKVSID = kvs.name ?? kvs.title ?? kvs.id ?? kvs;
        log.info(`Zipping '${remoteKVSID}' key-value store...`);
        // Split zip file into chunks to fit under the 9 MB limit
        console.log("Fetching items...");
        await zipKVS(remoteKVSID, APIFY_TOKEN, FILES_PER_ZIP, MAX_SIZE_MB, isAtHome);
    }
}

function printNumberedList(store: string[]) {
    log.info(`List:` + `\n` + `${store.map((i, ii) => `#${1 + ii}: ${i}`).join(",\n")}`);
}


async function getKeyValueStoreList(client: ApifyClient) {
    let kvs1 = await client.keyValueStores().list();
    // Read all of the key-value store name
    let filteredActorKVSItem = kvs1.items.filter(
        (kvs) => !ZIP_ExcludedStores.includes(kvs.name ?? kvs.title ?? "")
    );
    return filteredActorKVSItem;
}

export async function getImageset(dataSetName: string = dataSetToDownload): Promise<PinData[]> {
    console.log(`Getting data for dataset ${dataSetName}`);
    let result: PinData[] = []
    try {
        if (isAtHome) {

            result = [...await client.dataset(dataSetName).listItems()
                .then((data) => data?.items ?? [])] as unknown as PinData[];

        } else {
            result = [...(await (await Actor.openDataset(dataSetName)).getData()).items] as PinData[];
        }
    } catch (e: any) {
        console.error(`Could not get data from dataset ${dataSetName}: ${e}`);

        return result;
    }
    return result
}

interface KeyValueListItemType {
    key: string;
    size: number;
}

export async function getImageKVSKeys(kvsName: string = dataSetToDownload): Promise<KeyValueListItemType[]> {
    console.log(`Getting data for key-value-store ${kvsName}`);
    let result = []
    try {
        if (isAtHome)
            result = await client.keyValueStore(kvsName).listKeys()
                .then(items => items.items as unknown as PinData[] ?? [])
        else {
            let keys = []
            let kvs = (await Actor.openKeyValueStore(kvsName))
            await kvs.forEachKey(
                async (key: string) => { keys.push(await kvs.getValue(key)) }
            )
            result = [...keys]
        }
    } catch (e: any) {
        console.error(`Could not get data from key-value-store ${dataSetToDownload}: ${e}`);
    }
    return result as KeyValueListItemType[]
}
async function saveURLsToDataset() {
    let kvStores = await Actor.openKeyValueStore();

    let kvsURLs = [];
    log.info(kvsURLs.length > 0 ? `Access your data from this URL:` : `Access your data from these URLs:`);

    await kvStores.forEachKey(async (key: string) => {
        kvsURLs.push(key);
    });
    kvsURLs = filterArrayByPartialMatch(kvsURLs, ZIP_ExcludedStores)
    for await (const k of kvsURLs) {
        Actor.pushData({ url: kvStores.getPublicUrl(k) })
    }
}
