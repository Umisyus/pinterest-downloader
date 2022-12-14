// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from 'apify';
import { KeyValueListItem } from 'apify-client';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { AsyncGzip, strToU8, zipSync } from 'fflate';
import fs from 'fs';
// import * as tokenJson from "../storage/token.json"
await Actor.init();

let { APIFY_TOKEN, ExcludedStores } =
// await Actor.getInput<any>()
{
    APIFY_TOKEN: undefined, ExcludedStores:
        [
            // 'concept-art', 'cute-funny-animals'
        ]
};

const excluded = new Array().concat(ExcludedStores ?? process.env.ExcludedStores as unknown as string[] ?? []);
const token = APIFY_TOKEN ?? process.env.APIFY_TOKEN ?? '';

console.log(`Excluded: ${excluded.join(', ')}`);


log.info(`Excluded key-value stores: ${excluded}`);
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
    let done = false;
    const gzs = new AsyncGzip({ level: 0, mem: 4, filename: 'hello.txt' });
    let wasCallbackCalled = false;
    let toZip: any = {}
    let zipped: any = {}
    // Read all key-value stores
    let kvs1 = await client.keyValueStores().list({ offset: 1, limit: 2 })
    // Read all keys of the key-value store
    let filteredActorKVSItem = kvs1.items.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""))
    for (let index = 0; index < filteredActorKVSItem.length; index++) {
        const kvs = filteredActorKVSItem[index];
        // Get the ID and list all keys of the key-value store
        let fileName = "";
        let folderName = kvs.name ?? kvs.title ?? kvs.id;

        let item_names = await client.keyValueStore(kvs.id).listKeys({ limit: 20 });
        let filteredKVSListItem = item_names.items
        let lastItemPosition = false
        const listLength = filteredKVSListItem.length;
        log.info(`Zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`)
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
                console.log(file.key, file.value);
                const buffered = Buffer.from((file.value as string), 'binary');
                toZip[`${folderName}/${([file.key])}`] = [buffered];

                log.info(`Finished adding file ${fName} to zip file...`);
            }
            zipped = zipSync(
                toZip
            );

        };
        // Done zipping
        log.info(`Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`)
        console.log('Writing to file...');
        let b = new Blob([zipped], { type: 'application/zip' })

        const outFolder = 'test-folder';
        if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder)

        fs.writeFileSync(`${outFolder}/image-downloads.zip`, zipped, { encoding: 'binary' });
        console.log('Done!');

        // Get the name of the key-value store
        const kvsName = kvs.name ?? kvs.title ?? kvs.id;
        // Save the zip file to the key-value store
        log.info(`Saving zipped files to key-value store ${kvsName}...`)

        // await Actor.setValue(`${randomUUID()}_${folderName}`, big_data, { contentType: 'application/zip' })
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
