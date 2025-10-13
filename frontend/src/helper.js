export const normalize = (s) => s?.replace("T", " ").replace("Z", "") || "";

// Display Date as DD-MM-YYYY
export const toYMD = (ymd) => {
    ymd = normalize(ymd);
    return ymd ? ymd.slice(0, 10) : "";
};
export const toDMY = (dmy) => {
    dmy = normalize(dmy);
    if (!dmy) return "";
    const [y, m, d] = dmy.split(" ")[0].split("-");
    return (d && m && y) ? `${d}-${m}-${y}` : dmy;
};


