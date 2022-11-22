import { Dataset, createPlaywrightRouter, Request, enqueueLinks, Dictionary } from 'crawlee';

import { randomUUID } from 'crypto'
import { SELECTORS } from './constants/constants_selectors.js';
import Playwright from 'playwright';
import { Pin } from './constants/types.js';
import fs from 'fs'
import { CRAWLEE_CONSTANTS } from './main.js';
import { CheerioAPI } from 'cheerio';
// import login data from file

const login_data = JSON.parse(fs.readFileSync('./storage/login.json', 'utf8'));

export let router = createPlaywrightRouter();
let ds = await Dataset.open('pinterest');

// Scroll down page to load all pins
router.addDefaultHandler(async ({ log, request, page, enqueueLinks, parseWithCheerio }) => {
    // await page.waitForLoadState('load', { timeout: 60_000 })
    log.info(`DEFAULT HANDLER: ${request.url}`);
    /** All selectors go here, you add links of each element
     * (I.E.: The anchor tag HREF attribute that may be found within an element, ex.: [ 'div > a' or 'div a' ]) to the request queue with a label
     */

    log.info(`Login chk`);
    let if_login = null;
    let is_logged_in = false
    let if_login_text = ""
    try {
        if_login = page.locator('button', { hasText: 'Log in' });
        if_login_text = await if_login.textContent() ?? "";

    } catch (error) {
        is_logged_in = true
    }

    if (if_login_text == 'Log in') {
        console.log({ if_login_text });

        (log.info(`Not logged in`));
        await login(page)
        log.info(`Logged in now.`);
        // Goto main profile page
        await page.goto("https://www.pinterest.com/dracana96");
        // await enqueueLinks({
        //     label: 'login',
        //     forefront: true
        // });
    }
    else {
        log.info(`Logged in`)
    }

    await page.waitForSelector(`${SELECTORS.board_selector}`).catch(() => { console.log("No boards found") });
    let $ = await parseWithCheerio()
    log.info(`Enqueueing boards`);
    let links = getLinksForSelector(SELECTORS.board_selector, $);

    log.info(`Links: ${links}`);

    let board_links = formatLinks(links, request)

    // Add board selector
    await enqueueLinks({
        label: CRAWLEE_CONSTANTS.board,
        urls: [board_links[2]]
    })
    // await page.waitForSelector(`${SELECTORS.section_selector} a`).catch(() => { console.log("No sections found") });

    // // Add section selector
    // log.info(`Enqueueing sections`);
    // await enqueueLinks({
    //     selector: `a`,
    //     // label: CRAWLEE_CONSTANTS.section
    //     label: CRAWLEE_CONSTANTS.section
    // })

    // await page.waitForSelector(`${SELECTORS.pins_selector} a`).catch(() => { console.log("No pins found") });
    // // Add pin selector
    // log.info(`Enqueueing pins`);
    // await enqueueLinks({
    //     selector: `${SELECTORS.pins_selector} a`,
    //     label: CRAWLEE_CONSTANTS.pin
    // })

});

// router.addHandler(CRAWLEE_CONSTANTS.login, async ({ log, request, page }) => {
router.addHandler('login', async ({ log, request, page }) => {
    log.info(`LOGIN HANDLER: ${request.url}`);
    // Login to Pinterest
    await page.waitForSelector('input[name=email]').catch(() => { console.log("No login form found") });
    await page.type('input[name=email]', login_data.user);
    await page.type('input[name=password]', login_data.pass);
    await page.click('button[type=submit]');
    await page.waitForNavigation();
})

