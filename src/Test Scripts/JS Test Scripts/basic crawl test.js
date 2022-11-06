import * as puppeteer from 'playwright';
import { selectors } from './logged-in/pinterest-selectors.js';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

// https://stackoverflow.com/a/53527984
(async () => {
    let __dirname = path.dirname(process.argv[1])

    let fileName = __dirname + '/' + "crawl-test-script.js";
    let scriptString = fs.readFile(fileName, 'utf8')

    const browser = await puppeteer.chromium.launch({
        headless: false,
        devtools: true,
        slowMo: 500,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });

    const page = await browser.newPage();
    await page.goto('https://www.pinterest.ca/dracana96/cute-funny-animals/', { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({
        width: 1200,
        height: 800
    });


    await page.waitForLoadState('networkidle');


    /* MAIN SCRIPT */
    let images = await autoScroll(page, scriptString);

    console.log(images);
    let todays_date = () => {
        // https://stackoverflow.com/questions/2013255/how-to-get-year-month-day-from-a-date-object
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();

        return year + "-" + month + "-" + day;
    }

    /* SAVE */
    // write results to json file
    await fs.writeFile(`results-${todays_date()}_${randomUUID()}.json`, JSON.stringify(images), console.err)

    await browser.close();
})();

async function autoScroll(page, crawl_function) {

    // return await page.evaluate((async (crawl_function) => {
    //     return await new Promise(resolve => {
    //         resolve([1, 2, 3]);
    //     })
    // }), crawl_function);

    // Example return from Promise
    return await page.evaluate(async () => {
        return await new Promise(async resolve => {
            async function crawl_function() {

                let selectors = {
                    // h3 with text "like this" or "like this" or "Find some ideas for this board"
                    more_like_this_text_h2_element_selector: "//h2[contains(text(), 'More ideas like') or contains(text(),'this')]",
                    find_more_ideas_for_this_board_h3_text_element_selector: "//h3[contains(text(), 'Find more') or contains(text(),'this')]",

                    pins_xpath_selector: "//div[@data-test-id='pin']",
                    pins_selector: 'div[data-test-id="pin"]',
                    video_pin_selector: 'div[data-test-id="PinTypeIdentifier"]',
                    pin_bottom_selector: 'div[data-test-id="pointer-events-wrapper"]',
                    pin_title_selector: 'div[data-test-id="pointer-events-wrapper"] a',
                    pin_img_xpath: '//div[@data-test-id="pin"]//img', // or 'img'
                }

                // script to run in browser #115.28
                let imagesArr = new Array()

                let halt_h2 = $x(selectors.more_like_this_text_h2_element_selector)[0]
                let halt_h3 = $x(selectors.find_more_ideas_for_this_board_h3_text_element_selector)[0]

                function filterDuplicates(...pins) {
                    return pins.filter((pin, index, self) =>
                        self.findIndex(p => p.pin_link === pin.pin_link) === index)
                }


                // V 103
                function parsePins(...pins) {
                    return [...pins].map(i => {
                        if (i == undefined || i == null) throw Error("Failed to parse pin")

                        let img = i.querySelector('img') ?? null
                        let original_img_link = ""

                        if (img !== null) {
                            // If there's no srcset, then the image is probably from a video
                            original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
                        }

                        let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
                        let pin_link = i.querySelector('a').href
                        let title = (i) => {
                            let title = [...i.querySelectorAll('a')][1].innerText ?? null
                            let pinAuthor = i.querySelector('span') == null ?
                                "Unknown" : i.querySelector('span').textContent

                            return title ? `${title} by ${pinAuthor} ` : `Untitled Pin by ${pinAuthor} `
                        }

                        title = title(i)

                        if (is_video == true) {
                            // if video, return title, pin_link, is_video no image link
                            return { title, pin_link, is_video, image: "" }
                        }


                        if ((is_video == false) && (original_img_link !== undefined)) {
                            return { title, pin_link, is_video, image: original_img_link }
                            // console.log(`${ title }, ${ pin_link }, ${ is_video } `)
                        }
                    })
                }


                function checkStop(el, halt_selectors) {

                    let exists = () => {
                        function isVisible(el) {
                            console.log("Element: ", el);
                            if (!el || (el === null || el === undefined)) return false;
                            let isInView = el.getBoundingClientRect().top <= window.innerHeight;
                            console.log(`IsVisible: ` + isInView)
                            return isInView
                        }

                        let halt_selectors = [selectors.find_more_ideas_for_this_board_h3_text_element_selector, selectors.more_like_this_text_h2_element_selector]

                        return halt_selectors.map(i => isVisible($x(i)[0])).map(Boolean).some(Boolean)

                    }
                    return exists()
                }

                function $$(selector, context) {
                    context = context || document;
                    var elements = context.querySelectorAll(selector);
                    return Array.prototype.slice.call(elements);
                }

                // https://stackoverflow.com/a/32623171
                // https://gist.github.com/iimos/e9e96f036a3c174d0bf4
                function xpath(el) {
                    if (typeof el == "string") return document.evaluate(el, document, null, 0, null)
                    if (!el || el.nodeType != 1) return ''
                    if (el.id) return "//*[@id='" + el.id + "']"
                    var sames = [].filter.call(el.parentNode.children, function (x) { return x.tagName == el.tagName })
                    return xpath(el.parentNode) + '/' + el.tagName.toLowerCase() + (sames.length > 1 ? '[' + ([].indexOf.call(sames, el) + 1) + ']' : '')
                }

                function isVisible(el) {
                    console.log(el);
                    if (!el || (el === null || el === undefined)) return false;
                    return el.getBoundingClientRect().top <= window.innerHeight;
                }

                function $x(xp) {
                    const snapshot = document.evaluate(
                        xp, document, null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                    );
                    return [...new Array(snapshot.snapshotLength)]
                        .map((_, i) => snapshot.snapshotItem(i))
                        ;
                };

                /* Use when logged in */
                function get_pins() {


                    let i = 0

                    while (i < 1) {

                        let pinWrappers = Array.from(document.querySelectorAll(selectors.pins_selector));

                        if (pinWrappers === undefined | pinWrappers.length == 0) {
                            console.log("No pins found")
                            return []
                        }
                        imagesArr.push(...pinWrappers)

                        i++


                    }

                    if (isVisible(halt_h2) | isVisible(halt_h3)) {
                        return
                    }

                }

                /* TODO: Make async callbacks for more data??? */
                return await new Promise((resolve) => {
                    // Quick browser test code
                    let pins = new Array()
                    let pinsMap = new Map()
                    /* SCROLLING MAY END */

                    setTimeout(() => { }, 1000)


                    let h3 = $x("//h3[contains(text(),'Find')]").pop() ?? null
                    let h2 = $x("//h2[contains(text(),'like this')]").pop() ?? null

                    let vis = false

                    let timer = setInterval(() => {
                        // let vis =  h3.getBoundingClientRect().top <= window.innerHeight
                        // let vis2 = h2.getBoundingClientRect().top <= window.innerHeight
                        let vis = isVisible(h3)
                        let vis2 = isVisible(h2)

                        window.scrollBy(0, 200)
                        // get h3 contains text 'find' xpath

                        pins.push(...[...$$('div[data-test-id="pin"]')])

                        if (vis | vis2) {
                            clearInterval(timer)

                            let parsedPins = parsePins(...pins)
                            parsedPins.forEach(p => pinsMap.set(p.pin_link, p))

                            console.log(pinsMap)

                            resolve(pinsMap)
                            // return pinsMap
                        }
                    }, 1000)

                });

            }

            let res = await crawl_function()
            // let res = () => new Promise((resolve) => {
            //     let sample_data = [
            //         {
            //             "title": "Can I get one of these in Romania? - Animals by Unknown",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721524835242/",
            //             "is_video": false,
            //             "image": "https://i.pinimg.com/originals/4d/b3/bd/4db3bd4cfa2139311fc512c7c23b35f0.jpg"
            //         },
            //         {
            //             "title": "Indulgy by Unknown",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721519869673/",
            //             "is_video": false,
            //             "image": "https://i.pinimg.com/originals/3f/31/99/3f319973f6f2186d0c9fc0acd6cc8b47.jpg"
            //         },
            //         {
            //             "title": "DAR – theCHIVE by My Cinema Lightbox",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721518644825/",
            //             "is_video": false,
            //             "image": "https://i.pinimg.com/originals/64/d8/6a/64d86a40a5d77f5e51bd694709d705ae.jpg"
            //         },
            //         {
            //             "title": "La dolcezza di Nessa, la cagnolina in miniatura che sembra un peluche by Unknown",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721518644817/",
            //             "is_video": false,
            //             "image": "https://i.pinimg.com/originals/90/6d/e9/906de98472871f3a9373d7a147fe3885.jpg"
            //         },
            //         {
            //             "title": "Untitled Pin by kiitan ajiboye",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721517323473/",
            //             "is_video": false,
            //             "image": "https://i.pinimg.com/originals/56/02/8d/56028d7d750a2028902d4ba680ee9ccc.jpg"
            //         },
            //         {
            //             "title": "Untitled Pin by kenfuku",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721515567528/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "Can I have a drink? by Happy Happy Joy Joy",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721514632948/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "cat by Funny Animals Life",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721514438484/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "Husky Gets Upset When I Tell Her Off for Eating a Chicken Wing Out of the Garbage by Skaya Siberian",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721514096441/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "funny puppies by Funny Animals Life",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721514096411/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "Runway Ready by Canadian Tire",
            //             "pin_link": "https://www.pinterest.ca/pin/Ab0lj0Le6vh_4SUXOU1XzEIt6_VUUPeYffDZIi1YDBsG1c6IenVzGzCdEfeVNyMudj-1ZWD5HZ_pqdIdGj08KGI/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "Untitled Pin by Unknown",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721513976288/",
            //             "is_video": true,
            //             "image": ""
            //         },
            //         {
            //             "title": "This puppo by Unknown",
            //             "pin_link": "https://www.pinterest.ca/pin/646477721513971819/",
            //             "is_video": true,
            //             "image": ""
            //         }
            //     ]
            //     resolve(sample_data)
            // })

            // resolve(await res())
            resolve([...res])
        })
    });
}
