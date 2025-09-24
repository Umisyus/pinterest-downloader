export interface Input {
    APIFY_TOKEN: string,
    APIFY_USERNAME: string | undefined,
    DATASET_NAME_OR_ID: string,
    DOWNLOAD_LIMIT?: number | undefined,
    CONCURRENT_DOWNLOADS?: number | undefined,
    DATASET_URL?: string | undefined,
    ZIP?: boolean | undefined
}

export interface Item {
    url: string,
    isDownloaded: boolean,
    key: string,
    // data: {
    //     value: Buffer
    // }
}
