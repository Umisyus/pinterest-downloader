
// Use when not logged in
// Crawl the page
const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"
// Get current chunk of images
let current_pins = Array.from(document.querySelectorAll(pins_selector))
    .map(i=>i.href)
// scroll down to load more images
window.scrollBy(0, 100)
//Add current chunk to set
totalPins.push(...current_pins)
totalPins.filter((e, i, a) => a.indexOf(e) === i)
// Show progress
console.info(totalPins.length)
// filter duplicates, undefined & nulls
current_pins.filter((e, i, a) => a.indexOf(e) == i).filter(i=>i!==undefined)
