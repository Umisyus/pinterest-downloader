// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log, } from 'apify';
import { KeyValueListItem } from 'apify-client';
import { randomUUID } from 'crypto';
import { zipSync } from 'fflate';
import create from 'archiver';
import fs from 'fs';
import { KeyValueStoreRecord } from '@crawlee/types';
// import * as tokenJson from "../storage/token.json"
await Actor.init();

let { APIFY_TOKEN, ExcludedStores, multi_zip = true, FILES_PER_ZIP = 10 } =
// await Actor.getInput<any>()
{
    APIFY_TOKEN: undefined, ExcludedStores:
        [
            'completed-downloads'
            // 'concept-art', 'cute-funny-animals'
        ]
};

const excluded = new Array().concat(ExcludedStores ?? process.env.ExcludedStores as unknown as string[] ?? []);
const token = APIFY_TOKEN ?? process.env.APIFY_TOKEN ?? '';

log.info(`Excluded key-value stores: ${excluded.join(', ')}`);
if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    console.log('No APIFY_TOKEN provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
}

// export let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');

const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

await zipToKVS(client)
await Actor.exit()

async function zipToKVS(client: ApifyClient) {
    console.time('zipToKVS');
    if (multi_zip) {
        await writeManyZips();
    } else {
        await writeSingleZip();
    }
    console.timeEnd('zipToKVS');
    log.info('Finished zipping to key-value store!');

    function splitArray(array: any[], FILES_PER_ZIP: number = 50, MAX_SIZE_IN_BYTES = 9 * 1_000_000) {
        let results = [];

        for (var i = 0; i < array.length; i += FILES_PER_ZIP) {
            results.push(array.slice(i, i + FILES_PER_ZIP));
        }
        console.log(results.length);

        return results;
    }

    async function writeManyZips() {
        // List all key-value stores
        const defaultKVS = await Actor.openKeyValueStore()

        let kvs_items = (await client.keyValueStores().list({
            // Optional limit and offset
            offset: 1, limit: 1
        })).items
            .filter((item) => !excluded.includes(item.name ?? item.title ?? item.id));
        // Get the ID and list all keys of the key-value store
        // for await (const kvs of kvs_items) {
        for (let index = 0; index < kvs_items.length; index++) {
            const kvs = kvs_items[index];
            log.info(`Zipping ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
            let items: any[] = []
            // Split zip file into chunks to fit under the 9 MB limit

            console.log('Fetching items...');
            // let fromAPI = await getKVSValues(kvs.id, 50) as KeyValueStoreRecord[];
            // items.push(...fromAPI)

            // // slice the array into chunks based on the trasnfer size limit
            // // let a_chunks = chunkArray(items, FILES_PER_ZIP) as KeyValueStoreRecord[][];
            // let a_chunks = arraySplit(items) as KeyValueStoreRecord[][];

            // const entries = a_chunks.entries();
            // let split_length = [...entries].length;
            // log.info(`${items.length} files were split into ${split_length} chunks...`);
            let a_chunks = IteratorGetKVSValues(kvs.id, APIFY_TOKEN, 500);

            for await (const chunk of a_chunks) {
                log.info(`Current # of items: ${chunk.length}`)
                // Humans count from 1
                let nom = `${randomUUID()}-${kvs.name ?? kvs.title ?? kvs.id}-${index + 1}`
                log.info(`Zipping ${nom} key-value store...`);

                let ff = await archiveKVS2(chunk);

                console.log(ff.length);
                log.info(`Saving chunk #${index} as ${nom} to file system...`);

                log.info(`Saving chunk #${index} as ${nom} to key-value store...`);
                await saveToKVS(ff, nom).then(async () => {
                    await Actor.pushData({
                        download: defaultKVS.getPublicUrl(nom)
                    })
                });


            }
        }

    }
}
function arraySplit(array: KeyValueStoreRecord[], sizeLimit = 9 * 1_000_000) {
    let results: KeyValueStoreRecord[][] = []
    let chunk: KeyValueStoreRecord[] = []
    let sizeCount = 0;

    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        sizeCount += element.value.length;

        const bool = sizeCount < sizeLimit;

        if (bool) {
            chunk.push(element);
        } else {
            results.push((chunk as KeyValueStoreRecord[]))
            chunk = []
            sizeCount = 0;

        }
        if (index === array.length - 1 && sizeCount < sizeLimit) {
            // Find any unadded items
            if (array.flat().filter(o => !results.flat().includes(o))) {
                chunk = []
                chunk.push(...array.flat().filter(o => !results.flat().includes(o)))
                results.push(chunk)
            }
        }

    }
    return results;
}

