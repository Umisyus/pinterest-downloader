export interface PinterestBoardData {
    resource_response: ResourceResponse;
    request_identifier: string;
}


export interface ResourceResponse {
    status: string;
    code: number;
    data: Datum[];
    message: string;
    endpoint_name: string;
    bookmark: string;
    x_pinterest_sli_endpoint_name: string;
    http_status: number;
}

export interface Datum {
    title: string;
    done_by_me: boolean;
    video_status_message: null;
    creator_analytics: null;
    debug_info_html: null;
    promoted_is_removable: boolean;
    product_pin_data: null;
    has_required_attribution_provider: boolean;
    repin_count: number;
    is_downstream_promotion: boolean;
    story_pin_data_id: string;
    pinner: Pinner;
    reaction_counts: { [key: string]: number };
    shopping_flags: any[];
    is_promoted: boolean;
    rich_summary: RichSummary | null;
    favorited_by_me: boolean;
    dominant_color: string;
    image_signature: string;
    favorite_user_count: number;
    alt_text: null | string;
    is_repin: boolean;
    type: DatumType;
    native_creator: Pinner | null;
    board: Board;
    link: null | string;
    id: string;
    is_eligible_for_related_products: boolean;
    domain: string;
    story_pin_data: StoryPinData | null;
    video_status: null;
    videos: Videos | null;
    grid_title: string;
    category: string;
    images: { [key: string]: Image };
}

export interface StoryPinData {
    page_count: number;
    id: string;
    is_deleted: boolean;
    last_edited: null;
    pages_preview: Page[];
    pages: Page[];
    has_product_pins: boolean;
    static_page_count: number;
    has_affiliate_products: boolean;
    total_video_duration: number;
    type: string;
    metadata: Metadata;
}

export interface Metadata {
    root_pin_id: string;
    pin_image_signature: string;
    compatible_version: string;
    recipe_data: null;
    root_user_id: string;
    diy_data: null;
    template_type: null;
    is_compatible: boolean;
    canvas_aspect_ratio: number;
    is_promotable: boolean;
    basics: null;
    version: string;
    pin_title: string;
    is_editable: boolean;
}

export interface Page {
    blocks: Block[];
}

export interface Block {
    block_type: number;
    video: Video;
}

export interface Video {
    video_list: VideoList;
    id: string;
}

export interface VideoList {
    V_EXP6: VExp3;
    V_EXP5: VExp3;
    V_EXP3: VExp3;
    V_HLSV3_MOBILE: VExp3;
    V_EXP7: VExp3;
    V_EXP4: VExp3;
}

export interface VExp3 {
    width: number;
    height: number;
    duration: number;
    url: string;
    thumbnail: string;
    captions_urls: null;
    best_captions_url: null;
}


export interface Board {
    type: BoardType;
    collaborated_by_me: boolean;
    id: string;
    followed_by_me: boolean;
    url: URL;
    name: Name;
    is_collaborative: boolean;
    owner: Pinner;
}

export enum Name {
    ConceptArt = "Concept art",
}

export interface Pinner {
    id: string;
    username: string;
}

export enum LastName {
    CoisasIlícitas = "coisas ilícitas",
    Dias = "Dias",
    Empty = "",
    Pages = "Pages",
    Sindorei = "Sindorei",
}



export enum BoardType {
    Board = "board",
}

export interface Image {
    url: string;
}

export interface RichSummary {
    display_name: string;
    id: string;
    display_description: string;
    url: string;
    type: RichSummaryType;
}


export enum RichSummaryType {
    Richpingriddata = "richpingriddata",
}

export enum DatumType {
    Pin = "pin",
}

export interface Videos {
    id: string;
    video_list: VideoList;
}

export interface VHlsv {
    url: string;
    width: number;
    height: number;
    duration: number;
    thumbnail: string;
}
