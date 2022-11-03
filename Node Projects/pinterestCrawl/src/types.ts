// To parse this data:
//
//   import { Convert } from "./file";
//
//   const pinterestData = Convert.toPinterestData(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export type PinterestData = PinterestDatum[] | PurplePinterestDatum;

export interface PinterestDatum {
    section?:      string;
    section_pins?: Array<SectionPinElement[]>;
}

export type SectionPinElement = SectionPinClass | string;

export interface SectionPinClass {
    title?:    string;
    pin_link?: string;
    is_video?: boolean;
    image?:    string;
}

export interface PurplePinterestDatum {
    section?:      string;
    section_pins?: Array<SectionPinElement[]>;
    board?:        Board;
}

export interface Board {
    boardName?:  string;
    sections?:   PinterestDatum[];
    board_pins?: Array<SectionPinElement[]>;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toPinterestDatum(json: string): PinterestDatum {
        return cast(JSON.parse(json), r("PinterestDatum"));
    }

    public static pinterestDatumToJson(value: PinterestDatum): string {
        return JSON.stringify(uncast(value, r("PinterestDatum")), null, 2);
    }

    public static toSectionPinClass(json: string): SectionPinClass {
        return cast(JSON.parse(json), r("SectionPinClass"));
    }

    public static sectionPinClassToJson(value: SectionPinClass): string {
        return JSON.stringify(uncast(value, r("SectionPinClass")), null, 2);
    }

    public static toPurplePinterestDatum(json: string): PurplePinterestDatum {
        return cast(JSON.parse(json), r("PurplePinterestDatum"));
    }

    public static purplePinterestDatumToJson(value: PurplePinterestDatum): string {
        return JSON.stringify(uncast(value, r("PurplePinterestDatum")), null, 2);
    }

    public static toBoard(json: string): Board {
        return cast(JSON.parse(json), r("Board"));
    }

