import { Actor, log } from "apify";
import fflate, { strToU8 } from "fflate";

await Actor.init();

log.info("Creating archive...");
let chunks: Uint8Array = new Uint8Array()
let z = fflate.gzip(chunks, () => { })

new Array(115_620_000).fill(1).map((i) => {
    let s = strToU8("Hello World " + i)
});

log.info("Archive created");
let buffer = Buffer.from(chunks)
log.info("Encoding archive...");
let zip = buffer.toString("base64");
log.info("Archive encoded");

log.info("Saving Archive to KVS...");
await Actor.setValue("numbers.test", zip, { contentType: "application/zip" });
log.info("Archive saved");
await Actor.exit();
