var http = require('http');
var redisdb = require('./redis_provider');
var query_processor = require('./query_processor');
const utils = require("./utils");
var fs = require('fs');
var ejs = require('ejs');
const path = require('path');

LIMIT = null;

function renderDailyStatsPage(day, res) {
    if (!day) {
        day = utils.getCurrentYYYYMMDD();
    }
    var data = {query_date: day};
    ejs.renderFile(
        path.join(__dirname, 'view/daystats.html'), data, {},
        function(err, data) {
        if (err) {
            res.write("" + err);
        } else {
            res.write(data);
        }
        res.end();
    });
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
                // console.log('Body: ' + body);
                redisdb.dump(JSON.parse(body), function(status, txt) {
                    if (status) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.write(txt);
                    }
                    res.end();
                });
            });
        }
    } else if (req.url == "/q") {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        query_processor.fetchDaySummaryData(null, LIMIT, function(err, items) {
            // console.log("Fetched items: " + items);
            res.write(JSON.stringify(items));
            res.end();
        });
    } else if (req.url.startsWith("/q?")) {
        query = utils.parseQueryReq(req.url);
        mode = query[0];

        res.writeHead(200, {'Content-Type': 'text/plain'});
        if (mode == "d") {
            query_processor.fetchDaySummaryData(
                query[1], LIMIT, function(err, items) {
                res.write(JSON.stringify(items));
                res.end();
            });
        }
    } else if (req.url == "/r") {
        renderDailyStatsPage(null, res);
    } else if (req.url.startsWith("/r?")) {
        query = utils.parseQueryReq(req.url);
        renderDailyStatsPage(query[1], res);
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
