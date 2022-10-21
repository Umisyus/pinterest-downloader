import * as pw from "playwright";
import {crawl} from "./pinextractor.js";

pw.chromium.launch().then(async (browser) => {
    const page = await browser.newPage();
    await page.goto("https://www.pinterest.com");
    await page.screenshot({ path: "pinterest.png" });
    await browser.close();
    }
