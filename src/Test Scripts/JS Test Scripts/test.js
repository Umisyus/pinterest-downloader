// TEST CODE
// selectors
 const selectors = {
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

let pinWrappers = Array.from(document.querySelectorAll(selectors.pins_selector));

                // let pin_imgs = pinWrappers.map(i => i.querySelector('img').srcset.split(' ')[6])
                // let pin_links = pinWrappers.map(i => i.querySelector('a').href)

                // Get link, pin link and title of images
                  mappedPins = pinWrappers.map(i => {

                    if (i == undefined || i == null) return

                    let img = i.querySelector('img') ?? null
                    if (img == null) return;
                    // If there's no srcset, then the image is probably from a video
                    let original_img_link = img.srcset ? img.srcset.split(' ')[6] : img.src
                    // is video?
                    // Look for PinTypeIdentifier attribute in pin
                    // XPath
                    // $x('//div[@data-test-id="PinTypeIdentifier"]')
                    // QuerySelector
                    let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
                    // or $('div[data-test-id="PinTypeIdentifier"]')

                    let pin_link = i.querySelector('a').href
                    let title = (i) => {
                        let title = i.querySelector('a').textContent
                        let pinAuthor = i.querySelector('span') == null ? "Unknown" : i.querySelector('span').textContent

                        return title ? `${title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor}`
                    }
title = title(i)
                    if (is_video) {
                        return { is_video, title, pin_link }
                    }

                    return { image: original_img_link, title, pin_link }

                })
