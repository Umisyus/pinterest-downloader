// Link grabber script
// Works only when logged in!

function get_pins_set() {
    img_selector = `img`
    let chunks = new Set()
    i = 0
    do {
        chunks_before = Array.from($$(img_selector))
            .map(x => x.src)
        window.scrollBy(0, 300)
        chunks_before.forEach(chunks.add, chunks)
        console.log(chunks.size)
        i++
    } while (i < 10)
    return chunks
}
// await navigator.clipboard.writeText(JSON.stringify(Array.from(chunks)))
