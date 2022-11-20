/* My Crawler Example */
import { PlaywrightCrawler, createPlaywrightRouter, enqueueLinks, RequestQueue } from 'crawlee';

let RoutingTags = { LIST: "LIST_OF_LINKS" }
let SELECTORS = { linkSelector: "a" }

/* My 'routes.ts' file */
export const router = createPlaywrightRouter();
router.addDefaultHandler(async ({ log, request, page }) => {

    log.info(`request.url: ${request.url}`);

    let page_links = await getSpecficPageLinks(page, SELECTORS.linkSelector);
    page_links = JSON.parse(page_links)

    let rq = await RequestQueue.open('page_links');
    log.info(`Enqueuing links`, page_links);

   await enqueueLinks({
        urls: page_links, label: RoutingTags.LIST,
        requestQueue: rq,
        selector: SELECTORS.linkSelector
    })
});

// Using the router
router.addHandler(RoutingTags.LIST, async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

});
// @ts-ignore
async function getSpecficPageLinks(page, selector) {
    // @ts-ignore
    let links = await page.evaluate((selector) => {
        return Array.from(document.querySelectorAll(selector)).map((link) => {
            // @ts-ignore
            return link.href;
        })
    }, selector)

    return links
}

/* Run crawler */
let crawler = new PlaywrightCrawler({ requestHandler: router });
await crawler.run()
