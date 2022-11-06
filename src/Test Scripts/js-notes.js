// JS Notes
// Get image title on pin page
// $x(`string(//*[@data-test-id="pinTitle"]/h1//text())`)

// Get image title using XPath from image element
// $x(`string(//div[@data-test-id="pinTitle"]/h1//text())`)

// $x('//div[@data-test-id="pin"]')
//     .map(i => {
//         let x = xpath(i)
//         let imgEl = `${x}//img`

//         let original = $x(imgEl)[0].srcset.split(' ')[6]
//         let pin_link = $x(`${x}//a`)[0].href

//         return { original, pin_link }
//     })

// Get image from pin wrapper
// someId3 = document.querySelector('div[data-test-id="pinWrapper"]')
// result3 = document.evaluate('.//a', testDIV, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
