
import { ApifyClient, log, Actor } from "apify";
import { KeyValueListItem, KeyValueStoreRecord } from "apify-client";
import { chunk } from "crawlee";
import { Readable } from "stream";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import Promise from "bluebird";
import { DOWNLOAD_CONCURRENCY, getKeyValueStores } from "./main.js";

let ZIP_FILE_NAME = "";

export async function zipKVS(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    FILES_PER_ZIP: number = 500,
    MAX_ZIP_SIZE_MB: number = 250,
    isAtHome?: boolean
) {
    // Generate structure of the zip file
    FILES_PER_ZIP = (0 + FILES_PER_ZIP)

    log.info(`${isAtHome ? "On Apify" : "On local machine"}`);
    if (isAtHome) {
        await IteratorGetKVSValuesIterx(KVS_ID, API_TOKEN, MAX_ZIP_SIZE_MB, await getKeyValueStores());
    }
    else {
        await IteratorGetKVSValuesLocal(KVS_ID);
    }

}

export function bufferToStream(data: Buffer | Uint8Array) {
    let readableStream = new Readable({ autoDestroy: true });
    readableStream.push(data);

    readableStream.push(null);
    return readableStream;
}

/* Returns an array of KeyValueStoreRecords */
async function* loopItemsIterArray(
    KVS_ID: string,
    keys: KeyValueListItem[],
    client?: ApifyClient
): AsyncGenerator<KeyValueStoreRecord<Buffer>[]> {
    let items: KeyValueStoreRecord<any>[] = [];
    if (client) {
        let i = 0;
        for await (const it of keys) {
            await delay(0.2);
            const item = await client.keyValueStore(KVS_ID).getRecord(it.key!);
            if (item) {
                if ((<any> item.value)?.value?.data) {
                    item.value = (<any> item.value).value.data;
                }
                ++i;
                items.push(item);

                log.info(`#${i} of ${keys.length}`);
            }
        }
    }

    if (!client && !Actor.isAtHome()) {
        for await (const it of keys) {
            const item = await (await Actor.openKeyValueStore(KVS_ID)).getValue(it.key!)

            if (item) {
                items.push({ key: it, value: item as any } as unknown as KeyValueStoreRecord<any>);
            }
        }
    }
    yield items;
}
/* Returns one KeyValueStoreRecord */
async function* loopItemsIter(
    KVS_ID: string,
    keys: KeyValueListItem[],
    client?: ApifyClient
): AsyncGenerator<KeyValueStoreRecord<Buffer>> {
    if (client) {
        let i = 0;
        for await (const it of keys) {
            await delay(0.2);
            const item: KeyValueStoreRecord<any> = await client.keyValueStore(KVS_ID).getRecord(it.key!)

            if (item.value) {
                ++i;
                yield item;

                log.info(`#${i} of ${keys.length}`);
            }
        }
    }
}
// @ts-ignore
async function loopItemsIterAsync(
    KVS_ID: string,
    keys: KeyValueListItem[],
    client?: ApifyClient
) {
    let i = 0;
    for await (const it of keys) {
        await delay(0.2);
        const item: KeyValueStoreRecord<any> = await client.keyValueStore(KVS_ID).getRecord(it.key!)

        if (item.value) {
            ++i;
            log.info(`#${i} of ${keys.length}`);
            return item;
        }
    }
}




