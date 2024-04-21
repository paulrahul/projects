// popup.js

// Function to display the tab time spent report
function displayTimeSpentReport() {
    // chrome.tabs.create({ url: "report.html" });
    chrome.tabs.create({ url: chrome.runtime.getURL("popup/report.html") });
}

// Attach click event listener to the "History" button
document.addEventListener('DOMContentLoaded', function() {
    let historyButton = document.getElementById('historyButton');
    historyButton.addEventListener('click', displayTimeSpentReport);


    document.getElementById('stopButton').addEventListener('click', function() {
        // Send a message to the background script
        chrome.runtime.sendMessage({action: "stopAlarm"});
        getAlarmInfo();
    });
    
    document.getElementById('startButton').addEventListener('click', function() {
        // Send a message to the background script
        chrome.runtime.sendMessage({action: "startAlarm"});
        getAlarmInfo();        
    });      
});

function updatePopup(alarm) {
    // Clear previous alarm information
    document.getElementById('alarmInfo').innerHTML = '';

    // Display alarm information in the popup HTML
    if (alarm == undefined) {
        document.getElementById('alarmInfo').innerHTML += `No alarms`;        
    } else {
        document.getElementById('alarmInfo').innerHTML += `Firing in: ${alarm.remaining} mins`;        
    }
}

// Send a message to the background script to get alarm information
function getAlarmInfo() {
    chrome.runtime.sendMessage({action: "getAlarmInfo"});
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // Check if the message contains alarm information
    if (message.action === "alarmInfo") {
        // Update the popup HTML with the received alarm information
        updatePopup(message.alarm);
    }
});

getAlarmInfo();