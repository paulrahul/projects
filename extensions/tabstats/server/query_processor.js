// Query Processing functions.

var redisdb = require('./redis_provider');

function getDayHistogram(items) {
    histogram = {};
    n = items.length;
    for (i = 0; i < n; i += 2) {
        key = items[i];
        histogram[key] = parseInt(items[i + 1]);
    }

    return histogram;
}

function processDayStats(items, domains) {
    n = items.length;
    if (n == 0) {
        return [];
    }

    for (i = 0; i < n; ++i) {
        items[i] = items[i];
        items[i]["domain"] = domains[i];
    }

    items.sort((a, b) => (parseInt(a.ts) - parseInt(b.ts)));

    new_items = [];
    for (i = 1; i < n; ++i) {
        new_items.push({
            start_ts: items[i - 1].ts,
            end_ts: items[i].ts,
            event_type: items[i - 1].event_type,
            domain: items[i - 1].domain
        });
    }

    new_items.push({
        start_ts: items[n - 1].ts,
        end_ts: -1,
        event_type: items[n - 1].event_type,
        domain: items[n - 1].domain
    });

    return new_items;
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
    // First get the domains of that day.
    fetchDayUsageStats(day, limit, function(err, items) {
        if (err) {
            cb(err, items);
        } else {
            res = {};
            res["histogram"] = items;

            // Then fetch the domains data.
            domains = Object.keys(items);
            redisdb.fetchDomainData(domains, function(err, items) {
                if (!err) {
                    res["day"] = processDayStats(items, domains);
                }
                cb(err, res);
            });
        }
    });
}

exports.fetchDayUsageStats = fetchDayUsageStats;
exports.fetchDaySummaryData = fetchDaySummaryData;
