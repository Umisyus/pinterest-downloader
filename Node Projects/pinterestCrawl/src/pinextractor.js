/* Works only when viewing a board while logged in! */
export function crawl(THRESHOLD = 100) {
    var chunks = new Set();

    // Crawl the page
    let i = 0;
    let ii = 0
    let img_selector = `img`;
    do {
        do {
            // Get current chunk of images
            chunks_before = Array.from($$(img_selector))
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
    let values = Array.from(chunks.values())
    return values

}

/* Use when logged in */
export function parse(chunks) {
    // Extracts links from images
    return Array.from(chunks).map(i => {
        // get src from image
        let srcs = i.getAttribute('srcset')
        // console.log(  srcs.split(' ')[6])
        // get the 6th (last) element in the srcset array
        let original_source_link = srcs.split(' ')[6]
        // return the link
        return original_source_link
    })
}
