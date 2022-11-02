// V 107
// @ts-ignore
function parsePins(...pins) {
    // @ts-ignore
    return [...pins].map(i => {
        if (i == undefined || i == null) throw Error("Failed to parse pin")

        let img = i.querySelector('img') ?? null
        let original_img_link = ""

        if (img !== null) {
            // If there's no srcset, then the image is probably from a video
            if (img.srcset !== "") {
                // original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
                let srcset = img.srcset.split(' ')
                original_img_link = srcset[srcset.length - 2] ?? ""
            }

        }

        let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
        let pin_link = i.querySelector('a').href ?? ""
        // @ts-ignore
        let title = (i) => {
            let title = [...i.querySelectorAll('a')][1].innerText ?? null
            let pinAuthor = i.querySelector('span') == null ?
                "Unknown" : i.querySelector('span').textContent

            return title ? `${title} by ${pinAuthor} ` : `Untitled Pin by ${pinAuthor} `
        }
        // @ts-ignore
        title = title(i)

        if (is_video == true) {
            // if video, return title, pin_link, is_video no image link
            return { title, pin_link, is_video, image: "" }
        }


        if ((is_video == false) && (original_img_link !== undefined)) {
            return { title, pin_link, is_video, image: original_img_link }
            // console.log(`${ title }, ${ pin_link }, ${ is_video } `)
        }
    })
}

// // V 106
// // @ts-ignore
// function parsePins(...pins) {
//     // @ts-ignore
//     return [...pins].map(i => {
//         if (i == undefined || i == null) throw Error("Failed to parse pin")

//         let img = i.querySelector('img') ?? null
//         let original_img_link = ""

//         if (img !== null) {
//             // If there's no srcset, then the image is probably from a video
//             if (img.srcset !== "") {
//                 // original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
//                 let srcset = img.srcset.split(' ')
//                 original_img_link = srcset[srcset.length - 1] ?? ""
//             }

//         }

//         let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
//         let pin_link = i.querySelector('a').href ?? ""
//         // @ts-ignore
//         let title = (i) => {
//             let title = [...i.querySelectorAll('a')][1].innerText ?? null
//             let pinAuthor = i.querySelector('span') == null ?
//                 "Unknown" : i.querySelector('span').textContent

//             return title ? `${title} by ${pinAuthor} ` : `Untitled Pin by ${pinAuthor} `
//         }
//         // @ts-ignore
//         title = title(i)

//         if (is_video == true) {
//             // if video, return title, pin_link, is_video no image link
//             return { title, pin_link, is_video, image: "" }
//         }


//         if ((is_video == false) && (original_img_link !== undefined)) {
//             return { title, pin_link, is_video, image: original_img_link }
//             // console.log(`${ title }, ${ pin_link }, ${ is_video } `)
//         }
//     })
// }


// const selectors = {
//     // h3 with text "like this" or "like this" or "Find some ideas for this board"
//     more_like_this_text_h2_element_selector: "//h2[contains(text(), 'More ideas like') or contains(text(),'this')]",
//     find_more_ideas_for_this_board_h3_text_element_selector: "//h3[contains(text(), 'Find more') or contains(text(),'this')]",

//     pins_xpath_selector: "//div[@data-test-id='pin']",
//     pins_selector: 'div[data-test-id="pin"]',
//     video_pin_selector: 'div[data-test-id="PinTypeIdentifier"]',
//     pin_bottom_selector: 'div[data-test-id="pointer-events-wrapper"]',
//     pin_title_selector: 'div[data-test-id="pointer-events-wrapper"] a',
//     pin_img_xpath: '//div[@data-test-id="pin"]//img', // or 'img'
// }

// // V 103
// function parsePins(...pins) {
//     return [...pins].map(i => {
//         if (i == undefined || i == null) throw Error("Failed to parse pin")

//         let img = i.querySelector('img') ?? null
//         let original_img_link = ""

//         if (img !== null) {
//             // If there's no srcset, then the image is probably from a video
//             original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
//         }

//         let is_video = i.querySelector(selectors.video_pin_selector) ? true : false
//         let pin_link = i.querySelector('a').href
//         let title = (i) => {
//             let title = [...i.querySelectorAll('a')][1].innerText ?? null
//             let pinAuthor = i.querySelector('span') == null ?
//                 "Unknown" : i.querySelector('span').textContent

//             return title ? `${title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor}`
//         }

//         title = title(i)

//         if (is_video == true) {
//             // if video, return title, pin_link, is_video no image link
//             return { title, pin_link, is_video, image: "" }
//         }


//         if ((is_video == false) && (original_img_link !== undefined)) {
//             return { title, pin_link, is_video, image: original_img_link }
//             // console.log(`${title}, ${pin_link}, ${is_video}`)
//         }
//     })
// }