async function getKVSValues(kvs_id: string, limit: number | undefined = undefined, lastKey?: string | undefined) {
    let items: any[] = [];

    let ii = (await client.keyValueStore(kvs_id).listKeys({ limit: limit, exclusiveStartKey: lastKey })).items
    for (let index = 0; index < ii.length; index++) {
        const key = ii[index].key;
        await new Promise<void>(resolve => setTimeout((resolve), 500));
        let v = await (client.keyValueStore(kvs_id)).getRecord(key);
        // wait 1 second to avoid rate limit
        // await new Promise<void>(resolve => setTimeout((resolve), 5000))
        console.log("Got item: " + v?.key);
        items.push(v);
    }

    return items;
}
async function GetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });
    let ALL_ITEMS: Buffer[] = [];
    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;
    log.info(`Found ${count} total key(s)`)
    do {

        let [...images] = [...(await loopItems(KVS_ID, items, client))];

        nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

        if (nextExclusiveStartKey !== null) {
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }
        else break

        let chunked = arraySplit(images)
        log.info(`Processing ${chunked.length} chunk(s)`)
        for await (const ch of chunked) {
            await archiveKVS2(ch).then(async (zip) => {

                if (zip) {
                    log.info(`Writing ${ch.length} key(s) to KVS`)
                    await Actor.setValue(`${KVS_ID}-${randomUUID()}`, zip, {
                        contentType: 'application/zip'
                    })
                }
            }).catch((err) => {
                console.log(err);
            })

        }

    } while (nextExclusiveStartKey)

    log.info(`Processed all items`)
    return ALL_ITEMS;
}
async function* IteratorGetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });
    let ALL_ITEMS: Buffer[] = [];
    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;
    log.info(`Found ${count} total key(s)`)
    do {

        let [...images] = [...(await loopItems(KVS_ID, items, client))];

        nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

        if (nextExclusiveStartKey !== null) {
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }
        else break

        let chunked = arraySplit(images)
        log.info(`Processing ${chunked.length} chunk(s)`)
        for await (const ch of chunked) {
            yield ch
        }

    } while (nextExclusiveStartKey)

    log.info(`Processed all items`)
    return ALL_ITEMS;
}
async function loopItems(KVS_ID: string, keys: KeyValueListItem[], client: ApifyClient) {
    let items: KeyValueStoreRecord[] = []
    for await (const it of keys) {
        await delay(0.2);
        items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
    }
    return items;
}
async function delay(s: number) {
    return new Promise<void>((resolve) => {
        log.info(`Waiting ${s} second(s)`);
        setTimeout(() => {
            resolve();
        }, s * 1000);
    });
}

