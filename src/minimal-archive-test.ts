import { Actor, log } from "apify";
await Actor.init();

log.info("Creating archive...");
let arrayOfNumbers = new Array(115_620_000).fill(1);
log.info("Archive created");
let buffer = Buffer.from(arrayOfNumbers)
log.info("Encoding archive...");
let zip = buffer.toString("base64");
log.info("Archive encoded");

log.info("Saving Archive to KVS...");
await Actor.setValue("numbers.test", zip, { contentType: "application/zip" });
log.info("Archive saved");
await Actor.exit();
