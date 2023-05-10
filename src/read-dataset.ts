import { Actor, log } from "apify";
import { KeyValueStore } from "crawlee";
import { Item } from "./types";
await Actor.init()

let ds_name = 'imageset';
// await saveToDefaultDataset(ds_name);
// Check for not downloaded images
let completed: Item[] = []
let cd = await Actor.openKeyValueStore('completed-downloads')
cd.forEachKey(async d => {
    let data = await cd.getValue(d) as Item
    completed.push(data)
})

await Actor.openDataset(ds_name)
    .then(async (ds) => {
        console.log(`Name of dataset: ${ds.name}`);
        // console.log(`Number of items: ${(await ds.getInfo())?.itemCount}`);
        let itemsToDownload = ((await ds.getData()).items as Item[])
            // Filter out completed items
            .filter(i => !completed.includes(i))
        console.log(`Number of items: ${itemsToDownload.length}`);

        for await (const item of itemsToDownload) {
            console.log(`Downloading: ${item.key}`);
            // Simulate a download
            await Promise.resolve(() => {
                setTimeout(() => {
                    console.log(`Downloaded: ${item.key}`);
                }, 100)
            })
            let modifiedItem = item
            modifiedItem.isDownloaded = true
            await cd.setValue(item.key, modifiedItem)
        }

    }).catch((e) => {
        console.error("Could not find / open dataset!", e);
    });

await Actor.exit()

async function saveToDefaultDataset(ds_name = 'default'): Promise<void> {
    let kvs;
    let items: any[] = [];
    let values: any[] = [];
    const kvs_name = 'data-kvs';
    try {
        kvs = await KeyValueStore.open(kvs_name);

        await kvs.forEachKey(async (k) => { items.push(k); });

        for await (const i of items) {
            let d = await kvs.getValue(i) as any;
            let data = d.value.data;
            console.log(`Adding: ${i}`);
            values.push({ key: d.key, data });
        }

        console.log(`Name: ${kvs.name}`);
        console.log(`Items:`);
        console.log(items);
        let ds = await Actor.openDataset(ds_name);
        for await (const value of values) {
            await ds.pushData(value);
        };
    } catch (e) {
        console.error("Could not find / open dataset!");
    }
}
async function saveToDefaultKeyValueStore(items: Item[], kvs_name = 'default'): Promise<void> {
    let kvs;
    try {
        kvs = await KeyValueStore.open(kvs_name);
        if (!kvs) {
            throw new Error('Could not open kvs')
        }
        // await kvs.forEachKey(async (k) => { kvsKeys.push(k); });

        // for await (const i of kvsKeys) {
        //     let d = await kvs.getValue(i) as Item;
        //     let data = d.data
        //     console.log(`Adding: ${i}`);
        //     values.push({ key: d.key, data, isDownloaded: false });
        // }

        // console.log(`Name: ${kvs.name}`);

        items.map(async (item) => {
            item.isDownloaded = false
            item.key = item.key
            item.data = item.data

            return item
        })
        console.log(`Items:`);
        console.log(items);
        for await (const value of items) {
            kvs.setValue(value.key, value);
        };
    } catch (e) {
        console.error("Could not find / open dataset!");
    }
}
