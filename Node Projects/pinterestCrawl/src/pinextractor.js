export default function crawl(url = 'http://pinterest.ca', THRESHOLD = 100) {
    // TODO: add username later.

    if (!url) url = 'http://pinterest.ca'
    if (!THRESHOLD) THRESHOLD = 100

    // Crawl the page
    let chunks = new Set();
    let i = 0;
    image_selector = `img`;
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
    return [chunks]
}

export default function parse(chunks) {
    // Extracts links from images
    Array.from(chunks).map(i => {
        // get src from image
        let srcs = i.getAttribute('srcset')
        // console.log(  srcs.split(' ')[6])
        // get the 6th (last) element in the srcset array
        let original_source_link = srcs.split(' ')[6]
        // return the link
        return original_source_link
    })
}

console.log(parse(chunks));
module.exports = { crawl, parse }
