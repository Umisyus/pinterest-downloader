import { launch_login, crawl_start } from "./crawler.js";

await launch_login()
    .then(async (page) => await crawl_start(page))
    .then(() => process.exit(0))
