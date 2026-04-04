import csv from "csv-parser";

export function isCSVFile(itemInfo) {
    if(itemInfo.isFile) {
        return itemInfo.ext.toLowerCase().endsWith('csv')
    }
    else {
        return false;
    }
}

export function getItemInfo(itemKey) {
    if (typeof itemKey !== "string" || itemKey.trim() === "") {
        throw new Error("Invalid S3 key");
    }

    const key = itemKey;
    const isFile = !itemKey.endsWith("/");
    
    // Normalize: remove leading/trailing slashes    
    const cleanKey = itemKey.replace(/^\/+|\/+$/g, "");


    const parts = cleanKey.split("/");
    const name = parts[parts.length - 1] || "";

    const path =
    parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") + "/" : "";

    let ext = "";
    if (isFile && name.includes(".")) {
        ext = name.substring(name.lastIndexOf(".") + 1).toLowerCase();
    }    

    return {
        isFile,
        name,
        ext,
        path,
        key,
    };
}

export async function getObjectsFromStream(stream) {
    return parseStream(stream);
}

async function parseStream(stream) {
    return new Promise((resolve, reject) => {
    const results = [];
    stream
      .pipe(csv()) // auto-detects headers from first line
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}