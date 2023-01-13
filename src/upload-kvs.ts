// upload to kvs
import { ApifyClient, Actor, Configuration } from "apify";
import { KeyValueStore } from "crawlee";

await Actor.init()
await saveLocalKVSToRemoteKVS("data-kvs", "data-kvs");

async function saveLocalKVSToRemoteKVS(local_kvs_id: string, remote_kvs_id: string) {
    let local_kvs = await Actor.openKeyValueStore('data-kvs');
    let client = new ApifyClient({ token: process.env.TOKEN });
    client.keyValueStore('data-kvs');

    await Actor.openKeyValueStore('data-kvs', { forceCloud: true })
        .then(async (kvs) => {
            await local_kvs.forEachKey(async (k) => {
                let v = await local_kvs.getValue(k);
                await kvs.setValue(k, v);
                console.log(k);
            });
        });
}

