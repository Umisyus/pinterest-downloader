let userName = 'dracana96'
let bookmark = "P2M2NDY0Nzc3MjE1MjQ3NjcwMzkuMTY1NjUxOTIyOXwzMjV8YTQ3ZmM5NmRkOGZiM2QwOTUzMGIyZWIxOGQwNWM2NGM1NGZlMTNkYWZhNTA5NDQ1OThmYjFhYTMzOGUzZTE3YXxORVd8"
// let obj = "{\"options\":{\"is_own_profile_pins\":true,\"username\":\"dracana96\",\"field_set_key\":\"grid_item\",\"pin_filter\":null,\"bookmarks\":\"P2M2NDY0Nzc3MjE1MjgzNzQx…DcwM2I5YzMzMjcyfE5FV3w=\"},\"context\":{}}"
let obj = (userName, bookmark) => `{"options":{"is_own_profile_pins":true,"username":${userName},"field_set_key":"grid_item","pin_filter":null,"bookmarks":${bookmark}},"context":{}}`

let userUrl = (un, obj, bm) => (`https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2F${un}%2Fpins%2F&data=${obj}&_=1670128238202`)

let objectToEncodedString = (o) => encodeURIComponent(JSON.stringify(o))

userUrl("dracana96", objectToEncodedString(obj(userName, bookmark)))
