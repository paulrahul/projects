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
                dumpToDB(JSON.parse(body));
                // fs.appendFile('tabahi_dump1.txt', body, function (err) {
                //     if (err) throw err;
                //     console.log("Saved at " + new Date().toISOString());
                //     res.writeHead(200, {'Content-Type': 'text/html'});
                //     res.end();
                // });
            });
        }
    } else if (req.url == "/test") {

    } else {
        console.log("Unknown URL endpoint: " + req.url);
        res.writeHead(404);
        res.end();        
    }
}).listen(8080);    