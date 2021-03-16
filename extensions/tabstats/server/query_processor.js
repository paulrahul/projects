// Query Processing functions.

var redisdb = require('./redis_provider');
const utils = require("./utils");

const MILLISINMIN = 60 * 1000;

function getDayHistogram(items) {
    histogram = {};
    n = items.length;
    for (i = 0; i < n; i += 2) {
        key = items[i];
        histogram[key] = parseInt(items[i + 1]);
    }

    return histogram;
}

function getDayTimeline(day, items, domains) {
    n = items.length;
    if (n == 0) {
        return [{}, []];
    }

    beginning = Date.parse(utils.getBeginningOfDay(day));
    end = beginning + (24 * 60 * 60 * 1000);
    current = (new Date()).getTime();

    tmp_items = [];
    new_len = 0;
    for (i = 0; i < n; ++i) {
        m = items[i].length;
        for (j = 0; j < m; ++j) {
            tmp_item = JSON.parse(items[i][j]);
            time = parseInt(tmp_item["ts"]);
            if (time < beginning || time > end) {
              continue;
            }

            tmp_items.push(tmp_item);
            tmp_items[new_len++]["domain"] = domains[i];
        }
    }

    tmp_items.sort((a, b) => (parseInt(a.ts) - parseInt(b.ts)));

    new_items = [];
    histogram = {};
    for (i = 1; i < new_len; ++i) {
        domain = tmp_items[i - 1].domain;
        new_items.push({
            start_ts: tmp_items[i - 1].ts,
            end_ts: tmp_items[i].ts,
            event_type: tmp_items[i - 1].event_type,
            domain: domain
        });

        if (!(domain in histogram)) {
            histogram[domain] = 0;
        }
        histogram[domain] += (
          parseInt(tmp_items[i].ts) - parseInt(tmp_items[i - 1].ts)) / MILLISINMIN;
    }
    if (new_len > 0) {
        domain = tmp_items[new_len - 1].domain;

        new_items.push({
            start_ts: tmp_items[new_len - 1].ts,
            end_ts: current,
            event_type: tmp_items[new_len - 1].event_type,
            domain: domain
        });

        if (!(domain in histogram)) {
            histogram[domain] = 0;
        }
        histogram[domain] += (
          parseInt(current) - parseInt(tmp_items[new_len - 1].ts)) / MILLISINMIN;
    }

    return [histogram, new_items];
}

function processDomainStats(items) {
    res = {};
    for (item of items) {
        domain = item.domain;
        if (!(domain in res)) {
            res[domain] = {
                created: 0,
                closed: 0,
                visited: []
            };
        }

        event_type = item.event_type;
        if (event_type == "created") {
            res[domain].created++;
        } else if (event_type == "closed") {
            res[domain].closed++;
        }
    }
    return res;
}

function fetchDayUsageStats(day, limit=null, cb) {
    redisdb.queryDayStats(day, limit, function(err, items) {
        if (!err) {
            items = getDayHistogram(items);
        }
        cb(err, items);
    });
}

function fetchDaySummaryData(day, limit=null, cb) {
    if (!day) {
        dt = new Date();
        day = utils.getCurrentYYYYMMDD();
    }

    // First get the domains of that day.
    fetchDayUsageStats(day, null, function(err, items) {
        if (err) {
            cb(err, items);
        } else {
            // Then fetch the domains data.
            domains = Object.keys(items);
            redisdb.fetchDomainData(domains, function(err, domain_items) {
                res = {};
                if (!err) {
                    day_data = getDayTimeline(day, domain_items, domains);
                    res["histogram"] = limitHistogramDomains(day_data[0], limit);
                    res["day"] = day_data[1];
                }
                cb(err, res);
            });
        }
    });
}

function limitHistogramDomains(histogram, limit) {
    if (!limit || limit < 0 || Object.keys(histogram).length == 0) {
        return histogram;
    }

    items = Object.keys(histogram).map(function(key) {
        return [key, histogram[key]];
    });
    items.sort(function(first, second) {
        return second[1] - first[1];
    });

    sorted_obj = {};
    for (i = 0; i < limit; ++i) {
        key = items[i][0];
        val = items[i][1];

        sorted_obj[key] = val;
    }

    return sorted_obj;
}

exports.fetchDayUsageStats = fetchDayUsageStats;
exports.fetchDaySummaryData = fetchDaySummaryData;
