import path from "path"
import fs from "fs"
import * as playwright from "playwright"

async function globalSetup() {

    let __dirname = path.dirname(process.argv[1])
    let obj = (fs.readFileSync(__dirname + '/../storage/login.json')).toString('utf8').trim()

    let user = JSON.parse(obj).user
    let pass = JSON.parse(obj).pass

    const browser = await playwright.chromium
        .launchPersistentContext('./pinterest-download-data', {
            headless: false, devtools: true,
            // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        })

    const page = await browser!.newPage();
    await page.goto('https://pinterest.ca/login');

    // let cookies = await page.evaluate(() => document.cookie);

    const closeModalBtnSelector = 'button[aria-label="close"]';
    if (await page.locator(closeModalBtnSelector, { hasText: "close" }).count() > 0) {
        await page.getByLabel('Email').fill(user);
        await page.getByLabel('Password').fill(pass);
        await page.getByText('Log in').click();

        // Save signed-in state to 'storageState.json'.
        (await page.context()
            .storageState({ path: '../storage/storageState.json' })
            .then((s) => console.log("SAVED STORAGE STATE" + JSON.stringify(s)))
            .catch(err => console.error("FAILED TO SAVE STATE: " + err)));

    }
    await page.close();
    await browser.close();

}
await globalSetup()

