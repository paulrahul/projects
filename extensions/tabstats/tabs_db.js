/***
 *
 * Utility to read and write to a persistent DB.
 *
 */

TABS_TABLE = "tabs_history";

db_interface = {
    init: function(params=null) {},

    write: function(tbl, rows, cb) {},

    scan: function(tbl, cond=null, cb) {}
}

dynamo_db = {
    db: null,

    init: function(params=null) {
        this.db = new AWS.DynamoDB.DocumentClient();
        console.log("DynamoDB Initialised");
    },

    write: function(tbl, rows, cb) {
        if (!rows || rows.length == 0) {
            console.log("Rogue write call without any rows");
            cb();
            return;
        }

        put_reqs = [];
        for (item of rows) {
            put_reqs.push({PutRequest: {Item: item}});
        }

        params = {RequestItems: {tbl: put_reqs}};
        // console.log(JSON.stringify(params));

        if (this.db) {
            this.db.batchWrite(params, function(err, data) {
                if (err) console.log(err);
                else console.log("Written successfully " + data);
                cb(err);
            });
        } else {
            console.log("DB not yet initialised!");
            cb("DB not yet initialised!");
        }
    },

    scan: function(tbl, cond=null, cb) {
        params = {TableName: tbl};
        if (cond) {
            for (key in cond) {
                params[key] = cond[key];
            }
        }
        // console.log(JSON.stringify(params));

        if (this.db) {
            this.db.scan(params, function(err, data) {
                if (err) console.log(err);

                cb(data.Items);
            });
        } else {
            console.log("DB not yet initialised!");
        }

        cb();
    }
}

// Test

// dynamo_db.init();

// dynamo_db.write("dummy_tbl", [{url: "foo.com", created: [213312]}], function(err){
//     console.log("Write test done");
// });

// dynamo_db.scan("dummy_tbl", null, function(){
//     console.log("Scan test done");
// });
