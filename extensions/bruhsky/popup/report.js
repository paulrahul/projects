function getVisits(url) {
    return new Promise((resolve, reject) => {
        chrome.history.getVisits({ url: url }, function(visitItems) {
            ret = [];
            for (let visitItem of visitItems) {
                ret.push([visitItem.visitTime, url]);
            }

            resolve(ret);
        });        
    });
}

function getVisitHistory(callback) {
    // First get all URLs from last 24h
    let visitURLs = [];
    const p = new Promise(function(resolve) {
        chrome.history.search(query={text: "", maxResults:1000}, function(historyItems) {
            historyItems.forEach(function(historyItem) {
                    visitURLs.push(historyItem.url);
            });

            resolve();
        });
    });

    p.then(function() {
        // Now, for each of those URLs, find all visits and put them in a list
        // (visitTime, URL)
        promises = [];
        for (const url of visitURLs) {
            new_p = getVisits(url);
            promises.push(new_p);
        }
        Promise.all(promises)
        .then((results) => {
            allVisits = [];
            for (let result in results) {
                allVisits.push(...result);
            }
            callback(results);
        })
        .catch((error) => {console.log(`Error: ${error}`)});
    }); //then
}

function printTabTimes(items) {
    let table = document.getElementById("timeSpentTable");
    table.innerHTML = ""; // Clear existing data

    for (const item of items) {
        let row = table.insertRow();
        let domainCell = row.insertCell(0);
        let timeCell = row.insertCell(1);

        domainCell.textContent = item[0][1];
        timeCell.textContent = formatTime(item[0][0]);
    }    
}

// Function to retrieve and display time spent data
function displayTimeSpent() {
    // [[visitTime, URL]]
    getVisitHistory(function(allVisits) {
        allVisits.sort((a, b) => a[0] - b[0]);
        // console.log(`Final visits: ${allVisits}`)

        // Now create the chronological history.
        visitMap = new Map();
        let len = allVisits.length;
        console.log(len);
        for (let i = 0; i < len; i++) {
            if (i == 0) {
                continue;
            }

            let timeElapsed = allVisits[i][0] - allVisits[i - 1][0];
            let url = allVisits[i - 1][1];
            if (visitMap.has(url)) {
                timeElapsed += visitMap[url];
            }
            visitMap.set(url, timeElapsed);
        }

        // Convert the map into an array of entries
        let visitArray = Array.from(visitMap);

        // Sort the array based on the values in descending order
        visitArray.sort((a, b) => b[1] - a[1]);
        // let sortedMap = new Map(visitArray);        
        printTabTimes(visitArray);
    });
/*
    chrome.storage.local.get(['timeSpent'], function(result) {
        let timeSpentData = result.timeSpent || {};
        let sortable = [];
        for (let url in timeSpentData) {
            console.log("Pushing " + url + ", " + timeSpentData[url]);
            sortable.push([url, timeSpentData[url]]);
        }
        sortable.sort(function(a, b) {
            return b[1] - a[1];
        });

        let table = document.getElementById("timeSpentTable");
        table.innerHTML = ""; // Clear existing data

        sortable.forEach(function(item) {
            let row = table.insertRow();
            let domainCell = row.insertCell(0);
            let timeCell = row.insertCell(1);

            domainCell.textContent = item[0];
            timeCell.textContent = formatTime(item[1]);
        });
    });
*/
}

// Function to format time into human-readable form
function formatTime(seconds) {
    seconds /= 1000
    console.log("Format called for " + seconds);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    seconds = Math.floor(seconds % 60);

    let timeString = "";
    if (hours > 0) {
        timeString += hours + "h ";
    }
    if (minutes > 0 || hours > 0) {
        timeString += minutes + "m";
    }

    timeString += seconds + "s"; 

    return timeString;
}

// Display time spent on page load
document.addEventListener('DOMContentLoaded', function() {
    displayTimeSpent();
});
