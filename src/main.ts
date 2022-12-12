// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from 'apify';
// import * as tokenJson from "../storage/token.json"
await Actor.init();
let EXCLUSIONS = ['completed-downloads'];

let [APIFY_TOKEN, ExcludedStores] = await Actor.getInput<any>();
const token = APIFY_TOKEN ?? process.env.APIFY_TOKEN ?? '';

EXCLUSIONS.concat(ExcludedStores ?? []);

if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    console.log('No APIFY_TOKEN provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
}

export let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');

const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

await downloadZip(client)

await Actor.exit()

async function downloadZip(client: ApifyClient) {

    // const input =
    // {
    //     "keyValueStoreId": "7TxqCqthXuF9Qmykq",
    //     "filesPerZipFile": 1000
    // }
    log.info('Reading key value stores...');
    const accountKVS = await client.keyValueStores().list();

    if (accountKVS.items.length == 0) {
        console.log('No key-value stores were found!');
        log.info('Abort...');
        return;
    }

    const keyValuesStoresResult = accountKVS.items;
    // Get the ID and compare the name of each key-value store and run the actor
    // if the name is not in the exclusion list (EXCLUSIONS)
    let [..._items] = keyValuesStoresResult.filter((kvs) => !EXCLUSIONS.includes(kvs.name ?? kvs.title ?? ""))
    const delta = _items.length - keyValuesStoresResult.length;

    if (delta > 0) {
        log.info(`Found ${_items.length} key-value stores while excluding ${delta} key-value stores...`);
    }

    for await (const i of _items) {
        const input = {
            "keyValueStoreId": i.id,
            "filesPerZipFile": 1000
        }

        log.info(`Running actor on key - value store name: ${i.name} with ID: ${i.id} ...`);
        const run = await client.actor("jaroslavhejlek/zip-key-value-store").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        log.info(`Retrieved ${items} results from ${i.name}...`)

        log.info('Actor run finished...');
        log.info('Results from dataset');
        items.forEach((item) => {
            console.dir(item);
        });
    }

    // (async () => {
    //     // Run the actor and wait for it to finish
    //     const run = await client.actor("jaroslavhejlek/zip-key-value-store").call(input);

    //     // Fetch and print actor results from the run's dataset (if any)
    //     console.log('Results from dataset');
    //     const { items } = await client.dataset(run.defaultDatasetId).listItems();
    //     items.forEach((item: any) => {
    //         console.dir(item);
    //     });
    // })();
}
