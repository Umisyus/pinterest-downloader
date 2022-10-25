/* Use when logged in */
function get_pins() {

    let pins = []

    let i = 0

    while (i < 5) {
        pins.push(...Array.from($$('img')
            // Get the srcset attribute of the image
            .map(x => x.srcset)

            // Filter out the urls that are not valid
            .filter(i => /\s|undefined|null/.exec(i)))
            // Split the srcset attribute into an array of urls
            .map(i => i.split(' ')[6])
            // Filter out the urls that are not valid
            .filter(i => i !== undefined || i !== ""))

        // Scroll down
        window.scrollBy(0, 250)

        // Filter duplicates

        // Credits: https://stackoverflow.com/a/32122760
        pins = pins.filter((e, i, a) => a.indexOf(e) == i)
        // and undefined values
        // Not sure if needed or not lol
        // .filter(i => i !== undefined)
        i++
    }
    // Return the array of urls
    return pins
}
