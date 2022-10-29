import * as puppeteer from 'puppeteer-core';
import { selectors } from './logged-in/pinterest-selectors.js';

// https://stackoverflow.com/a/53527984
(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        slowMo: 500,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });

    const page = await browser.newPage();
    await page.goto('https://www.pinterest.ca/dracana96/cute-funny-animals/', { waitUntil: 'domcontentloaded' });
    await page.setViewport({
        width: 1200,
        height: 800
    });

    let images = await autoScroll(page, get_pins, selectors);
    debugger
    console.log(images);

    // await page.screenshot({
    //     path: 'yoursite.png',
    //     fullPage: true
    // });

    await browser.close();
})();

async function autoScroll(page, get_pins, selectors) {

    return await page.evaluate(async (selectors) => {
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

        // console.log(selectors);
        // debugger;

        // Find h2 element with text like or this

        // $x("//h2[contains(text(), 'like') and contains(text(),'this')]")[0]
        // When logged in using Chrome
        // $x("//h3[contains(text(), 'like') or contains(text(),'this')]")
        // When not logged in, the "like this" text is not present
        // $x("//h2[contains(text(), 'Find some ideas for this board')]")[0]

        // let halt = () => $$("h2").find(h => h.textContent.includes('like this')).getBoundingClientRect().top <= window.innerHeight
        // let halt = $$("h2").find(h => h.textContent.includes('like this'))

        let isVisible = (el) => {
            console.log(el);
            if (!el || (el === null || el === undefined)) return false;
            debugger;
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

            let pins = []
            let mappedPins = []
            let i = 0

            while (i < 1) {
                // @ts-ignore

                // get image from pin wrapper

                // $$('div[data-test-id="deeplink-wrapper"]:nth-child(1) img')

                // Get pins from first list of pins
                // $$('div[role="list"]:nth-child(1) div[data-test-id="deeplink-wrapper"]:nth-child(1) img')
                // Get element's position from page
                // $x('//*/div/div/div[5]/div/div/div[2]/div/div[1]/div/h2').pop().getBoundingClientRect()
                // Test if element is in viewport
                let pinWrappers = Array.from(document.querySelectorAll(selectors.pins_selector));

                // let pin_imgs = pinWrappers.map(i => i.querySelector('img').srcset.split(' ')[6])
                // let pin_links = pinWrappers.map(i => i.querySelector('a').href)

                // Get link, pin link and title of images
                mappedPins = pinWrappers.map(i => {

                    if (i == undefined || i == null) return

                    let img = i.querySelector('img') ?? null
                    if (img == null) return;
                    let original_img_link = img.srcset ? img.srcset.split(' ')[6] : img.src
                    // is video?
                    // Look for PinTypeIdentifier attribute in pin
                    // XPath
                    // $x('//div[@data-test-id="PinTypeIdentifier"]')
                    // QuerySelector
                    let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
                    // or $('div[data-test-id="PinTypeIdentifier"]')

                    let pin_link = i.querySelector('a').href
                    let title = i.querySelector(`${selectors.pin_bottom_selector} a`) ?? ''

                    if (is_video) {
                        return { image: (is_video ? '' : original_img_link), title, pin_link }
                    }

                    return { image: original_img_link, title, pin_link }

                })
                // Grab parent element of image for name, pin link, and section / board link
                // $x('//div[@data-test-id="deeplink-wrapper"][1]//img')

                // get pin img xpath
                // Get pin link xpath $x('//img/../../../../../../.././a[@aria-label]')

                // Filter out the urls that are not valid
                // imgs = imgs.filter(i => /\s|undefined|null/.exec(i))
                //     // Get the srcset attribute of the image
                //     .map(x => x.srcset ? x.srcset.split(' ')[6] : x.src)

                pins.push(...mappedPins)
                // pins.push(...{ imgs, pin_links })

                // .filter(i => i !== undefined || i !== ""))

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

            console.log(pins, mappedPins);

            let halt_h2 = $x(selectors.more_like_this_text_h2_element_selector)[0]
            let halt_h3 = $x(selectors.find_more_like_this_text_h3_element_selector)[0]

            if (isVisible(halt_h2) || isVisible(halt_h3)) {
                return { pins, mappedPins }
            }

        }


        /* TODO: Make async callbacks for more data??? */
        return await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            let images = []
            var timer = setInterval(() => {
                // var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                console.log(images);

                // Get images from page
                images.push(...[...get_pins().mappedPins])
                debugger

                // log the number of images
                console.log(`# of images: ${images.length}`)
                console.log(images)

                /* SCROLLING MAY END */
                let halt_h2 = $x(selectors.more_like_this_text_h2_element_selector)[0]
                let halt_h3 = $x(selectors.find_more_like_this_text_h3_element_selector)[0]

                if (isVisible(halt_h2) || isVisible(halt_h3)) {
                    debugger;

                    clearInterval(timer);
                    const uniqueImages = images
                        // FILTER EMPTY VALUES
                        .filter(i => i !== "")
                        // FILTER DUPLICATES
                        .filter((e, i, a) => a.indexOf(e) == i)
                    // return the array of images
                    debugger
                    // resolve({ uniqueImages });
                    resolve({ images: JSON.stringify(uniqueImages) });
                }
            }, 100);
        });

    }, selectors);
}

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
