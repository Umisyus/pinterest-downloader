// while(true){pins.push(...crawl()) if(pins.length == 1500) break;}

/* Works only when not logged in! */
function crawl(THRESHOLD = 100) {
    var chunks = new Set();
    let ii = 0

    // Crawl the page
    let i = 0;
    const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"

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
    let srcset = Array.from(chunks).map(x => x.href)
    return srcset
}
