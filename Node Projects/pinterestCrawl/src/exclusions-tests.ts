// Exclusions Test
import * as fs from 'fs/promises'
import path from 'path';

let dirname = path.dirname(process.argv[1])

const exclusion_file = await fs.readFile(dirname + '/../src/' + 'exclusions.json', 'utf8').catch((err) => {
    console.error('Could not read exclusions', err)
})
interface Exclusion {
    boardLink?: string,
    boardName?: string,
    sectionName?: string,
    sectionLink?: string
}


let exclusions = JSON.parse(exclusion_file ?? '[]')

let my_exclusions = [...exclusions
] as Exclusion[]

exclusions.push(my_exclusions)

function checkExcluded(url: string, exclusions: Exclusion[]): boolean {
    let excluded = false

    if (url === undefined) {
        return false
    }
    return exclusions.map(({ boardLink, boardName, sectionLink, sectionName
    }) => {
        if (boardLink !== undefined && boardLink == url) {
            excluded = true
        }
        // whoops, forgot to add the rest of the checks
        if (boardName !== undefined && boardName == url) {
            excluded = true
        }
        if (sectionLink !== undefined && sectionLink == url) {
            excluded = true
        }
        if (sectionName !== undefined && sectionName == url) {
            excluded = true
        }

        return excluded
    })
        // Get boolean value of excluded
        .reduce((acc, curr) => acc || curr)
}

let links = [
    "https://www.pinterest.ca/dracana96/pins/"

    , "https://www.pinterest.ca/dracana96/concept-art/"
    , "https://www.pinterest.ca/dracana96/concept-art/creatures/"

    , "https://www.pinterest.ca/dracana96/abstract-art/"

    , "https://www.pinterest.ca/dracana96/wallpapers/"

    , "https://www.pinterest.ca/dracana96/random-posts/"

    , "https://www.pinterest.ca/dracana96/my-saves/"

    , "https://www.pinterest.ca/dracana96/funny-photos/"

    , "https://www.pinterest.ca/dracana96/funny-cartoon-wallpapers/"

    , "https://www.pinterest.ca/dracana96/anime/"

    , "https://www.pinterest.ca/dracana96/cute-funny-animals/"

    , "https://www.pinterest.ca/dracana96/digital-painting-tutorials/"

    , "https://www.pinterest.ca/dracana96/james-bond/"

    , "https://www.pinterest.ca/dracana96/clear-face-mask/",
    "https://www.pinterest.ca/dracana96/clear-face-mask/coronavirus/",
]

let boardNames = links.map((link) => {
    let boardName = link.split('/')
    return boardName[boardName.length - 2]
})

let isExcluded = checkExcluded(links[1], exclusions)

console.log("Test board names: ", boardNames);

boardNames.forEach((boardName) => {
    console.log(boardName)
    console.log(checkExcluded(boardName, exclusions))
})

let sectionNames = links.map((link) => {
    let sectionName = link.split('/')
    return sectionName[sectionName.length - 2]
})

console.log("Test section names:", sectionNames);
sectionNames.forEach((sectionName) => {
    console.log(sectionName)
    console.log(checkExcluded(sectionName, exclusions))
})
