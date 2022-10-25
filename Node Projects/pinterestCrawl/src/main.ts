import * as pw from "playwright";
import { link_downloader } from "./link_downloader.js";
import { crawl } from "./pinextractor";
const closeModalBtnSelector = 'button[aria-label="close"]';
// import { crawl, parse } from "./pinextractor";
await link_downloader()

// pw.chromium.launch({ headless: false }).then(async (browser) => {
// const page = await browser.newPage();
// await page.goto("https://www.pinterest.ca/dracana96");
// get boards using xpath
// let more_btn_selector = "button[aria-label='more']"

// const boards = await page.locator("//div[@role='list']").elementHandles();
// for await (const board of boards) {
//     await board.click();
//     let links = crawl(page.url(), 2000);

//     await page.waitForLoadState("networkidle");

//     const pins = await page.$$("img");
//     await page.waitForLoadState("networkidle");
//     // click on each pin
//     for await (const pin of pins) {

//         await pin.click();
//         await page.waitForTimeout(2000);

//         if (page.locator(closeModalBtnSelector)) {
//             await page.click(closeModalBtnSelector);
//         }
//         // extract pin info
//         // let dots = page.locator(more_btn_selector);
//         // dots.click()
//         // // let downloadBtn = page.locator("button", { hasText: "Download image" });
//         // let downloadBtn = page.locator("button", { hasText: "Save image" });
//         // await downloadBtn.click();
//         // let [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()]);
//         // let path = await download.path();

//         // console.log(`Downloading ${path}`);

//         // go back to the board
//         await page.goBack();
//     }
// }
// await link_downloader()
//     await browser.close();
// });

/**
 * import * as pw from "playwright";
import { crawl, parse } from "./pinextractor";
pw.chromium.launch({ headless: false }).then(async (browser) => {
    const page = await browser.newPage();
    await page.goto("https://www.pinterest.ca/dracana96");
    // await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20_000 });
    // click on each pin
    const pins = await page.locator("div[role='list'] div").evaluateAll()
    const boards = $x(`//div[@role='list']`)
    console.log('Getting pins...')

    for await (const board of boards) {
        board.click()

        for await (const pin of pins) {
            console.log('Clicking pin...');
            await pin.click();
            // extract pin info
            let dots = page.locator("button", { hasText: "More options" });
            await dots.click();
            let downloadBtn = page.locator("button", { hasText: "Download image" });
            let [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()]);
            let path = await download.path();
            console.log(`Downloading ${path}`);
            // go back to the board
            await page.goBack();

        }
    }

    await browser.close();
}).catch(console.error).finally(() => process.exit());
//# sourceMappingURL=main.js.map

 */
