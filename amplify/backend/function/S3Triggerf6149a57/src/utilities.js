function isCSVFile(itemInfo) {
    if(itemInfo.isFile) {
        return itemInfo.ext.toLowerCase().endsWith('.csv')
    }
    else {
        return false;
    }
}

function getItemInfo(itemKey) {
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

module.exports = { isCSVFile }