// Functions to interact with the DB.

const redis = require("redis");

const utils = require("./utils");

function dump(items, cb) {
    const client = redis.createClient();

    client.on("error", function(error) {
      console.error(error);
    });

    console.log("Adding new items...");

    set_arr = [];
    zadd_arr = [];
    key = "";
    for (item of items) {
        domains = utils.getDomains(item["url"]);

        // First, an entry into the main table with the following schema:
        //
        // Key - domain (reddit.com / google.com etc.)
        // Value - {subdomain, event_type, ts, platform}
        //
        key = "test_" + domains[0];
        value = {
            subdomain: domains[1],
            event_type: item["event_type"],
            ts: item["ts"],
            platform: item["platform"]
        }
        // console.log(key + ": " + JSON.stringify(value))
        set_arr.push(key);
        set_arr.push(JSON.stringify(value));


        // Second, an entry into the secondaty table with the following schema:
        //
        // Key - yyyymmdd
        // Score - ts (reverse chronological)
        // Value - domain
        key = "test_" + utils.getYYYYMMDD(item["ts"]);
        score = item["ts"];
        zadd_arr.push(score);
        zadd_arr.push(domains[0]);
        // console.log(key + ": " + score + ", " + domains[0]);
    }

    let err_text = "";
    client.mset(set_arr, function(err, reply) {
        if (err) {
            err_text += err + ": " + reply;
            cb(false, err_text);
        } else {
            client.zadd(key, zadd_arr, function(err, reply) {
                if (err) {
                    err_text += err + ": " + reply;
                    cb(false, err_text);
                } else {
                    cb(true, "");
                }
            });
        }
        // console.log(reply);
    });
}

function queryDayStats(day, cb) {
    const client = redis.createClient();

    client.on("error", function(error) {
      console.error(error);
    });

    if (!day) {
        dt = new Date();
        day = utils.getYYYYMMDD("" + dt.getTime());
    }

    client.zrevrange("test_" + day, 0, -1, 'withscores', function(err, items) {
        cb(err, items);
    });
}

exports.dump = dump;
exports.queryDayStats = queryDayStats;
