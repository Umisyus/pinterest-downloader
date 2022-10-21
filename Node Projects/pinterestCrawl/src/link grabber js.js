// Link grabber script
chunks = new Set();
img_selector = `img`

i = 0
do {
    chunks_before = Array.from($$(img_selector))
        .map(x => x.src)
    window.scrollBy(0, 300)
    chunks_before.forEach(chunks.add, chunks)
    console.log(chunks.size)
    i++
} while (i < 1000)


await navigator.clipboard.writeText(JSON.stringify(Array.from(chunks)))
