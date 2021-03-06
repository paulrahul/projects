// Query Processing functions.

var redisdb = require('./redis_provider');
const utils = require("./utils");

function getDayHistogram(items) {
    histogram = {};
    n = items.length;
    for (i = 0; i < n; i += 2) {
        key = items[i];
        histogram[key] = parseInt(items[i + 1]);
    }

    return histogram;
}

function processDayStats(day, items, domains) {
    n = items.length;
    if (n == 0) {
        return [];
    }

    beginning = Date.parse(utils.getBeginningOfDay(day));
    end = beginning + (24 * 60 * 60 * 1000);

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
    for (i = 1; i < new_len; ++i) {
        new_items.push({
            start_ts: tmp_items[i - 1].ts,
            end_ts: tmp_items[i].ts,
            event_type: tmp_items[i - 1].event_type,
            domain: tmp_items[i - 1].domain
        });
    }
    if (new_len > 0) {
      new_items.push({
          start_ts: tmp_items[new_len - 1].ts,
          end_ts: end - 1,
          event_type: tmp_items[new_len - 1].event_type,
          domain: tmp_items[new_len - 1].domain
      });
    }

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
    if (!day) {
        dt = new Date();
        day = utils.getCurrentYYYYMMDD();
    }

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
                    res["day"] = processDayStats(day, items, domains);
                }
                cb(err, res);
            });
        }
    });
}

exports.fetchDayUsageStats = fetchDayUsageStats;
exports.fetchDaySummaryData = fetchDaySummaryData;
