import { ApifyClient, log, Actor, KeyValueStore } from 'apify';
import { KeyValueListItem, KeyValueStoreRecord } from 'apify-client';
import { AsyncZipOptions, AsyncZippable, zip as zipCallback } from 'fflate';
import * as fs from 'fs';
import { chunk } from 'crawlee';

let KVS_ID = "data-kvs"

async function* loopItemsIterArray(KVS_ID: string, keys: KeyValueListItem[], client?: ApifyClient) {
    let items: KeyValueStoreRecord<Buffer>[] = []
    if (client) {
        for await (const it of keys) {
            await delay(0.2);
            // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
            items.push(await client.keyValueStore(KVS_ID).getRecord(it.key!) as KeyValueStoreRecord<any>);
        }
    }

    if (!client && !Actor.isAtHome()) {
        for await (const it of keys) {
            // await delay(0.2);
            // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
            items.push(await (await Actor.openKeyValueStore(KVS_ID)).getValue(it.key!) as KeyValueStoreRecord<Buffer>);
        }
    }
    yield items
}
export async function* GetKVSValues2Test2(KVS_ID: string, APIFY_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let keys: { key: string }[] = []
    if (!Actor.isAtHome()) {
        log.info("Reading from local KVS...")

        let kvs = await Actor.openKeyValueStore(KVS_ID)
            .catch(() => console.error("Could not open local store!"));

        await kvs?.forEachKey(async (k) => {
            keys.push({ key: k })
        })

        // Loop over items from local KVS
        yield (await loopItemsIterArray(KVS_ID, keys as KeyValueListItem[]).next()).value as KeyValueStoreRecord<Buffer>[]

    } else {
        log.info("Reading from remote KVS...")
        let client = new ApifyClient({
            token: APIFY_TOKEN
        });

        /*
        CLIENT KVS LIST KEYS
        GET FIRST KVS ID
        */

        let list = await client.keyValueStores().list()
        let itemsz = list.items
        console.log(itemsz.map(({ name, title, username, id }) => ({ name, title, username, id })));
        let kvs_id = itemsz[0].id

        let remote_store = client.keyValueStore(kvs_id);
        let { nextExclusiveStartKey, items } = (await remote_store.listKeys({ limit: FILES_PER_ZIP = 100 }));
        let count = (await remote_store.listKeys({ limit: FILES_PER_ZIP })).count;
        log.info(`Found ${count} total key(s)`)

        do {
            let split = chunk(items, FILES_PER_ZIP)

            // Get all images from KVS
            log.info(`Processing ${items.length} set(s) of ${FILES_PER_ZIP} items...`)

            for await (const e of split) {
                // yield (await loopItemsIterArray(KVS_ID, e, client).next())
                yield (await loopItemsIterArray(kvs_id, e as KeyValueListItem[], client).next()).value as KeyValueStoreRecord<Buffer>[]
            }

            if (nextExclusiveStartKey !== null) {
                nextExclusiveStartKey = ((await (client.keyValueStore(kvs_id).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

                items = ((await (client.keyValueStore(kvs_id).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
            }
            else break

        } while (nextExclusiveStartKey !== null)
    }
    log.info(`Processed all items`)
}

export function zip(
    data: AsyncZippable,
    options: AsyncZipOptions = { level: 0 }
): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            console.warn("err = ", err);
            console.log("data = ", data);
            if (err) return reject(err);
            return resolve(data);
        });
    });
};
export async function* IteratorGetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });

    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;
    let index = 0;

    log.info(`Found ${count} total key(s)`)
    // let currentCount = 0;
    do {
        // Find a way to yield the images instead of waiting for all of them to be processed
        let images = loopItemsIterArray(KVS_ID, items, client);

        for await (const i of images) {

            let chunked = sliceArrayBySize(i)
            log.info(`Processing ${chunked.length} chunk(s)`)
            // DON'T DO THIS!
            // await Promise.all(chunked.map((ch) => processParts(ch, `${KVS_ID}-${randomUUID()}-${index++}`)))
            for await (const ch of chunked) {
                yield ch
            }
        }

        if (nextExclusiveStartKey !== null) {
            nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }
        else break

    } while (nextExclusiveStartKey)

    log.info(`Processed all items`)
    index = 0
}

export function sliceArrayBySize(values: KeyValueStoreRecord<Buffer>[], maxSizeMB: number = 9.5) {
    let totalSizeMB = 0;
    const slicedArrays = [];
    let slicedValues = [];
    for (const value of values) {
        const valueSizeMB = value.value.length;
        if (totalSizeMB + valueSizeMB > (maxSizeMB * 1_000_000)) {
            slicedArrays.push(slicedValues);
            slicedValues = [];
            totalSizeMB = 0;
        }
        slicedValues.push(value);
        totalSizeMB += valueSizeMB;
    }
    if (slicedValues.length > 0) {
        slicedArrays.push(slicedValues);
    }
    return slicedArrays;
}

export async function delay(s: number) {
    return new Promise<void>((resolve) => {
        log.info(`Waiting ${s} second(s)`);
        setTimeout(() => {
            resolve();
        }, s * 1000);
    });
}

log.info("Starting script")
await Actor.init()
// KeyValueStore.open(KVS_ID).then(async (store) => await store.setValue("test", "test"))
log.info("Reading token from file")
const token = (process.env.APIFY_TOKEN ??
    fs.readFile('./storage/token.json', (_, data) =>
        data ? JSON.parse(data.toString()).token : undefined)) ?? undefined

// let f = IteratorGetKVSValues(KVS_ID, token)
let f = GetKVSValues2Test2(KVS_ID, token)

// Generate structure of the zip file
let zipObj: any = {}

for await (const i of f) {
    for await (const ff of i) {
        // file name (string) : file contents (Buffer)
        zipObj[ff.key] = Uint8Array.from(((<any>ff.value).data))
    }
}

await zip(zipObj as AsyncZippable, { level: 9 })
    .then(async res => {
        log.info("Writing file to disk")
        await fs.promises.writeFile(`${KVS_ID}.test.zip`, res)

            .then(async () => console.log("Written to disk"))

        log.info("Writing file to KVS")
        await KeyValueStore.open("test-zip-kvs")
            .then(async (store) => await store.setValue("test", Buffer.from(res), { contentType: "application/zip" }))
            .then(() => log.info("Written to KVS"))
            .finally(async () => await Actor.exit())
    })
