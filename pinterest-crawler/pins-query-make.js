let json_fetch_options = JSON.parse(`{"options":{
    "privacy_filter": "all",
    "sort": "last_pinned_to",
    "field_set_key": "grid_item",
    "filter_stories": false,
    "username": "pinterest",
    "page_size": 200,
    "group_by": "mix_public_private",
    "include_archived": true,
    "redux_normalize_feed": true
  }}`)

let pins_query_make = (options) => `https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2Fdracana96%2F&data=${options}&_=1670291829532`

pins_query_make(encodeURIComponent(JSON.stringify(json_fetch_options)))