/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValues(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    FILES_PER_ZIP: number = 250,
    MAX_ZIP_SIZE_MB: number = 250
) {

    let client = new ApifyClient({ token: API_TOKEN });
    let kvs = (await client.keyValueStores().list()).items
        .find((k) => k.id === KVS_ID || k.name === KVS_ID || k.title === KVS_ID);
    let totalCount = 0;
    let runningCount = 0;

    try {
        let kvs_id = kvs ? (kvs.id ?? kvs.name ?? kvs.title) : KVS_ID;
        totalCount = (await client.keyValueStore(kvs_id).listKeys()).count;
        let { nextExclusiveStartKey, items: kvsItemKeys } = (await client.keyValueStore(kvs_id)
            .listKeys({ limit: FILES_PER_ZIP }));


        log.info(`Processing ${kvsItemKeys.length} of ${totalCount} total items.`)
        // Make code send collection where the size of the collection is the size of MAX_ZIP_SIZE_MB
        log.info(`Processing items totalling size of ${MAX_ZIP_SIZE_MB} MB`)
        let items: KeyValueStoreRecord<any>[] = []

        let currentSize = 0;

        do {
            // Find a way to yield the images instead of waiting for all of them to be processed
            let images = loopItemsIter(kvs_id, kvsItemKeys, client);

            for await (const i of images) {

                let value = (<any> i.value);
                // Get the size of the current item
                let size = value.length;
                // Add the size to the current size
                currentSize += size;
                // Add the item to the items array
                items.push(i);
                const isLimitReached = items.length >= FILES_PER_ZIP;
                // If the current size is greater than the max size, yield the items and reset the items array
                const isSizeLimitReached = currentSize >= MAX_ZIP_SIZE_MB * 1_000_000;

                console.log({ FILES_PER_ZIP });
                console.log({
                    itemCount: items.length,
                    isLimitReached,
                    currentSize,
                    isSizeLimitReached,
                });

                if (isLimitReached || isSizeLimitReached) {
                    // Yield the items then reset the items array
                    yield items;
                    // Yield the items then reset the items array
                    runningCount += items.length;
                    items = [];
                    currentSize = 0;

                }
            }

            if (
                nextExclusiveStartKey != undefined &&
                nextExclusiveStartKey != null &&
                nextExclusiveStartKey.length !== 0
            ) {


                // Get the next set of items and update the nextExclusiveStartKey
                let resp = await client.keyValueStore(kvs_id).listKeys({
                    exclusiveStartKey: nextExclusiveStartKey,
                    limit: FILES_PER_ZIP,
                });
                nextExclusiveStartKey = resp.nextExclusiveStartKey;

                // Update list of keys
                kvsItemKeys = resp.items;

                log.info(`Processed ${runningCount} of ${totalCount} items`);
            } else {
                // If there are no more items, yield the remaining items
                if (nextExclusiveStartKey === null && items.length > 0) {
                    yield items;
                }
                // Clear the items
                items = [];
                break;
            }
        } while (true);

        log.info(`Processed all items`);
        log.info(`Processed a total of ${runningCount} out of ${totalCount} items in ${kvs_id} (${KVS_ID})`);
    } catch (e) {
        log.error(e)
        await Actor.exit(e);
    }

}
/* Returns an array of values split by their size in megabytes. */
async function IteratorGetKVSValuesIterx(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    _MAX_ZIP_SIZE_MB: number = 500,
    kvs_list?: any[],
) {

    let client = new ApifyClient({ token: API_TOKEN });
    let kvs0 = kvs_list ?? (await client.keyValueStores().list()).items;
    let kvs = kvs0.find((k) => k.id === KVS_ID || k.name === KVS_ID || k.title === KVS_ID);
    let totalCount = 0;
    let runningCount = 0;

    try {
        let kvs_id = kvs ? (kvs.id ?? kvs.name ?? kvs.title) : KVS_ID;
        totalCount = (await client.keyValueStore(kvs_id).listKeys()).count;
        let { nextExclusiveStartKey, items: kvsItemKeys } = (await client.keyValueStore(kvs_id).listKeys());
        while (nextExclusiveStartKey) {
            if (
                nextExclusiveStartKey != undefined &&
                nextExclusiveStartKey != null &&
                nextExclusiveStartKey.length !== 0
            ) {
                // Get the next set of items and update the nextExclusiveStartKey
                let resp = await client.keyValueStore(kvs_id).listKeys({
                    exclusiveStartKey: nextExclusiveStartKey,
                });
                nextExclusiveStartKey = resp.nextExclusiveStartKey;

                // Update list of keys
                kvsItemKeys.push(...resp.items);

                log.info(`Processed ${runningCount} of ${totalCount} items`);
            } else {
                // If there are no more items, yield the remaining items
                if (nextExclusiveStartKey === null) {
                    break;
                }
            }
        }
        log.info(`Processing ${kvsItemKeys.length} of ${totalCount} total items.`)
        // Make code send collection where the size of the collection is the size of MAX_ZIP_SIZE_MB
        // log.info(`Processing items totalling size of ${MAX_ZIP_SIZE_MB} MB`)

        let i = 1;
        log.info("Generating zip file...");
        let maps = kvsItemKeys.map(async (key) => loopItemsIterAsync(kvs_id, [key], client))


        ZIP_FILE_NAME = `${KVS_ID}-${i}`;
        let zipFilePath = path.join(path.resolve('.'), ZIP_FILE_NAME);
        let output = fs.createWriteStream(zipFilePath);
        let zip = archiver.create("zip", { zlib: { level: 0 } });
        // Pipe archive data to the zip file
        zip.pipe(output);

        // Loop through the async items and add them to the zip file
        await Promise.map(maps, async (i) => {
            await delay(500);
            addToZip(i, zip);
        }, { concurrency: DOWNLOAD_CONCURRENCY ?? 1 });

        // do {

        // for await (const record of await images) {

        // file name (string) : file contents (Buffer)

        // }
        log.info(`Saved all items to zip file ${ZIP_FILE_NAME}`);
        log.info(`Saving zip file ${ZIP_FILE_NAME} to Apify...`);
        await zip.finalize().then(async () => {
            // output.close();

            let zipFileStream = fs.createReadStream(zipFilePath)
            await Actor.setValue(ZIP_FILE_NAME, zipFileStream, { contentType: "application/zip" })
                .then(() => {
                    output.close();
                    zipFileStream.close();
                    log.info(`Saved ${ZIP_FILE_NAME} to Apify.`)
                })

        })

        i++;

        // } while (true);
        // } while (items.length > 0);

        log.info(`Processed all items`);
        log.info(`Processed a total of ${runningCount} out of ${totalCount} items in ${kvs_id} (${KVS_ID})`);
    } catch (e) {
        log.error(e)
        await Actor.exit(e);
    }

}