router.addHandler('board', async ({ enqueueLinks, request, page, log, parseWithCheerio }) => {
    let $ = await parseWithCheerio()
    let sel = SELECTORS.board_title_selector
    const title = getTitleText(sel, $) || request.loadedUrl?.split('/').filter(o => o !== '').pop()

    log.info(`Board handler: ${title}`);
    // await infiniteScroll()
    log.info(`Getting sections from board ${title}`, { url: request.loadedUrl });
    await enqueueLinks({
        // label: CRAWLEE_CONSTANTS.section,
        label: CRAWLEE_CONSTANTS.section,
        urls: formatLinks(getLinksForSelector(SELECTORS.section_selector, $), request)
    });
    await enqueueLinks({
        label: CRAWLEE_CONSTANTS.section,
        urls: formatLinks(getLinksForSelector(SELECTORS.section_selector, $), request)
    });

    // Grab pins for board
    log.info(`Getting pins for board ${title}`, { url: request.loadedUrl });
    let pins = await autoScroll(page as any);
    log.info(`Got ${pins.length} pins for board ${title}`, { url: request.loadedUrl });
    log.info(`Saving pins for board ${title}`, { url: request.loadedUrl });
    await ds.pushData({ boardName: title, sections: [], boardPins: pins })
});

router.addHandler('section', async ({ request, page, log, parseWithCheerio }) => {
    let $ = await parseWithCheerio()
    let boardName = $(SELECTORS.board_title_selector).first().text() ?? "UNKNOWN"
    let boardLink = formatLinks([$(SELECTORS.board_title_selector).parent().attr('href') ?? ""], request)[0]

    const title = (getTitleText(SELECTORS.section_title_selector, $)
        || request.loadedUrl?.split('/').filter(o => o !== '').pop()) ?? 'No title'

    log.info(`Processing section: ${title}`);
    log.info(`${title}`, { url: request.loadedUrl });

    // Grab pins from section page
    log.info(`Getting pins for section ${title}`, { url: request.loadedUrl });
    let pins = await autoScroll(page as any);
    log.info(`Got ${pins.length} pins for section ${title}`, { url: request.loadedUrl });
    log.info(`Saving pins for section ${title}`, { url: request.loadedUrl });
    ds.pushData({
        boardName,
        boardLink,
        sectionName: title,
        sectionLink: request.loadedUrl,
        sectionPins: pins,
        pinCount: pins.length
    })
});

router.addHandler('pin', async ({ request, page, log, enqueueLinks }) => {
    const title = page.url();
    log.info(`Pin handler: ${title}`);
    log.info(`${title}`, { url: request.loadedUrl });

    await enqueueLinks({
        label: CRAWLEE_CONSTANTS.pin,
        selector: SELECTORS.pins_selector
    });

});

router.addHandler('downloadImage', async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });
    let pin = (await ds.getData({ clean: true })).items

    for await (let p of pin as Pin[]) {
        log.info(`> > > Downloading pin ${p.title}`);
        await dlPin(p, page as any, 'my-board', 'my-section')
    }
});

function getTitleText(sel: string, $: CheerioAPI,) {
    return $(sel).text();
}

function getLinksForSelector(selector: string, $: CheerioAPI): string[] {
    return $(`${selector}`).map((_, el) => {
        let href = $(el).find('a').attr('href');
        return href;
    }).get();
}

function formatLinks(links: string[], request: Request<Dictionary<any>>) {
    return links.map(l => {
        const req_url = request.url;
        const url = new URL(req_url);
        return `${url.origin}${l}`;
    });
}

async function extractBoardsSections(page: Playwright.Page, SELECTORS: any) {
    // @ts-ignore

    let user_boards = (SELECTORS) => { // WORKS NOW!

        /* Use when logged in */
        // @ts-ignore
        function get_boards(boards_selector) {
            // Check if null or empty
            if (boards_selector == null || boards_selector == "")
                boards_selector = SELECTORS.board_selector;

            // @ts-ignore
            let boards = Array.from(document.querySelectorAll(boards_selector));
            // @ts-ignore
            let links = [];
            // @ts-ignore
            links.push(...boards.map(i => i.querySelector('a')).map(i => i.href));

            // @ts-ignore
            //             console.log(links);

            // @ts-ignore
            return { boards_selector, links };
        }

        let boards = get_boards(SELECTORS.board_selector);

        // // @ts-ignore
        console.log(boards);

        return JSON.stringify(boards);
    };

    //@ts-ignore
    let board_sections = (SELECTORS) => {
        // @ts-ignore
        function $$(selector) {
            return Array.from(document.querySelectorAll(selector));
        }
        // @ts-ignore
        function get_sections(SELECTORS) {

            let sections = $$(SELECTORS.section_selector);
            // @ts-ignore
            return sections.map(i => (window.location.origin + i.querySelector('a').getAttribute('href')));
        }

        let sections = get_sections(SELECTORS);

        console.log(sections);
        let s = `${SELECTORS.section_selector}`
        return JSON.stringify(sections);
    };

    let ops: any[] = [
        user_boards, board_sections
    ];
    let sel = SELECTORS
    let eval_ops = ops.map(i => page.evaluate(i, sel));
    // console.log(SELECTORS);

    let [board_links, section_links]: any[] = await Promise.all([...eval_ops]);
    console.log("Boards and Sections:", { board_links, section_links });
    debugger
    return { board_links, section_links };
}

