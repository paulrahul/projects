var http = require('http');
var redisdb = require('./redis_provider');
const utils = require("./utils");

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
        redisdb.queryDayStats(null, function(err, items) {
            res.write(JSON.stringify(items));
            res.end();
        });
    } else if (req.url.startsWith("/q?")) {
        query = utils.parseQueryReq(req.url);
        mode = query[0];

        res.writeHead(200, {'Content-Type': 'text/plain'});
        if (mode == "d") {
            redisdb.queryDayStats(query[1], function(err, items) {
                res.write(JSON.stringify(items));
                res.end();
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
