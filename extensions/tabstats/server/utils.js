function getDomains(src_url) {
    if (!src_url) {
      return [];
    }

    const url = new URL(src_url);
    return [url.hostname, url.pathname];
}

function getYYYYMMDD(src_ts) {
    dt = new Date(parseInt(src_ts));

    yyyy = dt.getFullYear();
    mm = dt.getMonth() + 1 < 10 ? "0" + (dt.getMonth() + 1) : (dt.getMonth() + 1);
    dd = dt.getDate() < 10 ? "0" + dt.getDate() : dt.getDate();

    return "" + yyyy + mm + dd
}

function getCurrentYYYYMMDD() {
    return getYYYYMMDD("" + (new Date()).getTime())
}

function parseQueryReq(query_url) {
    query = query_url.substring("/q?".length);
    idx = query.indexOf("=");
    return [query.substring(0, idx), query.substring(idx + 1)];
}

exports.getDomains = getDomains;
exports.getYYYYMMDD = getYYYYMMDD;
exports.getCurrentYYYYMMDD = getCurrentYYYYMMDD;
exports.parseQueryReq = parseQueryReq;
