import * as puppeteer from 'playwright';
import { selectors } from './logged-in/pinterest-selectors.js';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

// https://stackoverflow.com/a/53527984
(async () => {
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


    /* SELECTORS */
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
    /* MAIN SCRIPT */
    let images = await autoScroll(page, get_pins, selectors);

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

    // await page.screenshot({
    //     path: 'yoursite.png',
    //     fullPage: true
    // });

    await browser.close();
})();

async function autoScroll(page, get_pins, selectors) {
    // half working v2
    return await page.evaluate(async (selectors) => {

        // script to run in browser #115.27
        let imagesMap = new Map()
        let imagesArr = new Array()

        let halt_h2 = $x(selectors.more_like_this_text_h2_element_selector)[0]
        let halt_h3 = $x(selectors.find_more_ideas_for_this_board_h3_text_element_selector)[0]

        function filterDuplicates(...pins) {
            return pins.filter((pin, index, self) =>
                self.findIndex(p => p.pin_link === pin.pin_link) === index)
        }


        // V 102
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

                    return title ? `${title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor}`
                }

                title = title(i)

                if (is_video) {
                    // if video, return title, pin_link, is_video no image link
                    return { title, pin_link, is_video, image: "" }
                }


                if (!is_video && original_img_link !== undefined) {
                    return { title, pin_link, is_video, image: original_img_link }
                    // console.log(`${title}, ${pin_link}, ${is_video}`)
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
            var totalHeight = 0;
            var distance = 100;

            /* SCROLLING MAY END */

            setTimeout(() => { }, 1000)

            var timer = setInterval(() => {

                // var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                let getpins = get_pins() ?? []

                if (getpins == undefined) console.log("No pins found");
                if (getpins !== undefined) {

                    // getpins.filter((pin) => pin !== undefined)

                    imagesArr.push(...getpins)

                    console.log(`Current Pins: ${getpins.length}`)

                    console.log(`Total Pins: ${imagesArr.length}`);
                }

                let stop = checkStop();

                if (stop) {
                    clearInterval(timer);

                    let parsedPins = parsePins(...imagesArr)

                    console.log(`Parsed Pins: ${parsedPins.length}`)

                    parsedPins.forEach(p => imagesMap.set(p.pin_link, p))

                    let values = [...imagesMap.values()]
                    let json = [...values]

                    debugger
                    resolve(json);
                    return json
                }

            }, 2000);

        });

    }, selectors);


}
// return await page.evaluate(async (selectors) => {
//     let halt_h2 = $x(selectors.more_like_this_text_h2_element_selector)[0];
//     let halt_h3 = $x(selectors.find_more_ideas_for_this_board_h3_text_element_selector)[0];

//     function $$(selector, context) {
//         context = context || document;
//         var elements = context.querySelectorAll(selector);
//         return Array.prototype.slice.call(elements);
//     }
//     // https://stackoverflow.com/a/32623171
//     // https://gist.github.com/iimos/e9e96f036a3c174d0bf4
//     function xpath(el) {
//         if (typeof el == "string") return document.evaluate(el, document, null, 0, null)
//         if (!el || el.nodeType != 1) return ''
//         if (el.id) return "//*[@id='" + el.id + "']"
//         var sames = [].filter.call(el.parentNode.children, function (x) { return x.tagName == el.tagName })
//         return xpath(el.parentNode) + '/' + el.tagName.toLowerCase() + (sames.length > 1 ? '[' + ([].indexOf.call(sames, el) + 1) + ']' : '')
//     }


//     let isVisible = (el) => {
//         console.log(el);
//         if (!el || (el === null || el === undefined)) return false;
//         return el.getBoundingClientRect().top <= window.innerHeight;
//     }

//     function $x(xp) {
//         const snapshot = document.evaluate(
//             xp, document, null,
//             XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
//         );
//         return [...new Array(snapshot.snapshotLength)]
//             .map((_, i) => snapshot.snapshotItem(i))
//             ;
//     };

//     /* Use when logged in */
//     function get_pins() {

//         let pins = []
//         let mappedPins = []
//         // let video_pins = []

//         let i = 0

//         while (i < 1) {

//             let pinWrappers = Array.from(document.querySelectorAll(selectors.pins_selector));

//             mappedPins = pinWrappers.map(i => {

//                 if (i == undefined || i == null) return

//                 let img = i.querySelector('img') ?? null
//                 if (img == null) return;
//                 // If there's no srcset, then the image is probably from a video
//                 let original_img_link = img.srcset ? img.srcset.split(' ')[6] : img.src

//                 let is_video = i.querySelector(selectors.video_pin_selector) ? true : false

//                 let pin_link = i.querySelector('a').href
//                 let title = (i) => {
//                     let title = i.querySelector('div[data-test-id="pointer-events-wrapper"] a') ? i.querySelector('div[data-test-id="pointer-events-wrapper"] a')?.textContent : ""
//                     let pinAuthor = i.querySelector('span') == null ? "Unknown" : i.querySelector('span').textContent

//                     return title ? `${title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor}`
//                 }
//                 title = title(i)
//                 console.log({ image: original_img_link, title, pin_link, is_video });
//                 return { image: original_img_link, title, pin_link, is_video }

//             })

//             // filter undefined
//             mappedPins = mappedPins.filter(i => i != undefined)

//             pins.push(...mappedPins)

//             i++
//         }

//         return mappedPins

//     }

//     /* TODO: Make async callbacks for more data??? */
//     let imgs = await new Promise((resolve) => {
//         var totalHeight = 0;
//         var distance = 100;
//         let images = []

//         var timer = setInterval(() => {
//             // var scrollHeight = document.body.scrollHeight;
//             window.scrollBy(0, distance);
//             totalHeight += distance;

//             let pins = get_pins()
//             if (pins) {

//                 images.push(...pins)
//             }


//             // filter duplicates by pin link
//             images = images.filter((v, i, a) => a.findIndex(t => (t.pin_link === v.pin_link)) === i)

//             // log the number of images
//             console.log(`# of images: ${images.length}`)
//             console.log(images)

//             if (isVisible(halt_h3) | isVisible(halt_h2)) {
//                 debugger
//                 clearInterval(timer);
//                 resolve(JSON.stringify({ images: images }));
//             }
//         }, 2000);
//     });

// }, selectors);
// }

let get_pins = `function $$(selector, context) {
    context = context || document;
    var elements = context.querySelectorAll(selector);
    return Array.prototype.slice.call(elements);
}
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
        // window.scrollBy(0, 250)

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
}`
