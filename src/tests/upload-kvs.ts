// upload to kvs
import { ApifyClient, Actor, Configuration } from "apify";
import { KeyValueStore } from "crawlee";

await Actor.init()
await saveLocalKVSToRemoteKVS("data-kvs", "data-kvs");

async function saveLocalKVSToRemoteKVS(local_kvs_id: string, remote_kvs_id: string) {
    let local_kvs = await Actor.openKeyValueStore(local_kvs_id);
    let client = new ApifyClient({ token: process.env.APIFY_TOKEN });
    let create_kvs = (await client.keyValueStores().getOrCreate(remote_kvs_id)).id;
    let remote_kvs = client.keyValueStore(create_kvs)

    await Actor.openKeyValueStore(local_kvs_id, { forceCloud: true })
        .then(async (kvs) => {
            await local_kvs.forEachKey(async (k) => {
                let v = await local_kvs.getValue(k);
                await kvs.setValue(k, v);
                await remote_kvs.setRecord({ key: k, value: v as any })
                    .then(() => console.log(`Uploaded ${k} to remote KVS`));
            });
        });
}
