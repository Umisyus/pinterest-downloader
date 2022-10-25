// await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20_000 });
// click on each pin
// const pins = page.locator("img")
import { Page } from "playwright";
import { Locator } from 'playwright';
(async (page: { page: Page }) => {
    // @ts-ignore
    const boards: Locator = page.locator(`//div[@role='list']`)
    let boardcount = await boards.count()
    console.log('Getting pins...')

    let pins_links: string[] = []

    for (let index = 0; index < boardcount; index++) {
        const board = boards.nth(index);

        await board.click().catch((err) => console.log(err))
        // @ts-ignore
        let pins = await page.evaluate(async () => {
            function parseImg(pins: string) {
                let original_source_link = pins.split(' ')[6]
                // return the link
                return original_source_link
            }
            function crawl(THRESHOLD = 100) {
                // TODO: add username later.
                let chunks = new Set();
                let ii = 0

                // if (!THRESHOLD) THRESHOLD = 100

                // Crawl the page
                let i = 0;
                let image_selector = `img`;
                do {
                    do {
                        // Get current chunk of images
                        let chunks_before = Array.from(document.querySelectorAll(image_selector))
                            .map(x => x)
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
                let srcset = Array.from(chunks).map(x => x.srcset)
                return srcset
            }
            let pins = crawl(2000)

            return {
                mappedPins: pins.map((pin) => parseImg(pin))
            }
        });

        pins_links.concat(pins.mappedPins as string[] ?? [])
        // @ts-ignore
        await page.goBack();
        // let url = page.url()
    }
});
