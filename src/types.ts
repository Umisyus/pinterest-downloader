
export interface Section {
    sectionName: string,
    sectionLink: string,
    boardLink: string,
    boardName: string,
    sectionPins: Pin[]
}
export interface Board {
    boardName: string,
    boardLink: string,
    boardPins: Pin[],
    sections: Section[] | []
}
export interface Pin {
    title: string,
    is_video: boolean,
    image_link: string,
    pin_link: string,
}