    public static boardToJson(value: Board): string {
        return JSON.stringify(uncast(value, r("Board")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "PinterestDatum": o([
        { json: "section", js: "section", typ: u(undefined, "") },
        { json: "section_pins", js: "section_pins", typ: u(undefined, a(a(u(r("SectionPinClass"), "")))) },
    ], false),
    "SectionPinClass": o([
        { json: "title", js: "title", typ: u(undefined, "") },
        { json: "pin_link", js: "pin_link", typ: u(undefined, "") },
        { json: "is_video", js: "is_video", typ: u(undefined, true) },
        { json: "image", js: "image", typ: u(undefined, "") },
    ], false),
    "PurplePinterestDatum": o([
        { json: "section", js: "section", typ: u(undefined, "") },
        { json: "section_pins", js: "section_pins", typ: u(undefined, a(a(u(r("SectionPinClass"), "")))) },
        { json: "board", js: "board", typ: u(undefined, r("Board")) },
    ], false),
    "Board": o([
        { json: "boardName", js: "boardName", typ: u(undefined, "") },
        { json: "sections", js: "sections", typ: u(undefined, a(r("PinterestDatum"))) },
        { json: "board_pins", js: "board_pins", typ: u(undefined, a(a(u(r("SectionPinClass"), "")))) },
    ], false),
};


// // To parse this data:
// //
// //   import { Convert, PinterestData } from "./file";
// //
// //   const pinterestData = Convert.toPinterestData(json);
// //
// // These functions will throw an error if the JSON doesn't
// // match the expected interface, even if the JSON is valid.

// export interface PinterestData {
//     board?: Board;
// }

// export interface Board {
//     boardName?: string;
//     sections?: Section[];
//     board_pins?: Array<BoardPinElement[]>;
// }

// export type BoardPinElement = BoardPinClass;

// export interface BoardPinClass {
//     title?: string;
//     pin_link?: string;
//     is_video?: boolean;
//     image?: string;
// }

// export interface Section {
//     section?: string;
//     section_pins?: Array<BoardPinElement[]>;
// }

// // Converts JSON strings to/from your types
// // and asserts the results of JSON.parse at runtime
// export class Convert {
//     public static toPinterestData(json: string): PinterestData {
//         return cast(JSON.parse(json), r("PinterestData"));
//     }

//     public static pinterestDataToJson(value: PinterestData): string {
//         return JSON.stringify(uncast(value, r("PinterestData")), null, 2);
//     }

//     public static toBoard(json: string): Board {
//         return cast(JSON.parse(json), r("Board"));
//     }

//     public static boardToJson(value: Board): string {
//         return JSON.stringify(uncast(value, r("Board")), null, 2);
//     }

//     public static toBoardPinClass(json: string): BoardPinClass {
//         return cast(JSON.parse(json), r("BoardPinClass"));
//     }

//     public static boardPinClassToJson(value: BoardPinClass): string {
//         return JSON.stringify(uncast(value, r("BoardPinClass")), null, 2);
//     }

//     public static toSection(json: string): Section {
//         return cast(JSON.parse(json), r("Section"));
//     }

//     public static sectionToJson(value: Section): string {
//         return JSON.stringify(uncast(value, r("Section")), null, 2);
//     }
// }

// function invalidValue(typ: any, val: any, key: any = ''): never {
//     if (key) {
//         throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
//     }
//     throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`,);
// }

// function jsonToJSProps(typ: any): any {
//     if (typ.jsonToJS === undefined) {
//         const map: any = {};
//         typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
//         typ.jsonToJS = map;
//     }
//     return typ.jsonToJS;
// }

// function jsToJSONProps(typ: any): any {
//     if (typ.jsToJSON === undefined) {
//         const map: any = {};
//         typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
//         typ.jsToJSON = map;
//     }
//     return typ.jsToJSON;
// }

// function transform(val: any, typ: any, getProps: any, key: any = ''): any {
//     function transformPrimitive(typ: string, val: any): any {
//         if (typeof typ === typeof val) return val;
//         return invalidValue(typ, val, key);
//     }

//     function transformUnion(typs: any[], val: any): any {
//         // val must validate against one typ in typs
//         const l = typs.length;
//         for (let i = 0; i < l; i++) {
//             const typ = typs[i];
//             try {
//                 return transform(val, typ, getProps);
//             } catch (_) { }
//         }
//         return invalidValue(typs, val);
//     }

//     function transformEnum(cases: string[], val: any): any {
//         if (cases.indexOf(val) !== -1) return val;
//         return invalidValue(cases, val);
//     }

//     function transformArray(typ: any, val: any): any {
//         // val must be an array with no invalid elements
//         if (!Array.isArray(val)) return invalidValue("array", val);
//         return val.map(el => transform(el, typ, getProps));
//     }

//     function transformDate(val: any): any {
//         if (val === null) {
//             return null;
//         }
//         const d = new Date(val);
//         if (isNaN(d.valueOf())) {
//             return invalidValue("Date", val);
//         }
//         return d;
//     }

//     function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
//         if (val === null || typeof val !== "object" || Array.isArray(val)) {
//             return invalidValue("object", val);
//         }
//         const result: any = {};
//         Object.getOwnPropertyNames(props).forEach(key => {
//             const prop = props[key];
//             const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
//             result[prop.key] = transform(v, prop.typ, getProps, prop.key);
//         });
//         Object.getOwnPropertyNames(val).forEach(key => {
//             if (!Object.prototype.hasOwnProperty.call(props, key)) {
//                 result[key] = transform(val[key], additional, getProps, key);
//             }
//         });
//         return result;
//     }

//     if (typ === "any") return val;
//     if (typ === null) {
//         if (val === null) return val;
//         return invalidValue(typ, val);
//     }
//     if (typ === false) return invalidValue(typ, val);
//     while (typeof typ === "object" && typ.ref !== undefined) {
//         typ = typeMap[typ.ref];
//     }
//     if (Array.isArray(typ)) return transformEnum(typ, val);
//     if (typeof typ === "object") {
//         return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
//             : typ.hasOwnProperty("arrayItems") ? transformArray(typ.arrayItems, val)
//                 : typ.hasOwnProperty("props") ? transformObject(getProps(typ), typ.additional, val)
//                     : invalidValue(typ, val);
//     }
//     // Numbers can be parsed by Date but shouldn't be.
//     if (typ === Date && typeof val !== "number") return transformDate(val);
//     return transformPrimitive(typ, val);
// }

// function cast<T>(val: any, typ: any): T {
//     return transform(val, typ, jsonToJSProps);
// }

// function uncast<T>(val: T, typ: any): any {
//     return transform(val, typ, jsToJSONProps);
// }

// function a(typ: any) {
//     return { arrayItems: typ };
// }

// function u(...typs: any[]) {
//     return { unionMembers: typs };
// }

// function o(props: any[], additional: any) {
//     return { props, additional };
// }

// function m(additional: any) {
//     return { props: [], additional };
// }

// function r(name: string) {
//     return { ref: name };
// }

// const typeMap: any = {
//     "PinterestData": o([
//         { json: "board", js: "board", typ: u(undefined, r("Board")) },
//     ], false),
//     "Board": o([
//         { json: "boardName", js: "boardName", typ: u(undefined, "") },
//         { json: "sections", js: "sections", typ: u(undefined, a(r("Section"))) },
//         { json: "board_pins", js: "board_pins", typ: u(undefined, a(a(u(r("BoardPinClass"), "")))) },
//     ], false),
//     "BoardPinClass": o([
//         { json: "title", js: "title", typ: u(undefined, "") },
//         { json: "pin_link", js: "pin_link", typ: u(undefined, "") },
//         { json: "is_video", js: "is_video", typ: u(undefined, true) },
//         { json: "image", js: "image", typ: u(undefined, "") },
//     ], false),
//     "Section": o([
//         { json: "section", js: "section", typ: u(undefined, "") },
//         { json: "section_pins", js: "section_pins", typ: u(undefined, a(a(u(r("BoardPinClass"), "")))) },
//     ], false),
// };
