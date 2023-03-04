
import { ApifyClient, log, Actor } from "apify";
import { KeyValueListItem, KeyValueStoreRecord } from "apify-client";
import { AsyncZipOptions, AsyncZippable, strFromU8, strToU8, zip as zipCallback } from "fflate";
import { chunk } from "crawlee";
import { bufferToStream } from "./kvs-test.js";

let ZIP_FILE_NAME = "";

export async function zipKVS(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    FILES_PER_ZIP?: number,
    MAX_ZIP_SIZE_MB: number = 250,
    isAtHome?: boolean
) {
    let f: AsyncGenerator | any = null;
    // Generate structure of the zip file

    let i = 0;
    let zipObj: any = {};

    log.info(`${isAtHome ? "On Apify" : "On local machine"}`);
    if (isAtHome) {
        f = IteratorGetKVSValues(KVS_ID, API_TOKEN, FILES_PER_ZIP, MAX_ZIP_SIZE_MB);
    } else {
        f = IteratorGetKVSValuesLocal(KVS_ID);
    }

    for await (const records of f) {
        // file name (string) : file contents (Buffer)
        for await (const record of records) {
            let kvs_record: Buffer = record?.value ?? null;
            if (API_TOKEN || isAtHome == true) {

                if (record !== undefined && record.key !== undefined && kvs_record !== undefined && kvs_record !== null) {
                    // on apify
                    log.info(`Writing ${record.key} to zip file...`);
                    if (kvs_record instanceof Buffer)
                        zipObj[record.key] = Uint8Array.from(kvs_record as Buffer);

                    // else zipObj[record.key] = Buffer.from(strToU8(kvs_record)).toString()

                } else {
                    log.info(`Skipping record...`);
                }
            } else {
                // on local machine
                zipObj[record.key] = Uint8Array.from((<any> kvs_record).data);
            }
        }

        i++;
        log.info("Generating zip file...");
        await zip(zipObj as AsyncZippable).then(async (res) => {
            log.info("Writing file to Actor Key Value Store " + KVS_ID);
            const zip_file_name = `${ZIP_FILE_NAME ?? KVS_ID}-${i}`;

            let stream = bufferToStream(Buffer.from(res));

            await Actor.setValue(zip_file_name, stream, {
                contentType: "application/zip",
            });

            let url = (await Actor.openKeyValueStore()).getPublicUrl(KVS_ID);

            // log.info(`Saving ${zip_file_name} to disk...`);
            const compressedSizeMB = sizeInMB(res.length).toFixed(3)
            const originalSize = (<Array<string | Uint8Array>[]> Object.entries(zipObj)).map((x) => {
                return (x[1]) ? (x[1].length) : 0;
            }).reduce((a, b) => a + b, 0);
            let originalSizeMB = sizeInMB(originalSize).toFixed(3)

            log.info(`Saved zip as ${zip_file_name}.zip to ${url}`);

            await Actor.pushData({
                name: `${zip_file_name}`,
                link: url,
                metaData: {
                    beforeCompression: originalSizeMB,
                    afterCompression: compressedSizeMB,
                    itemCount: Object.entries(zipObj).length ?? "Unknown"
                }
            });

            log.info(`FILE ${zip_file_name} SIZE: ${compressedSizeMB} MB (${res.length} BYTES)`);

            // await saveToFS(res, "archives", zip_file_name); // WORKS!
        });
        zipObj = {};
    }
}

function sizeInMB(res: number) {
    return res / 1024 / 1024;
}

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
                items.push(item as KeyValueStoreRecord<any>);
            }
        }
    }
    yield items;
}

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


export function zip(
    data: AsyncZippable,
    options: AsyncZipOptions = {}
): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValues(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    FILES_PER_ZIP?: number,
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

        ZIP_FILE_NAME = (kvs?.name ?? kvs?.title ?? kvs?.id) ?? KVS_ID


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
                const isLimitReached = items.length >= (FILES_PER_ZIP ?? totalCount);
                // If the current size is greater than the max size, yield the items and reset the items array
                const isSizeLimitReached = currentSize >= MAX_ZIP_SIZE_MB * 1_000_000;

                // console.log({ FILES_PER_ZIP });
                //   console.log({
                //     itemCount: items.length,
                //     isLimitReached,
                //     currentSize,
                //     isSizeLimitReached,
                //   });

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
        // } while (items.length > 0);

        log.info(`Processed all items`);
        log.info(`Processed a total of ${runningCount} out of ${totalCount} items in ${ZIP_FILE_NAME} (${KVS_ID})`);
    } catch (e) {
        log.error(e)
        await Actor.exit(e);
    }

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
    ZIP_FILE_NAME = KVS_ID;

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
