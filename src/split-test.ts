// // TEST SPLITTING
// function splitArray(array, MAX_SIZE_IN_BYTES = 9 * 1_000_000) {
//     let results = [];
//     let current = [];
//     let currentSize = 0
//     for (var i = 0; i < array.length; i += 10) {
//         results.push(array.slice(i, i + 10));
//     }
//     console.log(results.length);

//     return results;
// }
import { Actor, log } from 'apify';
import archiver from 'archiver';
import fs from 'fs';
import { randomUUID } from 'crypto';
// Actor.init().then(async () => {
(async () => {
    await Actor.init()
    let defkvs = await Actor.openKeyValueStore('data-kvs')

    let items: any[] = []
    log.info('Getting keys')
    await defkvs.forEachKey(async (key) => {
        items.push((({
            key: (await defkvs.getValue(key) as any).key,
            value: (await defkvs.getValue(key) as any).value.data
        })))
    })
    log.info(`Got ${items.length} key(s)`)
    let chunks = splitArray(items, 25)
    console.dir(chunks);
    console.dir("chunks_length: " + chunks.length);

    await Promise.all(chunks.map(async chunk => {
        archiveKVS2(chunk).then((zip) => {
            fs.writeFileSync(`test-${randomUUID()}.zip`, zip)
        })
    }));


})()
// .finally(async () => await Actor.exit());
async function archiveKVS2(imageArray: any[]) {
    const buffers: Buffer[] = [];

    await new Promise<void>(async (resolve, reject) => {

        const archive = archiver.create('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('data', (chunk) => {
            buffers.push(chunk)
        });

        archive.on('end', () => {
            console.log('End called');
            resolve();
        });

        archive.on('error', console.log);
        // Append each file from the key-value store to the archive
        // imageArray.forEach(async (item, index) => {
        for (let index = 0; index < imageArray.length; index++) {
            const item = imageArray[index];
            archive.append(Buffer.from(item.value), { name: `${item.key}` })
        }

        await archive.finalize()
    })
    return Buffer.concat(buffers)
}


function splitArray(array: any[], FILES_PER_ZIP: number = 50, MAX_SIZE_IN_BYTES = 9 * 1_000_000) {
    let results = [];

    for (var i = 0; i < array.length; i += FILES_PER_ZIP) {
        results.push(array.slice(i, i + FILES_PER_ZIP));
    }
    console.log(results.length);

    return results;
}

