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

function fetchDayUsageStats(day, cb) {
    redisdb.queryDayStats(day, function(err, items) {
        if (!err) {
            items = getDayHistogram(items);
        }
        cb(err, items);
    });
}

function fetchDaySummaryData(day, cb) {
    // First get the domains of that day.
    fetchDayUsageStats(day, function(err, items) {
        if (err) {
            cb(err, items);
        } else {
            res = {};
            res["histogram"] = items;

            // Then fetch the domains data.
            domains = Object.keys(items);
            redisdb.fetchDomainData(domains, function(err, items) {
                if (!err) {
                    res["domains"] = items;
                }
                cb(err, res);
            });
        }
    });
}

exports.fetchDayUsageStats = fetchDayUsageStats;
exports.fetchDaySummaryData = fetchDaySummaryData;
