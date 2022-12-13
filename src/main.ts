// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from 'apify';
import { KeyValueListItem } from 'apify-client';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { AsyncGzip } from 'fflate';
import fs from 'fs';
// import * as tokenJson from "../storage/token.json"
await Actor.init();
let EXCLUSIONS: string[] = [];

let { APIFY_TOKEN, ExcludedStores } =
// await Actor.getInput<any>()
{
    APIFY_TOKEN: undefined, ExcludedStores:
        [
            'concept-art', 'cute-funny-animals'
        ]
};

const excluded = EXCLUSIONS.concat(ExcludedStores ?? process.env.ExcludedStores ?? []);
const token = APIFY_TOKEN ?? process.env.APIFY_TOKEN ?? '';

console.log(`${ExcludedStores}`);

EXCLUSIONS.concat(ExcludedStores ?? []);

log.info(`Excluded stores: ${EXCLUSIONS}`);
if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    console.log('No APIFY_TOKEN provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
}

// export let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');

const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

// await downloadZip(client)
await zipToKVS(client
)
await Actor.exit()

async function zipToKVS(client: ApifyClient) {
    // let zip = new fflate.AsyncGzip({ level: 9, mem: 12, filename: 'hello.txt' });

    const gzs = new AsyncGzip({ level: 9, mem: 12, filename: 'hello.txt' });
    let wasCallbackCalled = false;
    let gzipData: any[] = []
    gzs.ondata = (err, chunk, _final) => {
        // Note the new err parameter
        if (err) {
            // Note that after this occurs, the stream becomes corrupt and must
            // be discarded. You can't continue pushing chunks and expect it to
            // work.
            console.error(err);
            return;
        }
        gzipData.push(chunk)
        wasCallbackCalled = true;
    }

    /*

    */

    // Read all key-value stores
    let kvs1 = await client.keyValueStores().list({ offset: 1, limit: 2 })
    // Read all keys of the key-value store
    let filteredActorKVSItem = kvs1.items.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""))
    for await (const kvs of filteredActorKVSItem) {

        // Get the ID and list all keys of the key-value store
        let fileName = "";
        let folderName = kvs.name ?? kvs.title ?? kvs.id;

        let item_names = await client.keyValueStore(kvs.id).listKeys({});
        let filteredKVSListItem = item_names.items
        log.info(`Zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`)
        // .filter((item) => is_excluded(item));
        for await (const kvsListItem of filteredKVSListItem) {
            // Get the record of each key
            const record = await client.keyValueStore(kvs.id).getRecord(kvsListItem.key);
            record?.key ? fileName = record?.key : fileName = randomUUID();
            // If the record is a file, download it and save it to the key-value store
            if (record?.contentType === 'image/jpeg' || record?.contentType === 'image/png') {
                const file = await client.keyValueStore(kvs.id).getRecord(kvsListItem.key);
                if (file && file?.value) {
                    const fName = `${folderName}/_${fileName ?? randomUUID()}.png`;

                    log.info(`Adding file ${fName} to zip file...`);
                    gzs.push(Buffer.from(file.value as string));

                    // is last item?
                    const listLength = filteredKVSListItem.length;
                    const lastItemPosition = filteredKVSListItem.indexOf(kvsListItem) === listLength - 1;
                    if (lastItemPosition) {
                        gzs.push(Buffer.from(file.value as string), true);
                    }
                }
            }
        };
        // Done zipping
        log.info(`Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`)

        // Get the name of the key-value store
        const kvsName = kvs.name ?? kvs.title ?? kvs.id;
        // Save the zip file to the key-value store
        log.info(`Saving zipped files to key-value store ${kvsName}...`)

        let zipStream = await new Blob(gzipData).stream();

        await Actor.setValue(`${randomUUID()}_${folderName}`, zipStream, { contentType: 'application/zip' })
        log.info(`Finished saving zipped files to key-value store ${kvsName}...`)


    }

    async function downloadZip(client: ApifyClient) {

        // const input =
        // {
        //     "keyValueStoreId": "7TxqCqthXuF9Qmykq",
        //     "filesPerZipFile": 1000
        // }
        log.info('Reading key value stores...');
        const accountKVS = await client.keyValueStores().list({});

        if (accountKVS.items.length == 0) {
            console.log('No key-value stores were found!');
            log.info('Abort...');
            return;
        }

        const keyValuesStoresResult = accountKVS.items;
        // Get the ID and compare the name of each key-value store and run the actor
        // if the name is not in the exclusion list (EXCLUSIONS)
        let [..._items] = keyValuesStoresResult.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""))
        // Get the difference between the original list and the filtered list
        const delta = keyValuesStoresResult.length - _items.length;

        if (delta > 0) {
            log.info(`Processing ${_items.length} key-value stores while excluding the following ${delta} key-value stores...`);
            log.info(`Excluded key-value stores: ${excluded.join("\n")}`)
        }
        let links: string[] = []
        for await (const i of _items) {
            const input = {
                "keyValueStoreId": i.id,
                "filesPerZipFile": 500
            }
            let kvsName = i.name ?? i.title ?? i.id;

            log.info(`Running actor on key-value store name: ${kvsName} with ID: ${i.id} ...`);
            const run = await client.actor("jaroslavhejlek/zip-key-value-store").call(input, { memory: 2048, timeout: 720 });
            log.info(`Actor finished with status: ${run.status}...`);
            log.info(`Retrieving results...`);
            const zipActorKVSID = run.defaultKeyValueStoreId;
            // const [...items] = (await client.dataset(run.defaultDatasetId).listItems()).items;
            const actorKVSKeys = (await client.keyValueStore(zipActorKVSID).listKeys()).items

            // make sure we don't download certain results
            let filteredActorKVSKeys = actorKVSKeys
                // .filter((i) => i.key !== "INPUT")
                .filter((i) => is_excluded(i))
            const zipActorKVS = client.keyValueStore(zipActorKVSID);
            const items = await Promise.all(filteredActorKVSKeys.map(i => zipActorKVS.getRecord(i.key)));

            const links = await Promise.all(items.map(async i => (await Actor.openKeyValueStore(zipActorKVSID)).getPublicUrl(i?.key ?? "")))

            log.info(`Retrieved ${items.length} result(s) for ${kvsName} from actor...`)

            log.info('Actor run finished...');

            // items.forEach((item: any) => {
            //     console.dir(item);
            // });
            log.info(`Results for ${kvsName} are in ${links.length} part(s)...`);
            let counter = 0;

            log.info(`Saving links...`)
            const kvs = await Actor.openKeyValueStore();
            // @ts-ignore
            // await kvs.setValue(`${kvsName ?? i.id}-links`, await links.join())
            await (await Actor.openDataset()).pushData({ links })

            links.push(...links)
            for await (const _link of links) {
                counter++;
                log.info(`You can download the results of ${kvsName} (part #${counter}) from the following link: \n> ${_link}`)
            }
            // console.dir((await Promise.resolve(links).then(l => l)).join("\n"))

            // // Open the default key-value store
            // // Save the results to the default key-value store
            log.info(`Saving results to default key-value store...`)
            const fileName = `${kvsName ?? i.id}.zip`;

            log.info(`Saving zipped files to default key-value store...`)
            for await (const i of items) {
                if (i?.value) {
                    await kvs.setValue(fileName, i?.value, { contentType: "application/zip" })
                        .then(() => {
                            log.info(`Saved ${fileName} to default key-value store...`)
                        }).catch((err) => log.error(err.message));
                }
            }
        }
        log.info(`${links}`);
    }
    function is_excluded(i: KeyValueListItem): boolean {
        log.info(`Checking if ${i.key} is excluded...`)
        if ('INPUT' == i.key) {
            // Ignored by default
            log.info(`Excluding ${i.key}...`)
            return false;
        }
        return !excluded.includes(i.key);
    }
}
