//   function manualChunk(array: KeyValueStoreRecord[], sizeLimit: number = 9 * 100_000_000) {
//         let results: KeyValueStoreRecord[][] = [];
//         let chunk: KeyValueStoreRecord[] = []
//         let sizeCount = 0;

//         for (let index = 0; index < array.length; index++) {
//             const element = array[index];
//             if (element.value.length + sizeCount > sizeLimit) {
//                 chunk = []
//                 results.push(chunk)
//             } else {
//                 chunk.push(element);
//             }
//         }
//         return results;
//     }

//   function manualChunk(array: KeyValueStoreRecord[], sizeLimit: number = 9 * 100_000_000) {
//         let results: KeyValueStoreRecord[][] = [];
//         let chunk: KeyValueStoreRecord[] = []
//         let sizeCount = 0;

//         for (let index = 0; index < array.length; index++) {
//             const element = array[index];
//             if (element.value.length + sizeCount > sizeLimit) {
//                 chunk = []
//                 results.push(chunk)
//             } else {
//                 chunk.push(element);
//             }
//         }
//         return results;
//     }

let stuff = [...Array(100).keys()].map(i => ({ key: `Key ${i}`, value: Math.ceil(Math.random() * 3) * 1_000_000 }))
let chunks = manualChunk(stuff)
console.log(chunks);

function manualChunk(array, sizeLimit = 9 * 1_000_000) {
    let results = []
    let chunk = []
    let sizeCount = 0;
    let chunkLength = 0
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        sizeCount += element.value

        chunkLength = chunk.length;
        const bool = sizeCount < sizeLimit;

        if (bool) {
            chunk.push(element);
        } else {
            results.push(chunk)
            chunk = []
            sizeCount = 0
            chunkLength = 0
            if (chunkLength === 0) {
                chunk.push(element)
                results.push([element])
            }
            results.filter(x => x.length === 1).forEach(x => chunk.push(element))
        }
    }
    return results;
}


// let stuff = [...Array(10).keys()].map(i => ({ key: `Key ${i}`, value: Math.ceil(Math.random() * 3) * 1_000_000 }))
// let chunks = manualChunk(stuff)
// console.log(chunks);

// function manualChunk(array, sizeLimit = 9 * 1_000_000) {
//     let results = []
//     let chunk = []
//     let sizeCount = 0;
//     let chunkLength = 0
//     for (let index = 0; index < array.length; index++) {
//         const element = array[index];
//         sizeCount += element.value

//         chunkLength = chunk.length;
//         const bool = sizeCount < sizeLimit;

//         if (bool) {
//             chunk.push(element);
//         } else {
//             results.push(chunk)
//             chunk = []
//             sizeCount = 0
//             chunkLength = 0
//             if (chunk.length === 0) {
//                 results.push([element])
//             }
//         }
//         results.filter(x => x.length === 1).forEach(x => chunk.push(element))
//         results.push(chunk)
//     }
//     return results;
// }
