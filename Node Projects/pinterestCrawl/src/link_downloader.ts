import * as playwright from 'playwright';
import { Locator } from 'playwright';

import * as fs from 'fs'

export async function link_downloader() {
    playwright.chromium.launchPersistentContext('./pinterest-download-data', { headless: false, devtools: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }).then(async (browser) => {
        // Pinterest Cookies
        // "csrftoken=dc9668f0ca00bdf43f604fac15681313; g_state={\"i_l\":0}; cm_sub=allowed; sessionFunnelEventLogged=1"

        // let cookies = [{
        //     name: 'pinterest',
        //     value: 'csrftoken=dc9668f0ca00bdf43f604fac15681313; g_state={\"i_l\":0}; cm_sub=allowed; sessionFunnelEventLogged=1',
        //     url: 'https://www.pinterest.ca',
        //     // domain: '.pinterest.com',
        //     // path: '',
        //     // expires: 0,
        //     // httpOnly: true,
        //     // secure: true,
        //     // sameSite: 'None'
        // }]

        async function globalSetup() {
            const browser = await playwright.chromium.launch();
            const page = await browser.newPage();
            await page.goto('https://pinterest.ca/login');
            await page.getByLabel('User Name').fill('user');
            await page.getByLabel('Password').fill('password');
            await page.getByText('Sign in').click();
            // Save signed-in state to 'storageState.json'.
            await page.context().storageState({ path: './pinterest-download-data/storageState.json' });
            await browser.close();
        }

        const page = await browser.newPage();
        // page.context().addCookies(cookies)
        // addScriptTag and readFileSync

        // You can save the function to a seperate file and use the function using addScriptTag.
        let dirname = '/Users/umit/Desktop/Github Test/Node Projects/pinterestCrawl/src/'

        let filePath = dirname + 'pin_ex.js'

        // or evaluate with readFileSync.
        let script = fs.readFileSync(filePath, 'utf8')

        await globalSetup()
            .then(async () => {
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

                    return JSON.stringify(boards)
                });

                console.log(boards);

                let sections = await page.evaluate(() => {

                    return get_sections()

                });
                console.log(sections.length);

                await page.evaluate(() => {
                    let i = 0;
                    let pins = []
                    while (i < 200) {
                        pins.push(...get_pins())
                    }
                    return pins
                });



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

            });



    })
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