async function writeSingleZip() {
    let toZip: any = {};
    let zipped: any = {};
    let folderName = "";
    let fileName = "";
    // Read all key-value stores
    let filteredActorKVSItem = await getKeyValueStoreList(client);

    for (let index = 0; index < filteredActorKVSItem.length; index++) {
        const kvs = filteredActorKVSItem[index];
        // Get the ID and list all keys of the key-value store
        fileName = "";
        folderName = kvs.name ?? kvs.title ?? kvs.id;

        let item_names = await client.keyValueStore(kvs.id).listKeys();
        let filteredKVSListItem = item_names.items.filter((item) => !excluded.includes(item.key));

        log.info(`Zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
        // .filter((item) => is_excluded(item));
        for (let index = 0; index < filteredKVSListItem.length; index++) {
            const kvsListItem = filteredKVSListItem[index];

            // Get the record of each key
            const record = await client.keyValueStore(kvs.id).getRecord(kvsListItem.key);
            record?.key ? fileName = record?.key : fileName = randomUUID();
            // If the record is a file, download it and save it to the key-value store
            // if (record?.contentType === 'image/jpg' || record?.contentType === 'image/jpeg' || record?.contentType === 'image/png') {
            const file = await client.keyValueStore(kvs.id).getRecord(kvsListItem.key);
            if (file && file?.value) {
                const fName = `${folderName}/_${fileName ?? randomUUID()}.png`;

                log.info(`Adding file ${fName} to zip file...`);
                // console.log(file.key, file.value);
                const buffered = Buffer.from((file.value as string), 'binary');
                toZip[`${folderName}/${([fName])}`] = [buffered];

                // log.info(`Finished adding file ${fName} to zip file...`);
            } else { log.info(`File ${fileName} is not a valid file!`); }

            log.info(`${index}/${filteredKVSListItem.length} files added to zip file...`);
        };

        zipped = zipSync(
            toZip
        );
        // Done zipping
        log.info(`Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
        console.log('Writing zip...');
        // Get the name of the key-value store
        // Do not reset the zip file

        saveToFS(zipped, undefined, `${folderName}.zip`);
    }

    const kvsName = folderName
    // Save the zip file to the key-value store
    log.info(`Saving zipped files to key-value store...`);
    saveToFS(zipped);
    // await Actor.setValue(`${randomUUID()}_${folderName}.zip`, zipped, { contentType: 'application/zip' })
    // await saveToKVS(zipped);

    log.info(`Finished saving zipped files to key-value store ${kvsName}...`);
}

function saveToFS(zipped: any, outFolder = 'images-folder', fileName = 'image-downloads.zip') {
    const path = `${outFolder}/${fileName}`;
    try {
        if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder);

        fs.writeFileSync(path, zipped, { encoding: 'binary' });
    }
    catch (e) {
        console.error(e)
    }

    console.log('Done!');
}


async function getKeyValueStoreList(client: ApifyClient) {
    let kvs1 = await client.keyValueStores().list();
    // Read all keys of the key-value store
    log.info(`Found key-value stores: \n${kvs1.items.join(', ')}`);

    let filteredActorKVSItem = kvs1.items.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""));
    log.info(`Filtered key-value stores: \n${filteredActorKVSItem.map(k => k.name).join(', ')}`);

    return filteredActorKVSItem;
}

async function saveToKVS(zipped: Buffer, fileName: string = "image_downloads") {
    log.info(`ZIP's NAME: ${fileName} Zip's LENGTH IN BYTES: ${zipped.length}`)
    await Actor.setValue(`${fileName}`, zipped, { contentType: 'application/zip' });
    log.info(`${fileName} was saved to KVS successfully!`)
}




async function archiveKVS2(imageArray: any[], _limit: number | undefined = FILES_PER_ZIP) {
    const buffers: Uint8Array[] = [];

    await new Promise<void>(async (resolve, reject) => {

        const archive = create('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('data', (chunk: Uint8Array) => {
            buffers.push(chunk)
        });

        archive.on('end', () => {
            console.log('End called');
            resolve();
        });

        archive.on('error', reject);
        // Append each file from the key-value store to the archive
        imageArray.forEach(async (item, index) => {

            if (!item.value || item.value.length < 1) { console.log(`#${index} was skipped because it was empty!`, item.value); }
            else {
                console.log(`Value is ${item.value.length} bytes`);

                archive.append(item.value, { name: `${item.key}` })
                log.info(`Added #${index + 1}: ${item.key} to archive...`);
            }
        })

        await archive.finalize()
    })
    return Buffer.concat(buffers)
}
