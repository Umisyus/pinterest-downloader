import { Actor, log } from "apify";
import { KeyValueStore } from "crawlee";

await Actor.init();

await newFunction();

await Actor.exit();

// let { Actor, log } = await import("apify");
async function newFunction(FILE_SIZE = 50_000_000 /* Size in Megabytes */) {
    await Actor.init();
    let zip = createZip(FILE_SIZE);

    await new Promise(async (resolve) => {
        log.info(`Saving zip to KVS...`)
        log.info(`converting to base64...`)
        let base64 = zip.toString('base64');

        await Actor.setValue("TESTzip", base64, { contentType: "application/zip" });
        log.info(`Saved to KVS`);
        //@ts-ignore
        resolve();
    });

    console.timeEnd()
    // .then(async () =>
    // await Actor.exit();
};

await newFunction(45_000_000)

function createZip(FILE_SIZE: number) {
    console.time('zip-create');
    let numbers = Array.from(([...Array(FILE_SIZE).keys()]).map((i) => i * 1));

    let zip = Buffer.from([...numbers]);
    console.log(zip.byteLength);
    log.info(`zip size: ${zip.byteLength / 1000000} MB`);
    console.timeEnd('zip-create');
    return zip;
}

