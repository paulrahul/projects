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
    }

    let err_text = "";
    client.mset(set_arr, function(err, reply) {
        if (err) {
            err_text += err + ": " + reply;
            cb(false, err_text);
        } else {
            // Second, an entry into the secondaty table with the following schema:
            //
            // Key - yyyymmdd
            // Score - +1
            // Value - domain

            for (item of items) {
                key = "test_" + utils.getYYYYMMDD(item["ts"]);
                client.zincrby(key, 1, domains[0], function(err, reply) {
                    if (err) {
                        err_text += err + ": " + reply;
                        cb(false, err_text);
                    } else {
                        cb(true, "");
                    }
                });

                // console.log(key + ": " + score + ", " + domains[0]);
            }
        }
        // console.log(reply);
    });
}

function fetchDomainData(domains, cb) {
    if (!domains) {
        cb(false, null);
    }

    key_arr = [];

    for (domain of domains) {
        key_arr.push("test_" + domain);
    }

    const client = redis.createClient();

    client.on("error", function(error) {
      console.error(error);
    });

    client.mget(key_arr, function(err, items) {
        cb(err, items);
    });
}

function queryDayStats(day, cb) {
    const client = redis.createClient();

    client.on("error", function(error) {
      console.error(error);
    });

    if (!day) {
        dt = new Date();
        day = utils.getCurrentYYYYMMDD();
    }

    client.zrevrange("test_" + day, 0, -1, 'withscores', function(err, items) {
        cb(err, items);
    });
}

exports.dump = dump;
exports.queryDayStats = queryDayStats;
exports.fetchDomainData = fetchDomainData;
