// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log, } from 'apify';
import { KeyValueListItem } from 'apify-client';
import { randomUUID } from 'crypto';
import { zipSync } from 'fflate';
import create from 'archiver';
import fs from 'fs';
import { KeyValueStoreRecord } from '@crawlee/types';
import { sliceArrayBySize } from './split-test.js';
// import * as tokenJson from "../storage/token.json"
await Actor.init();

let { APIFY_TOKEN, ExcludedStores, multi_zip = true, FILES_PER_ZIP = 100 } =
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


    async function writeManyZips() {
        // List all key-value stores

        let kvs_items = (await client.keyValueStores().list({
            // Optional limit and offset
            // offset: 1, limit: 1
        })).items
            .filter((item) => !excluded.includes(item.name ?? item.title ?? item.id));
        // Get the ID and list all keys of the key-value store
        // for await (const kvs of kvs_items) {
        for (let index = 0; index < kvs_items.length; index++) {
            const kvs = kvs_items[index];
            log.info(`Zipping ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
            // Split zip file into chunks to fit under the 9 MB limit

            console.log('Fetching items...');
            IteratorGetKVSValues(kvs.id, APIFY_TOKEN, FILES_PER_ZIP ?? 100);
        }

    }
}

async function* IteratorGetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });
    let ALL_ITEMS: Buffer[] = [];
    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;

    log.info(`Found ${count} total key(s)`)
    // let currentCount = 0;
    do {
        // Find a way to yield the images instead of waiting for all of them to be processed
        let [...images] = await loopItems(KVS_ID, items, client);

        let chunked = sliceArrayBySize(images)
        log.info(`Processing ${chunked.length} chunk(s)`)

        // DON'T DO THIS!
        await Promise.all(chunked.map((ch) => processParts(ch, `${KVS_ID}-${randomUUID()}`)))

        nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

        if (nextExclusiveStartKey !== null) {
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }
        else break

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
    return items
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
                archive.append(item.value, { name: `${item.key}` })
            }
        })

        await archive.finalize()
    })
    return Buffer.concat(buffers)
}
async function processParts(chunks: KeyValueStoreRecord[], nomDuFichier: string): Promise<void> {
    log.info(`Current # of items: ${chunks.length}`)

    let ff = await archiveKVS2(chunks);

    log.info(`Saving file ${nomDuFichier} to key-value store...`);
    await saveToKVS(ff, nomDuFichier).then(async () => {
        await Actor.pushData({
            download: (await Actor.openKeyValueStore()).getPublicUrl(nomDuFichier)
        })
    });
}
