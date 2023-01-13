
// Workers will work in almost any browser (even IE11!)
// However, they fail below Node v12 without the --experimental-worker
// CLI flag, and will fail entirely on Node below v10.
import { ApifyClient, log, Actor } from 'apify';
import { KeyValueListItem, KeyValueStoreRecord } from 'apify-client';
import fflate, { AsyncZipDeflate, AsyncZipOptions, AsyncZippable, strFromU8, strToU8, Zip, zip as zipCallback } from 'fflate';
import * as fs from 'fs';
import pako from 'pako';
import AdmZip from 'adm-zip'

import { delay, GetKVSValues2Test, sliceArrayBySize } from './split-test.js';
let KVS_ID = "concept-art"
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
    if (Actor.isAtHome()) {
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

        // let ALL_ITEMS: Buffer[] = [];
        let { nextExclusiveStartKey, items } = (await client.keyValueStore(kvs_id).listKeys({ limit: FILES_PER_ZIP }));
        let count = (await client.keyValueStore(kvs_id).listKeys({ limit: FILES_PER_ZIP })).count;
        log.info(`Found ${count} total key(s)`)

        do {
            /* Get images 200 keys at a time, zip & save */

            // Find a way to yield the images instead of waiting for all of them to be processed
            let split = sliceArrayBySize(items, 15)
            // Get all images from KVS
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
    // await Actor.exit()
}

export const zip = (
    data: AsyncZippable,
    options: AsyncZipOptions = { level: 0 }
): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            console.warn("err = ", err);
            console.log("data = ", data);
            if (err) return reject(err);
            return resolve(data);
        });
    });
};
const token = process.env.APIFY_TOKEN ?? fs.readFile('./storage/token.json', (_, data) => JSON.parse(data.toString()).token) ?? undefined
let f = GetKVSValues2Test2(KVS_ID, token)

// Generate structure of the zip file
let zipObj: any = {}

for await (const i of f) {
    for await (const ff of i) {
        // file name (string) : file contents (Buffer)
        zipObj[ff.key] = Uint8Array.from(((<any> ff.value).value.data))
    }
}

await zip(zipObj as AsyncZippable, { level: 6 })
    .then(async res => {
        log.info("Writing file to disk")
        await fs.promises.writeFile('hello.test.zip', (res))

            .then(async () => console.log("Written to disk"))
            .then(async () => await Actor.exit())
    })
