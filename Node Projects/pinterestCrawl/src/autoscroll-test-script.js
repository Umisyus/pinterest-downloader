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
    await page.goto('https://www.pinterest.ca/dracana96/cute-funny-animals/', { waitUntil: 'domcontentloaded' });
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

                // get image from pin wrapper

                // $$('div[data-test-id="deeplink-wrapper"]:nth-child(1) img')

                // Get pins from first list of pins
                // $$('div[role="list"]:nth-child(1) div[data-test-id="deeplink-wrapper"]:nth-child(1) img')
                // Get element's position from page
                // $x('//*/div/div/div[5]/div/div/div[2]/div/div[1]/div/h2').pop().getBoundingClientRect()
                // Test if element is in viewport

                let imgs = Array.from(document.querySelectorAll('img'))
                    // @ts-ignore
                    // Filter out the urls that are not valid
                    .filter(i => /\s|undefined|null/.exec(i))
                    // Get the srcset attribute of the image
                    .map(x => x.srcset ? x.srcset.split(' ')[6] : x.src)

                pins.push(...imgs)

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
            console.log(pins);
            // Return the array of urls

            return pins
        }
        let imgs = await new Promise((resolve) => {
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
                debugger
                // log the number of images
                console.log(`# of images: ${images.length}`)
                console.log(images)
                // }

                // Find h2 with text "More like this"
                // $x("//h2[contains(text(), 'More like this')]")

                let more_text_element = $x("//h2[contains(text(), 'More like this')]")[0]
                // If it exists, stop scrolling, we're done collecting images
                let isVisible = (more) => more.getBoundingClientRect().top <= (window.innerHeight)

                // Re-evaluate the element's visibility???

                if (isVisible(more_text_element) === true
                    // || totalHeight >= scrollHeight - window.innerHeight
                ) {
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
        debugger
        return imgs;
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
