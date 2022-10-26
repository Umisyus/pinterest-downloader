import * as puppeteer from 'puppeteer-core';

// https://stackoverflow.com/a/53527984
(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        slowMo: 500,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });

    const page = await browser.newPage();
    await page.goto('https://www.pinterest.ca/dracana96/cute-funny-animals/');
    await page.setViewport({
        width: 1200,
        height: 800
    });

    let images = await autoScroll(page, get_pins);

    console.log(images);

    // await page.screenshot({
    //     path: 'yoursite.png',
    //     fullPage: true
    // });

    await browser.close();
})();

async function autoScroll(page, get_pins) {

    return await page.evaluate(async (get_pins) => {
        function $$(selector, context) {
            context = context || document;
            var elements = context.querySelectorAll(selector);
            return Array.prototype.slice.call(elements);
        }
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
        function get_pins() {

            let pins = []

            let i = 0

            while (i < 5) {
                // @ts-ignore
                pins.push(...Array.from($$('img')
                    // Get the srcset attribute of the image
                    // @ts-ignore
                    .map(x => x.srcset ? x.srcset.split(' ')[6] : x.src)
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
        }
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            let images = []
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                console.log(images);
                // if (typeof get_pins === "function") {
                images.push(...get_pins())

                // log the number of images
                console.log(images.length)
                console.log(images)
                console.log(1)
                // }
                console.log(images.length);

                // Find h2 with text "More like this"
                let boardEnd = $x("//h2[contains(text(), 'More like this')]").length > 0 ? true : false;
                if (totalHeight >= scrollHeight - window.innerHeight || boardEnd) {
                    clearInterval(timer);
                    const uniqueImages = images
                        //FILTER EMPTY VALUES
                        .filter(i => i !== "")
                        .filter((e, i, a) => a.indexOf(e) == i)

                    resolve(uniqueImages);
                }
            }, 100);
        });
    });
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
