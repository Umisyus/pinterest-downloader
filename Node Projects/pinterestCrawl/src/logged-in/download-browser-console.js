
// // Extract pins from the page
// /** Use when logged in */


// function CrawlPage() {
//   // Gather pins from the page
//   let i = 0;
//   let img_selector = 'img'
//   let chunks = new Set()
//   do {
//     // Get current chunk of pins / images
//     let chunks_before = Array.from($$(img_selector))
//       .map(x => x)
//     // Scroll down to load more images
//     window.scrollBy(0, 200)
//     // Add current pins to set
//     chunks_before.forEach(chunks.add, chunks)
//     // Wait for more pins to load
//     setTimeout(2000)
//     i++
//   } while (i < 100)
//   // Extract pins from the page
//   let original_links = Array.from(...chunks).map(i => i.href)
//   return original_links
// }
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

async function fetchAll(params) {
  for await (const p of (params)) {
    // Download script
    fetch(p)
      .then(resp => resp.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // the filename you want
        a.download = 'pinterest-board-image';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('your file has downloaded!'); // or you know, something with better UX...
      })
      .catch(() => alert('oh no!'));

  }
}

