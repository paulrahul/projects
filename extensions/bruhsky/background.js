/*******  Reminder module *******/
const reminderIntervalMins = 30;

let lastReminderTime = null;
getLastReminderTime();

function getLastReminderTime() {
    chrome.storage.local.get('lastReminderTime', function(result) {
        lastReminderTime = result.lastReminderTime;
    });
}

function setlastReminderTime(ts) {
    lastReminderTime = ts;
        chrome.storage.local.set({ 'lastReminderTime': ts }, function() {
    });    
}

function createAlarm() {
    chrome.alarms.create('periodicReminder', {
        periodInMinutes: reminderIntervalMins // adjust the period as needed
    });
    displayReminderMessage();
}

chrome.runtime.onInstalled.addListener(() => {
    // Set up periodic reminders
    createAlarm();

    // Register the times for all existing tabs.
    // chrome.tabs.query({}, function(tabs) {
    //     // tabs is an array of Tab objects
    //     tabs.forEach(function(tab) {
    //         var url = tab.url;
    //         // Do something with each tab
    //         handleVisitedURL(url);
    //     });
    // });
});

function getNextQuestion(cb) {
    // Make a GET request to the REST API
    var apiUrl = 'http://deutsches-spiel-408818.lm.r.appspot.com/next_question?mode=json'; // Replace with your API endpoint

    fetch(apiUrl)
        .then(response => {
            // Check if response is successful (status code 200)
            if (response.ok) {
                return response.json();    
            } else {
                throw new Error('Network response was not ok: ' + response);   
            }
        })
        .then(data => {
            // Process the API response
            var responseData = data; // Assuming the response is JSON
            cb(responseData.next_question); 
        })
        .catch(error => {
            // Handle any errors that occur during the fetch operation
            console.error('Fetch error:', error);
            cb("")
        });    
}

function displayReminderMessage() {
    getNextQuestion(function(next_question) {
        var word = JSON.stringify(next_question.word); // Example extraction of data from JSON
        var translation = JSON.stringify(next_question.translation); // Example extraction of data from JSON
        var synonyms = next_question.synonyms;

        text = `${word} means ${translation}`;
        if (synonyms.trim().length > 0) {
            text += `. Also ${JSON.stringify(synonyms)}`;
        }
        text = "TAKE A BREAK - DRINK WATER!\n\n" + text;
        showNotification(text, "", sticky=true); // customize message
      });
      setlastReminderTime(Date.now());
}

