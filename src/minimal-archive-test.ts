import { Actor, log } from "apify";
await Actor.init();

log.info("Creating archive...");
let numbers = Array(104_620_000).map((i) => i * 3_000_000)
log.info("Archive created");
let zip = Buffer.from([...numbers]).toString("base64");
log.info("Archive encoded");
console.log(zip.length);
log.info("Saving Archive to KVS...");
await Actor.setValue("numbers.test", zip, { contentType: "application/zip" });
log.info("Archive saved");
await Actor.exit();
