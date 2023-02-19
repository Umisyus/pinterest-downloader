import { Actor, log } from "apify";
import { KeyValueStore } from "crawlee";
import { Readable } from "stream";
await Actor.init();

await newFunction();

await Actor.exit();

// let { Actor, log } = await import("apify");
async function newFunction(FILE_SIZE = 50_000_000 /* Size in Megabytes */) {
    await Actor.init();
    console.time()
    console.time('createZip')
    let zip = await createZip(FILE_SIZE);
    console.timeEnd('createZip')

    await new Promise(async (resolve) => {
        log.info(`Saving zip to KVS...`)
        // log.info(`converting to base64...`)
        let base64 = bufferToStream(zip); // zip.toString('binary');
        log.info(`size: ${base64.readableLength / 1000000} MB`)

        console.time('saveZip')
        await Actor.setValue("TESTzip", base64, { contentType: "application/octet-stream" }).then(() => {

            console.timeEnd('saveZip')
            log.info(`Saved to KVS`);
            //@ts-ignore
            resolve();
        })
    });

    console.timeEnd()
    // .then(async () =>
    // await Actor.exit();
};

await newFunction(45_000_000)

function bufferToStream(base64: Buffer) {
    let readableStream = new Readable();
    readableStream.push(base64);

    readableStream.push(null);
    return readableStream;
}

async function createZip(FILE_SIZE: number) {
    // console.time('zip-create');
    let numbers = Array.from(([...Array(FILE_SIZE).keys()]).map((i) => i + 5 * 111));

    let zip = Buffer.from([...numbers]);
    console.log(zip.byteLength);
    log.info(`zip size: ${zip.byteLength / 1000000} MB`);
    // console.timeEnd('zip-create');
    return zip;
}
