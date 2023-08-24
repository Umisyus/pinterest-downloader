// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, Dataset, KeyValueStore, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { getLocalFolderNames, zipKVS } from './zipKVS.js';
import path from 'path'
import fs from "fs";
await Actor.init()
export const storesToZip = []

// Test if folder exists
export const tempFilePath = '.cache';

if (!fs.existsSync(path.join(process.cwd(), tempFilePath))) {
    fs.mkdirSync(path.join(process.cwd(), tempFilePath));
}

type Input = {
    APIFY_TOKEN: string;
    FILES_PER_ZIP: number;
    MAX_SIZE_MB: number;
    ZIP_ExcludedStores: string[];
    ZIP_IncludedStores: string[];
    zip: boolean;
    DOWNLOAD_CONCURRENCY: number;
    DOWNLOAD_DELAY: number;
};

export const { APIFY_TOKEN = "", FILES_PER_ZIP = 500, MAX_SIZE_MB = 500, ZIP_ExcludedStores = [], ZIP_IncludedStores = [], zip = false, DOWNLOAD_CONCURRENCY = 2, DOWNLOAD_DELAY = 5 }
    = await Actor.getInput<Input>() satisfies Input;

const isAtHome = !Actor.isAtHome()

const token = (APIFY_TOKEN ?? process.env.APIFY_TOKEN) as string;

const client = new ApifyClient({ token });

await Actor.main(async () => {

    if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
        console.log('No APIFY_TOKEN provided!');
        await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
    }
    if (ZIP_IncludedStores.length < 1) {
        Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No stores to zip were provided!' });
    }

    // If a key-value store ID is provided, download from it
    if (zip) {
        await writeManyZips()
        await Actor.exit({ exit: true, exitCode: 0, statusMessage: 'Finished zipping all key-value stores!' });
    }

    await Actor.exit({ exit: true, exitCode: 0, statusMessage: 'Finished downloading all items!' })
        .then(() => process.exit(0));
});

/* Zip downloaded files in a store (local or remote) */
async function writeManyZips() {

    const remoteStoresNamesOrIDs: string[] = (await getKeyValueStoreList(client).catch(e => {
        console.error(e);
        return []
    })).map((s) => s.name ?? s.title ?? s.id) ?? [];

    let storeIDsFiltered = [];

    // See if there are any store IDs provided and download it
    if (ZIP_IncludedStores.length > 0) {
        storeIDsFiltered = ZIP_IncludedStores;
    } else {
        // Filter out any stores that are in the excluded list

        log.info("Fetching all remote key-value stores...");

        storeIDsFiltered = filterArrayByPartialMatch(remoteStoresNamesOrIDs, ZIP_ExcludedStores);
    }

    if (storeIDsFiltered.length > 0) {
        await onlineKVS(storeIDsFiltered);
    }

    ZIP_ExcludedStores.concat(['SDK', 'INPUT'])

    await printURLs({ excludedStores: ZIP_ExcludedStores });
    await saveURLsToDataset();
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

export interface KeyValueListItemType {
    key: string;
    size: number;
}

export async function getImageKVSKeys(kvsName: string): Promise<KeyValueListItemType[]> {
    console.log(`Getting data for key-value-store ${kvsName}`);
    let result = []
    try {
        if (isAtHome)
            result = await client.keyValueStore(kvsName).listKeys()
                .then(items => items.items ?? [])
        else {
            let keys = []
            let kvs = (await Actor.openKeyValueStore(kvsName))
            await kvs.forEachKey(
                async (key: string) => { keys.push(await kvs.getValue(key)) }
            )
            result = [...keys]
        }
    } catch (e: any) {
        console.error(`Could not get data from key-value-store ${kvsName}: ${e}`);
    }
    return result as KeyValueListItemType[]
}
async function saveURLsToDataset() {
    const defaultStore = await Actor.openKeyValueStore();

    let zippedKVSItems = [];
    // log.info(zippedKVSItems.length > 0 ? `Access your data from this URL:` : `Access your data from these URLs:`);

    await defaultStore.forEachKey(async (key: string) => {
        zippedKVSItems.push(key);
    });

    zippedKVSItems = filterArrayByPartialMatch(zippedKVSItems, ZIP_ExcludedStores)
    for await (const zippedItem of zippedKVSItems) {
        Actor.pushData({ url: defaultStore.getPublicUrl(zippedItem) })
    }
}
