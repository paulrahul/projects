// Query Processing functions.

var redisdb = require('./redis_provider');

function getDayHistogram(items) {
    histogram = {};
    n = items.length;
    for (i = 0; i < n; i += 2) {
        key = items[i];

        if (!(key in histogram)) {
            histogram[key] = 0;
        }

        histogram[key]++;
    }

    return histogram;
}

function fetchDayStats(day, cb) {
    redisdb.queryDayStats(day, function(err, items) {
        histogram = getDayHistogram(items);
        cb(err, histogram);
    });
}

exports.fetchDayStats = fetchDayStats;
