// /* Use when not logged in */
// // export
//  function crawl(THRESHOLD = 100) {
//     var chunks = new Array();
//     let ii = 0
//     // TODO: add username later.
//     if (!THRESHOLD) THRESHOLD = 100

//     // Crawl the page
//     let i = 0;
//     const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"

//     console.info("IN CRAWLER FUNCTION");

//     do {
//         do {
//             // Get current chunk of images
//             let chunks_before = Array.from(document.querySelectorAll(pins_selector))

//             // scroll down to load more images
//             window.scrollBy(0, 100)
//             //Add current chunk to set
//             chunks_before.forEach(chunks.add, chunks)
//             // Show progress
//             console.info(chunks.size)
//             i++
//         } while (i < 100)
//         ii++
//     }
//     while (ii < THRESHOLD)
//     // get srcset from imgs
//     let srcset = Array.from(chunks).map(x => x.href)
//     return srcset
// }
