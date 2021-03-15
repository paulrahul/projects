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

function getBeginningOfDay(yyyymmdd) {
  yyyy = yyyymmdd.substring(0, 4);
  mm = yyyymmdd.substring(4, 6);
  dd = yyyymmdd.substring(6);

  return yyyy + "-" + mm + "-" + dd + "T00:00:00";
}

function parseQueryReq(query_url) {
    query_str = query_url.substring("/q?".length);
    queries = query_str.split("&")

    res = {};
    for (query of queries) {
        q = query.split("=");
        res[q[0]] = q[1];
    }
    return res;
}

exports.getDomains = getDomains;
exports.getYYYYMMDD = getYYYYMMDD;
exports.getCurrentYYYYMMDD = getCurrentYYYYMMDD;
exports.parseQueryReq = parseQueryReq;
exports.getBeginningOfDay = getBeginningOfDay;
