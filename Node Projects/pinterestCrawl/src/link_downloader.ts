import * as playwright from 'playwright';
import { Locator } from 'playwright';

import * as fs from 'fs'
import path from 'path';

export async function globalSetup() {

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
    let cookies = await page.evaluate(() => document.cookie);

    const closeModalBtnSelector = 'button[aria-label="close"]';
    if (await page.locator(closeModalBtnSelector, { hasText: "close" }).count() > 0) {
        // await page.getByLabel('Email').fill(user);
        // await page.getByLabel('Password').fill(pass);
        // await page.getByText('Log in').click();

        // Save signed-in state to 'storageState.json'.
        (await page.context()
            .storageState({ path: '../storage/storageState.json' })
            .then((s) => console.log("SAVED STORAGE STATE" + s))
            .catch(err => console.error("FAILED TO SAVE STATE: " + err)));

    }
    await page.close();
    await browser.close();

}

export async function link_downloader() {
    await globalSetup().then(async () => {

        playwright.chromium.launchPersistentContext('./pinterest-download-data', {
            headless: false, devtools: true,
            //  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        })
            .then(async (browser) => {
                const page = await browser.newPage()

                // const dirname = path.dirname(process.argv[1])
                // let filePath = dirname + 'pin_ex.js'
                // // or evaluate with readFileSync.
                // let script = fs.readFileSync(filePath, 'utf8')

                await page.goto("https://www.pinterest.ca/dracana96");

                await page.waitForTimeout(1000)

                // const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"

                // pick boards view
                // const boards_locator = page.locator("//div[@role='list']").first().first();
                // const boards_locator = page.locator("#profileBoardsFeed > div > div > div > div > a > div > div")

                // const pins_locator = page.locator("#profileBoardsFeed > div:nth-child(2) > div:nth-child(1)");

                // for await (const locator of iterateLocator(boards_locator)) {
                //     locator.click({ button: 'middle' });

                //     // switch to new tab
                //     const [newPage] = await Promise.all([
                //         page.context().waitForEvent('page'),
                //         locator.click(), // Opens a new tab
                //     ])


                //     let links_list: string[] = []

                //     /* !!!Exposing functions not working!!! */
                //     // await newPage.context().exposeFunction('crawl', crawl);
                //     await newPage.waitForLoadState('networkidle');

                let boards = await page.evaluate(() => {
                    // @ts-ignore
                    const $x = xp => {
                        const snapshot = document.evaluate(
                            xp, document, null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                        );
                        return [...new Array(snapshot.snapshotLength)]
                            .map((_, i) => snapshot.snapshotItem(i))
                            ;
                    };


                    /* Use when logged in */
                    function get_boards(boards_selector = "div[data-test-id='pwt-grid-item']") {


                        // Check if null or empty
                        if (boards_selector == null || boards_selector == "")
                            boards_selector = "div[data-test-id='pwt-grid-item']"
                        // @ts-ignore
                        let boards = Array.from(document.querySelectorAll(boards_selector))
                        // @ts-ignore
                        let links = [];
                        // @ts-ignore
                        links.push(boards.map(i => i.querySelector('a')).map(i => i.href))

                        // @ts-ignore
                        console.log(links);

                        // @ts-ignore
                        return links
                    }
                    // let sections = $x('*//div[starts-with(@data-test-id,"section")]')

                    let boards = get_boards()
                    // // @ts-ignore
                    // // @ts-ignore
                    // let section_links = sections.map(i => (window.location.origin + i.querySelector('a').getAttribute('href')))

                    console.log(boards);

                    return JSON.stringify({ boards })
                });

                console.log(boards);

                let sections = await page.evaluate(() => {
                    function get_sections() {
                        // @ts-ignore
                        let sections = $x('*//div[starts-with(@data-test-id,"section")]')
                        // @ts-ignore
                        return sections.map(i => (window.location.origin + i.querySelector('a').getAttribute('href')))
                    }

                    return get_sections()

                });

                console.log(sections.length);

                let pins = await page.evaluate(() => {
                    /* Use when logged in */
                    function get_pins() {

                        let pins = []

                        let i = 0

                        while (i < 5) {
                            // @ts-ignore
                            pins.push(...Array.from($$('img')
                                // Get the srcset attribute of the image
                                // @ts-ignore
                                .map(x => x.srcset)
                                // @ts-ignore
                                // Filter out the urls that are not valid
                                .filter(i => /\s|undefined|null/.exec(i)))
                                // @ts-ignore
                                // Split the srcset attribute into an array of urls
                                .map(i => i.split(' ')[6])
                                // Filter out the urls that are not valid
                                .filter(i => i !== undefined || i !== ""))

                            // Scroll down
                            window.scrollBy(0, 250)

                            // Filter duplicates

                            // Credits: https://stackoverflow.com/a/32122760
                            pins = pins.filter((e, i, a) => a.indexOf(e) == i)
                            // and undefined values
                            // Not sure if needed or not lol
                            // .filter(i => i !== undefined)
                            i++
                        }
                        // Return the array of urls
                        return pins
                    }

                    return get_pins()
                });

                console.log(`# Of Pins: ${pins.length}`);

                // await page.context().exposeFunction('crawl', crawl);
                // await page.waitForLoadState('networkidle');

                // let testPoint = await page.exposeFunction('docTest', docTest);
                // console.log(testPoint);

                // var result = await page.evaluate(async () => {
                //     var summary = await docTest();
                //     console.log(summary);
                //     return summary;
                // });

                // console.log(result);

                // Get all of the pins

                // let links1 = await newPage.evaluate(() => {
                //     function crawl(THRESHOLD = 10) {
                //         var totalPins = new Array();
                //         let ii = 0

                //         // Crawl the page
                //         let i = 0;
                //         const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"

                //         console.info("IN CRAWLER FUNCTION");

                //         do {
                //             // Get current chunk of images
                //             let current_pins = Array.from(document.querySelectorAll(pins_selector))

                //             // scroll down to load more images
                //             window.scrollBy(0, 100)
                //             //Add current chunk to set
                //             current_pins.forEach(totalPins.push, ...current_pins)
                //             // Show progress
                //             console.info(totalPins.length)
                //             ii++
                //         }
                //         while (ii < THRESHOLD)
                //         // get srcset from imgs
                //         // @ts-ignore
                //         return (totalPins).map(x => x.srcset)

                //     }

                //     // let THRESHOLD = 2

                //     // let i = 0
                //     // let pins = new Set()

                //     // while (i < THRESHOLD) {
                //     //     // @ts-ignore
                //     //     pins.add(crawl(2000))
                //     //     i++
                //     // }
                //     // return pins
                //     // put in array and return
                //     let pins = new Set()
                //     while (pins.size < 10) {
                //         // @ts-ignore
                //         pins.add(...crawl())
                //         if (pins.size >= 10) {
                //             break
                //         }

                //     }
                //     console.log(JSON.stringify(pins));
                //     //@ts-ignore
                //     return Array.from(...new Set(pins))

                // }).catch((err) => console.error(err));

                // console.log(links1, links_list);



                // const boards = page.locator("#profileBoardsFeed > div:nth-child(2) > div:nth-child(1)");
                // count boards
                // let count = await boards.evaluate((boards) => boards.childElementCount);
                // for (let index = 0; index < count;) {
                //     // get one board from boards
                //     const board = boards.nth(index);
                //     console.log(`clicking on the board ${await board.textContent()}}`)

                //     await board.click({ button: "middle" }).then(async () => console.log(`clicked ${index}`))

                //     let boardPins = document.querySelectorAll("div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a")
                //     // await page.goBack().then(async () => console.log(`went back`))
                // };

                // await page.$$eval(pins_selector, () => {
                //     let pins = Array.from(document.querySelectorAll("div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"));
                //     return JSON.stringify(pins)

                //     // window.scrollBy(0, 100);
                //     // // @ts-ignore
                //     // let imgs = Array.from(document.querySelectorAll('div > div:nth-child(1) > img:nth-child(1)'));
                //     // // @ts-ignore
                //     // let src_list = imgs.map(i => i.src); src_list.filter((i) => i.includes('original')).join()
                //     // return src_list

                // });

                await browser.close();
            }).catch((err) => console.error(err));
    }).catch((err) => console.error(err));


};

async function* iterateLocator(locator: Locator): AsyncGenerator<Locator> {
    for (let index = 0; index < await locator.count(); index++) {
        yield locator.nth(index)
    }
}


/* Use when not logged in */
// export
function crawl(THRESHOLD = 100) {
    var chunks = new Set();
    let ii = 0
    // TODO: add username later.
    if (!THRESHOLD) THRESHOLD = 100

    // Crawl the page
    let i = 0;
    const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"

    console.info("IN CRAWLER FUNCTION");

    do {
        do {
            // Get current chunk of images
            let chunks_before = Array.from(document.querySelectorAll(pins_selector))

            // scroll down to load more images
            window.scrollBy(0, 100)
            //Add current chunk to set
            chunks_before.forEach(chunks.add, chunks)
            // Show progress
            console.info(chunks.size)
            i++
        } while (i < 100)
        ii++
    }
    while (ii < THRESHOLD)
    // get srcset from imgs
    // @ts-ignore
    let srcset = Array.from(chunks).map(x => x.href)
    return srcset
}
function startCrawl() {
    // @ts-ignore
    let pins = crawl(2000)

    console.log(pins);

    // @ts-ignore
    return pins
}

