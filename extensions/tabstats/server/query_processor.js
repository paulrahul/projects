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

function fetchDayStats(day, cb) {
    redisdb.queryDayStats(day, function(err, items) {
        histogram = getDayHistogram(items);
        cb(err, histogram);
    });
}

exports.fetchDayStats = fetchDayStats;
