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
    // current = (new Date()).getTime();

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
    prev_idx = -1
    start_ts = 0
    end_ts = 0
    event_type = ""

    for (i = 0; i < new_len; ++i) {
        event_type = tmp_items[i].event_type
        if (event_type == "closed") {
            // Can be for either of these two cases:
            // 1. When the current tab is closed i.e. the one which was
            // last created or entered. Check for prev_idx.
            if (prev_idx >= 0  &&
                tmp_items[prev_idx].domain == tmp_items[i].domain) {
                start_ts = tmp_items[prev_idx].ts
                end_ts = tmp_items[i].ts
                event_type = tmp_items[prev_idx].event_type

                prev_idx = -1
            } else {
                // Or 2. When some other tab is closed which is not in focus.
                // For this, it's a point in time event with no bearing with
                // the previous event.
                start_ts = tmp_items[i].ts
                end_ts = "" + (parseInt(tmp_items[i].ts) + 1)
                event_type = tmp_items[i].event_type
            }
        } else if (event_type == "exited") {
            // Only current tab can be exited. So look for current tab's start
            // time in prev_idx.
            if (prev_idx >= 0  &&
                tmp_items[prev_idx].domain == tmp_items[i].domain) {
                start_ts = tmp_items[prev_idx].ts
                end_ts = tmp_items[i].ts
                event_type = tmp_items[prev_idx].event_type

                prev_idx = -1
            } else {
                // Ignore this event as we could not find corresponding starting
                // event.
                continue
            }

        } else if (event_type == "created" || event_type == "entered") {
            // Event is "created" or "entered", both of which are continuous
            // events and need to be paired up with the next matching exited or
            // closed event.
            prev_idx = i
            continue
        }

        domain = tmp_items[i].domain
        new_items.push({
            start_ts: start_ts,
            end_ts: end_ts,
            event_type: event_type,
            domain: tmp_items[i].domain
        });

        if (!(domain in histogram)) {
            histogram[domain] = 0;
        }
        histogram[domain] += (
          parseInt(end_ts) - parseInt(start_ts)) / MILLISINMIN;
    }

    // Finally, check for an unclosed prev_idx.
    if (prev_idx >= 0) {
        domain = tmp_items[prev_idx].domain;

        new_items.push({
            start_ts: tmp_items[prev_idx].ts,
            end_ts: "" + end,
            event_type: tmp_items[prev_idx].event_type,
            domain: domain
        });

        if (!(domain in histogram)) {
            histogram[domain] = 0;
        }
        histogram[domain] += (
          parseInt(end) - parseInt(tmp_items[prev_idx].ts)) / MILLISINMIN;
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
