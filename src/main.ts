// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from 'apify';
// import * as tokenJson from "../storage/token.json"
await Actor.init();

const { APIFY_TOKEN } = await Actor.getInput<any>();
const token = APIFY_TOKEN ?? process.env.APIFY_TOKEN ?? '';

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

    const accountKVS = await client.keyValueStores().list({ limit: 5 });

    if (accountKVS.items.length == 0) {
        console.log('No downloads found!');
        log.info('Abort...');
        return;
    }

    // Open each key value store and run the actor
    let [...items] = accountKVS.items
        // .map(async (kvs) => await Actor.openKeyValueStore(kvs.id));
        .map(async (kvs) => (kvs.id));

    for await (const i of items) {
        const input = {
            "keyValueStoreId": i,
            "filesPerZipFile": 2000
        }

        const run = await client.actor("jaroslavhejlek/zip-key-value-store").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
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