export async function dlPin(pin: Pin, page: Playwright.Page, boardName: string, sectionName: string) {

    if (pin.image_link == "" || pin.is_video == true) {
        console.warn(`No Link for ${pin.title}`);
        return { fileName: "", data: "", stream: "" };
    }
    console.log(pin.image_link);

    console.log(`Downloading pin: ${pin.title} @ ${pin.image_link}`);

    let pin_title = pin.title.trim();

    if (pin.image_link == undefined || pin.image_link == null || pin.image_link == '') {


        console.warn(`Pin titled ${pin_title} @ ${pin.pin_link} has no image link `);
        return { fileName: "", data: "", stream: "" };
    }

    console.log("Downloading pin: " + pin_title.replace('\s{2,}', ' '));

    await page.waitForTimeout(3000);
    await page.goto(pin.image_link);

    // Format the title so we can save without any issues
    let img_name = (pin_title.substring(0, 69))
        .replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');

    let bn: string = boardName;
    let sn: string = sectionName;
    // PinterestCrawl/dist/../src/storage/board-name/[section-name]/image_name.png
    let rand = (img_name.toLocaleLowerCase().includes("unknown".toLocaleLowerCase()) ? randomUUID() : "") ?? "";
    let img_fileName = `${img_name}_${rand}.png`;
    let img_path = __dirname + '/' + bn + "/" + sn + img_fileName + '.png';
    let img_link = pin.image_link;

    let [download] = await Promise.all([
        page.waitForEvent('download'),
        page.evaluate(
            ([img_link, img_name]) => {
                // @ts-ignore
                function downloadImage(url, fileName) {
                    let a = document.createElement("a");
                    a.href = url ?? window.location.href;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
                // @ts-ignore
                return downloadImage(img_link, img_name);
            },
            [img_link, img_name]),
    ]);

    console.log(`Downloaded to: ${await download.path()}`);

    console.log(`Saved pin ${pin.title} to: ${img_path}`);
    await download.saveAs(img_path);
    let data = (await fs.promises.readFile(img_path));
    let stream = await download.createReadStream();
    return { img_path, fileName: img_fileName, data, stream };
}

export async function autoScroll(page: Playwright.Page): Promise<Pin[]> {
    let selectors = SELECTORS

    return await page.evaluate(async (selectors) => {
        return await new Promise(async resolve => {
            async function crawl_function() {

                // script to run in browser #118

                // V 109
                // @ts-ignore
                function parsePins(...pins) {
                    // @ts-ignore
                    return [...pins].map(i => {
                        if (i == undefined || i == null) throw Error("Failed to parse pin")

                        let img = i.querySelector('img') ?? null
                        let original_img_link = ""

                        if (img !== null) {
                            // If there's no srcset, then the image is probably from a video
                            if (img.srcset !== "") {
                                // original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
                                let srcset = img.srcset.split(' ')
                                original_img_link = srcset[srcset.length - 2] ?? ""
                            }
                        }
                        // @ts-ignore
                        let is_video = (() => [
                            selectors.video_pin_selector_1,
                            selectors.video_pin_selector_2,
                            selectors.video_pin_selector_3
                        ]
                            .some(s => i.querySelector(s) ? true : false))()

                        let pin_link = i.querySelector('a').href ?? ""
                        // @ts-ignore
                        let title = (i) => {
                            let p_title = ""
                            let title_el = [...i.querySelectorAll('a')][1] ?? null;

                            if (title_el !== null) {
                                p_title = title_el.innerText
                            } else {
                                p_title = 'Unknown'
                            }
                            let pinAuthor = i.querySelector('span') == null ?
                                "Unknown" : i.querySelector('span').textContent

                            return p_title ? `${p_title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor} `
                        }
                        // @ts-ignore
                        title = title(i).trim()
                        is_video = is_video

                        if (original_img_link == "") {
                            // if video, return title, pin_link, is_video no image link
                            return { title, pin_link, is_video: true, image: "" }
                        }


                        if ((is_video == false) && (original_img_link !== undefined)) {
                            return { title, pin_link, is_video: false, image: original_img_link }
                            // console.log(`${ title }, ${ pin_link }, ${ is_video } `)
                        }
                        return { title, pin_link, is_video, image_link: original_img_link }
                    })
                }


                // @ts-ignore
                function $$(selector, context) {
                    context = context || document;
                    var elements = context.querySelectorAll(selector);
                    return Array.prototype.slice.call(elements);
                }

                // @ts-ignore
                function isVisible(el) {
                    console.log(el);
                    if (!el || (el === null || el === undefined)) return false;
                    return el.getBoundingClientRect().top <= window.innerHeight;
                }
                // @ts-ignore
                function $x(xp, el = document) {
                    // @ts-ignore
                    let snapshot = null
                    if (el !== undefined && el !== null) {
                        snapshot = document.evaluate(
                            xp, el, null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                        );
                    }
                    snapshot = document.evaluate(
                        xp, document, null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                    );

                    return [...new Array(snapshot.snapshotLength)]
                        // @ts-ignore
                        .map((_, i) => snapshot.snapshotItem(i))
                        ;
                };

                /* TODO: Make async callbacks for more data??? */
                return await new Promise((resolve) => {
                    // Quick browser test code
                    let pins = new Array()
                    let pinsMap = new Map()
                    /* SCROLLING MAY END */

                    setTimeout(() => { }, 1000)

                    // Find the "More ideas like this" text element or the "Find more ideas for this board" text element
                    // let h3 = $x("//h3[contains(text(),'Find')]")
                    // let h2 = $x("//h2[contains(text(),'like this')]")
                    let h3 = []

                    let timer = setInterval(() => {
                        h3 = $x("//h3[contains(text(),'Find')] | //h2[contains(text(),'More')]")
                        // let vis =  h3.getBoundingClientRect().top <= window.innerHeight
                        // let vis2 = h2.getBoundingClientRect().top <= window.innerHeight
                        // let vis = isVisible(h3)
                        // let vis2 = isVisible(h2)

                        let isVis = h3.some(i => isVisible(i))

                        // Scroll down
                        window.scrollBy(0, 200)

                        // @ts-ignore
                        pins.push(...[...$$('div[data-test-id="pin"]')])
                        // @ts-ignore
                        // If we see the "More ideas like this" text element or the "Find more ideas for this board" text element
                        // we can stop scrolling
                        if (isVis || (h3.length == 0 && pins.length == 1)) {
                            clearInterval(timer)

                            // Parse results
                            let parsedPins = parsePins(...pins)
                            // @ts-ignore
                            // Add them to a Map to make them unique by pin_link
                            // check if pin_link is empty, add them to another array and add them to the map later

                            parsedPins = parsedPins
                                // @ts-ignore
                                .filter(p => p !== undefined)
                                .filter(p => p.pin_link !== undefined && p.pin_link !== null && p.pin_link !== "")

                            // @ts-ignore
                            parsedPins.forEach(p => pinsMap.set(p.pin_link, p))

                            console.log(pinsMap)

                            // return pins data
                            debugger
                            resolve([...pinsMap.values()])
                        }
                    }, 2000)

                });

            }

            let res = await crawl_function()
            // @ts-ignore
            resolve([...res])
        })
    }, selectors) as Pin[];
}

export async function login(page: any) {
    await page.goto('https://pinterest.ca/login/');
    await page.type('input#email', login_data.user);
    await page.type('input#password', login_data.pass);
    await page.click('button[type=submit]');
    await page.waitForNavigation();
}
