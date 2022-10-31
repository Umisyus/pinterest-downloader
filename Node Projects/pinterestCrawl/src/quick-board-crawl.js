// Quick browser test code
pins = new Array()
pinsMap = new Map()
// V 103
function parsePins(...pins) {
    return [...pins].map(i => {
        if (i == undefined || i == null) throw Error("Failed to parse pin")

        let img = i.querySelector('img') ?? null
        let original_img_link = ""

        if (img !== null) {
            // If there's no srcset, then the image is probably from a video
            original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
        }

        let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
        let pin_link = i.querySelector('a').href
        let title = (i) => {
            let title = [...i.querySelectorAll('a')][1].innerText ?? null
            let pinAuthor = i.querySelector('span') == null ?
                "Unknown" : i.querySelector('span').textContent

            return title ? `${title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor}`
        }

        title = title(i)

        if (is_video == true) {
            // if video, return title, pin_link, is_video no image link
            return { title, pin_link, is_video, image: "" }
        }


        if ((is_video == false) && (original_img_link !== undefined)) {
            return { title, pin_link, is_video, image: original_img_link }
            // console.log(`${title}, ${pin_link}, ${is_video}`)
        }
    })
}
h3 = $x("//h3[contains(text(),'Find')]").pop() ?? null
vis = false

timer = setInterval(()=>{
vis = h3.getBoundingClientRect().top <= window.innerHeight

window.scrollBy(0, 200)
// get h3 contains text 'find' xpath

pins.push(...[...$$('div[data-test-id="pin"]')])
if (vis){
 clearInterval(timer)

parsedPins = parsePins(...pins)
parsedPins.forEach(p => pinsMap.set(p.pin_link, p))

console.log(pinsMap)
}
}, 1000)