chrome.alarms.onAlarm.addListener(alarm => {
    // if (!isBrowserActive()) {
    //     console.log("Browser not active.")
    //     return;
    // }

    if (alarm.name === 'periodicReminder') {
        displayReminderMessage();
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // Check if the message indicates stopping the alarm
    if (message.action === "stopAlarm") {
        // Clear the periodic alarm
        chrome.alarms.clear('periodicReminder');
    } else if (message.action === "startAlarm") {
        // Clear the periodic alarm
        createAlarm();      
    } else if (message.action === "getAlarmInfo") {
        // Call the function to get alarm information
        getAlarmInfo("periodicReminder");
    }
});

function getAlarmInfo(name) {
    chrome.alarms.get(name, function(alarm) {
        if (alarm == undefined) {
            chrome.runtime.sendMessage({action: "alarmInfo", alarm: alarm});
        } else {
            // console.log(`Now: ${Date.now()}, lastReminderTime: ${lastReminderTime}`);
            // Send the alarm information to the popup script
            let timeLeftMins = Math.round(
                reminderIntervalMins -  ((Date.now() - lastReminderTime) / (1000 * 60)));
            chrome.runtime.sendMessage({action: "alarmInfo", alarm: {remaining: timeLeftMins}});
        }            
    });
}

function showNotification(message, contextMessage="", sticky=false) {
    // console.log("Notification " + message + " to be sent.")
    chrome.notifications.create(
        options = {
            iconUrl: 'images/water.png', // provide an icon
            title: 'Reminder',
            type: 'basic',
            message: message,
            contextMessage: contextMessage,
            buttons: [{title: "Details"}],            
            requireInteraction: sticky,
        }
    );
}

chrome.notifications.onButtonClicked.addListener(function(cb) {

});

/*******  Reminder module *******/


/*******  Tab switching module *******/

function getCurrentTab(callback) {
    let queryOptions = { active: true, lastFocusedWindow: true };
    chrome.tabs.query(queryOptions, ([tab]) => {
      if (chrome.runtime.lastError)
      console.error(chrome.runtime.lastError);
      // `tab` will either be a `tabs.Tab` instance or `undefined`.
      callback(tab);
    });
}

function getTabById(tabId, cb) {
    chrome.tabs.get(tabId, function(tab) {
        cb(tab);
    });
}

const EXCEPTION_TAB_OUT = [
];

let lastTabSwitchTime = Date.now();
let previousTab = null;

// chrome.tabs.onActivated.addListener(tab => {
//     const currentTime = Date.now();
//     const elapsedTime = currentTime - lastTabSwitchTime;

//     lastTabSwitchTime = currentTime;

//     let exit = (previousTab == null);

//     getTabById(tab.tabId, function(tab) {
//         if (exit) {
//             previousTab = tab;            
//             return;
//         }

//         if (elapsedTime < 5000) { // adjust the threshold as needed (in milliseconds)
//             // discourage quick tabbing
//             checkQuickTabbingOut(tab);
//         }
//         previousTab = tab;        
//     });
// });

function checkQuickTabbingOut(tab) {
    if (!tab) {
        console.log("No tab found.")
        return;
    }

    let domain = "";

    try {
        domain = new URL(tab.url);
    } catch (error) {
        console.log("Could not create URL out of " + tab.url);
        return;
    }
    
    if (EXCEPTION_TAB_OUT.includes(domain)) {
        console.log("Ignoring tabbing out for " + domain)
        return;
    }      

    showNotification("Nope, tabbing out too quickly.")
    chrome.tabs.update(previousTab.id, { highlighted: true, active: true });
}

/*******  Tab switching module *******/


/*******  Tab history module *******/
// background.js

// Function to update time spent on domains
function updateTimeSpent(url, timeSpent) {
    try {
        url = new URL(url);
    } catch (error) {
        console.log("Could not create URL out of " + url + ": " + error);
        return;
    }

    url = url.hostname;
    chrome.storage.local.get(['timeSpent'], function(result) {
        let timeSpentData = result.timeSpent || {};
        timeSpentData[url] = (timeSpentData[url] || 0) + timeSpent;
        console.log("Saving time " + timeSpentData[url] + " for " + url);
        chrome.storage.local.set({ timeSpent: timeSpentData });
    });
}

// Function to calculate time spent on a domain
function calculateTimeSpent(visitItems) {
    let totalTime = 0;
    for (let visitItem of visitItems) {
        totalTime += visitItem.visitTime;
    }
    return totalTime;
}

// Function to handle visited URLs
function handleVisitedURL(url) {
    chrome.history.getVisits({ url: url }, function(visitItems) {
        let timeSpent = calculateTimeSpent(visitItems);
        updateTimeSpent(url, timeSpent);
    });
}

// Function to handle new visited URLs
function handleNewVisitedURL(url) {
    updateTimeSpent(url, 0);
}

// Listener for new URLs visited
chrome.history.onVisited.addListener(function(historyItem) {
    // handleNewVisitedURL(historyItem.url);
});

// Listener for URL visits changed
// chrome.history.onVisitChanged.addListener(function(historyItem) {
//     handleVisitedURL(historyItem.url);
// });

// // Listener for URL visits removed
// chrome.history.onVisitRemoved.addListener(function(removed) {
//     for (let removedItem of removed.allRemoved) {
//         updateTimeSpent(removedItem.url, -removedItem.time);
//     }
// });

/*******  Tab history module *******/



/*******  Util *********/

// Keep track of the timestamp of the last user interaction
let lastInteractionTimestamp = Date.now();

// Listen for user interaction events
self.addEventListener('fetch', function(event) {
    // Update the timestamp of the last interaction
    lastInteractionTimestamp = Date.now();
    // console.log("Last interaction time " + lastInteractionTimestamp);
});

// Check if the browser is actively in use
function isBrowserActive() {
    // Define a threshold for considering the browser as actively in use
    const activityThreshold = 10 * 60 * 1000; // 10 minutes

    // Calculate the time elapsed since the last user interaction
    const elapsedTime = Date.now() - lastInteractionTimestamp;

    // Determine if the browser is actively in use based on the elapsed time
    return elapsedTime < activityThreshold;
}

/*******  Util *********/