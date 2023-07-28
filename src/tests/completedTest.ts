import { Dataset } from "apify";
import { KeyValueStore } from "crawlee";
let dataset = await Dataset.open("completed-downloads");

let completedDownloads: KeyValueStore = await KeyValueStore.open("completed-downloads")
    .then(s => s)
    .catch(() => {
        console.error
        return null
    });

let completedDownloadsKeys: {
    id: string;
    url: string;
}[] = [];

const getURL = (value: { id: any; images: { orig: { url: string; }; }; url: string; }) => {
    if (value?.id) {
        if (value?.images?.orig?.url)
            completedDownloadsKeys.push({ id: value.id, url: value.images.orig.url })
        else
            completedDownloadsKeys.push({ id: value.id, url: value?.url })
    }
}
await completedDownloads.forEachKey(async (key) => {
    const val = await completedDownloads.getValue(key);
    getURL(val as any)
})

console.log(`Before: ${completedDownloadsKeys.length}`);

// console.log({ completedDownloadsKeys, count: completedDownloadsKeys.length });

await KeyValueStore.open("completed-downloads");
// for await (const key of completedDownloadsKeys) {
let s = (await dataset.getData()).items

for await (const key of s) {
    await completedDownloads.setValue(key.id, key.url)
}
