var http = require('http');
var fs = require('fs');

function getBatchPutParams(rows) {
    if (!rows || rows.length == 0) {
        console.log("Rogue write call without any rows");
        return null;
    }

    put_reqs = [];
    for (item of rows) {
        put_reqs.push({PutRequest: {Item: item}});
    }

    params = {RequestItems: {"tabs_history": put_reqs}};
    console.log(JSON.stringify(params));

    return params;
}

function dumpToDB(items) {
    var AWS = require("aws-sdk");

    AWS.config.update({
      region: "us-east-2"  // Region where tabs_history table is present.
    });

    var docClient = new AWS.DynamoDB.DocumentClient();

    console.log("Adding a new item...");
    params = getBatchPutParams(items);
    docClient.batchWrite(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

function getDomains(src_url) {
    if (!src_url) {
      return [];
    }

    const url = new URL(src_url);
    return [url.hostname, url.pathname];
}

function getDates(src_ts) {
    dt = new Date(parseInt(src_ts));

    yyyy = dt.getFullYear();
    mm = dt.getMonth() + 1 < 10 ? "0" + (dt.getMonth() + 1) : (dt.getMonth() + 1);
    dd = dt.getDate() + 1 < 10 ? "0" + (dt.getDate() + 1) : (dt.getDate() + 1);

    return ["" + yyyy + mm + dd]
}

function dumpToRedis(items) {
    const redis = require("redis");
    const client = redis.createClient();

    client.on("error", function(error) {
      console.error(error);
    });

    console.log("Adding new items...");

    for (item of items) {
        domains = getDomains(item["url"]);

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
        console.log(key + ": " + JSON.stringify(value))
        // client.set(key, value, redis.print);

        // Second, an entry into the secondaty table with the following schema:
        //
        // Key - yyyymmdd
        // Score - ts (reverse chronological)
        // Value - domain
        key = "test_" + getDates(item["ts"])[0];
        score = item["ts"];
        // client.zadd(key, score, domains[0], redis.print);
        console.log(key + ": " + score + ", " + domains[0]);
    }
}

http.createServer(function (req, res) {
    if (req.url == "/dump") {
        if (req.method != "POST") {
            console.log("Unimplemented method: " + req.method);
            res.writeHead(501);
            res.end();
        } else {
            var body = ''

            req.on('data', function(data) {
                body += data;
                // console.log('Partial body: ' + body);
            });

            req.on('end', function() {
                console.log('Body: ' + body);
                dumpToRedis(JSON.parse(body));
            });
        }
    } else if (req.url == "/") {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write('Server Status: OK');
        res.end();
    } else {
        console.log("Unknown URL endpoint: " + req.url);
        res.writeHead(404);
        res.end();
    }
}).listen(8080);