function addToZip(record: KeyValueStoreRecord<any>, zip: archiver.Archiver) {
    let kvs_record: Buffer = record?.value ?? null;

    if (record.key && kvs_record) {
        // on apify
        log.info(`Writing ${record.key} to zip file...`);
        try {
            zip.append(bufferToStream(Buffer.from(kvs_record) as Buffer), { name: record.key });
        } catch (error) {
            console.error(error);
        }

    } else {
        log.info(`Skipping ${record.key}...`);
    }

    console.log(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);
}

/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValuesLocal(KVS_ID: string) {
    let client = await Actor.openKeyValueStore(KVS_ID);
    let localItems: any[] = [];
    function handleKey(key: string) {
        localItems.push({ key });
    }

    log.info("Getting keys...");
    // Get all keys
    await client.forEachKey(handleKey);

    let totalCount = localItems.length;
    // ZIP_FILE_NAME = KVS_ID;

    let runningCount = 0;

    do {
        let parcelList = chunk(localItems, 1000);
        // Find a way to yield the images instead of waiting for all of them to be processed
        for (let index = 0; index < parcelList.length; index++) {
            const element = parcelList[index];

            let images = loopItemsIterArray(KVS_ID, element);
            log.info(`Getting ${element.length} of ${localItems.length} images...`);
            for await (const i of images) {
                const chunked = sliceArrayBySize(i, 250);

                log.info(`Got ${i.length} images...`);

                log.info(`Processing ${chunked.length} chunk(s)`);
                let ii = 0;
                let l = chunked.length;

                // Duplicate the data
                // let mem = [...chunked[0].slice()]
                // let slicedValues = [...mem.slice().reverse()];
                // slicedValues.map(record => {
                //     record.key = randomUUID().slice(0, 5) + record.key
                //     return record
                // })
                // let arr = [slicedValues.concat(mem).reverse()]

                // for await (const ch of arr) {

                /*
                        Because the dataset is a lot of duplicate data with different names,
                        the data is saved duplicated with the above code. Otherwise, the data
                        is written as not duplicated. Use the above code to duplicate the data on local runs.
                        */
                for await (const ch of chunked) {
                    ii++;
                    yield ch;
                    runningCount += ch.length;
                    log.info(`Chunk #${ii} of ${runningCount}`);
                }
            }
        }
        log.info(`Processed ${runningCount} items`);
    } while (runningCount < totalCount);

    log.info(`Processed all local items`);
}

export function sliceArrayBySize(
    values: KeyValueStoreRecord<Buffer>[],
    maxSizeMB: number = 9.5
) {
    let totalSizeMB = 0;
    const slicedArrays = [];
    let slicedValues = [];
    for (const value of values) {
        const valueSizeMB = (<any> value.value)?.data?.length;
        if (totalSizeMB + valueSizeMB > maxSizeMB * 1_000_000) {
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
        // log.info(`Waiting ${s} second(s)`);
        setTimeout(() => {
            resolve();
        }, s * 1000);
    });
}
