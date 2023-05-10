export interface Input {
    APIFY_TOKEN: string,
    APIFY_USERNAME: string | undefined,
    DATASET_NAME: string,
    DOWNLOAD_LIMIT: number | undefined
}
export interface Item {
    url: string,
    isDownloaded: boolean,
    key: string,
    data: {
        value: Buffer
    }
}
