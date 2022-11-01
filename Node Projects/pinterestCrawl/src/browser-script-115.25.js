let selectors = {
    // h3 with text "like this" or "like this" or "Find some ideas for this board"
    more_like_this_text_h2_element_selector: "//h2[contains(text(), 'More ideas like') or contains(text(),'this')]",
    find_more_ideas_for_this_board_h3_text_element_selector: "//h3[contains(text(), 'Find more') or contains(text(),'this')]",

    pins_xpath_selector: "//div[@data-test-id='pin']",
    pins_selector: 'div[data-test-id="pin"]',
    video_pin_selector: 'div[data-test-id="PinTypeIdentifier"]',
    pin_bottom_selector: 'div[data-test-id="pointer-events-wrapper"]',
    pin_title_selector: 'div[data-test-id="pointer-events-wrapper"] a',
    pin_img_xpath: '//div[@data-test-id="pin"]//img', // or 'img'
}

// script to run in browser #115.25
let imagesMap = new Map()
let imagesArr = new Array()

let halt_h2 = $x(selectors.more_like_this_text_h2_element_selector)[0]
let halt_h3 = $x(selectors.find_more_ideas_for_this_board_h3_text_element_selector)[0]

function filterDuplicates(...pins) {
    return pins.filter((pin, index, self) =>
        self.findIndex(p => p.pin_link === pin.pin_link) === index)
}


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


function checkStop(el, halt_selectors) {

    let exists = () => {
        function isVisible(el) {
            console.log("Element: ", el);
            if (!el || (el === null || el === undefined)) return false;
            let isInView = el.getBoundingClientRect().top <= window.innerHeight;
            console.log(`IsVisible: ` + isInView)
            return isInView
        }

        let halt_selectors = [selectors.find_more_ideas_for_this_board_h3_text_element_selector, selectors.more_like_this_text_h2_element_selector]

        return halt_selectors.map(i => isVisible($x(i)[0])).map(Boolean).some(Boolean)

    }
    return exists()
}

function $$(selector, context) {
    context = context || document;
    var elements = context.querySelectorAll(selector);
    return Array.prototype.slice.call(elements);
}

// https://stackoverflow.com/a/32623171
// https://gist.github.com/iimos/e9e96f036a3c174d0bf4
function xpath(el) {
    if (typeof el == "string") return document.evaluate(el, document, null, 0, null)
    if (!el || el.nodeType != 1) return ''
    if (el.id) return "//*[@id='" + el.id + "']"
    var sames = [].filter.call(el.parentNode.children, function (x) { return x.tagName == el.tagName })
    return xpath(el.parentNode) + '/' + el.tagName.toLowerCase() + (sames.length > 1 ? '[' + ([].indexOf.call(sames, el) + 1) + ']' : '')
}

function isVisible(el) {
    console.log(el);
    if (!el || (el === null || el === undefined)) return false;
    return el.getBoundingClientRect().top <= window.innerHeight;
}

function $x(xp) {
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


    let i = 0

    while (i < 1) {

        let pinWrappers = Array.from(document.querySelectorAll(selectors.pins_selector));

        if (pinWrappers === undefined | pinWrappers.length == 0) {
            console.log("No pins found")
            return []
        }
        imagesArr.push(...pinWrappers)

        i++


    }

    if (isVisible(halt_h2) | isVisible(halt_h3)) {
        return
    }

}

/* TODO: Make async callbacks for more data??? */
let imgs = await new Promise((resolve) => {
    var totalHeight = 0;
    var distance = 100;

    /* SCROLLING MAY END */

    setTimeout(() => { }, 1000)

    var timer = setInterval(() => {

        // var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        let getpins = get_pins() ?? []

        if (getpins == undefined) console.log("No pins found");
        if (getpins !== undefined) {

            // getpins.filter((pin) => pin !== undefined)

            imagesArr.push(...getpins)

            console.log(`Current Pins: ${getpins.length}`)

            console.log(`Total Pins: ${imagesArr.length}`);
        }

        let stop = checkStop();

        if (stop) {
            clearInterval(timer);

            let parsedPins = parsePins(...imagesArr)

            console.log("Mapping pins")

            parsedPins.forEach(p => imagesMap.set(p.pin_link, p))

            let values = [...imagesMap.values()]
            let json = JSON.stringify(...values)

            debugger
            resolve(json);
        }

    }, 2000);

});
