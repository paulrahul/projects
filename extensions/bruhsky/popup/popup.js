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

function populateNextQuestion() {
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

            if (responseData.next_question.mode == "word") {
                var word = JSON.stringify(responseData.next_question.word); // Example extraction of data from JSON
                var translation = JSON.stringify(responseData.next_question.translation); // Example extraction of data from JSON
                // Update the popup UI with the response data
                document.getElementById('questionText').innerHTML = `${word} means ${translation}`;
            } else if (responseData.next_question.mode == "preposition") {
                var verb = responseData.next_question.verb;
                var preposition = responseData.next_question.preposition;
                var akkdat = responseData.next_question.akk_dat;
                var bedeutung = responseData.next_question.bedeutung;
    
                document.getElementById('questionText').innerHTML = `${verb} ${preposition} + ${akkdat} \n::: ${bedeutung}`
    
            }
        })
        .catch(error => {
            // Handle any errors that occur during the fetch operation
            console.error('Fetch error:', error);
        });    
}


function updatePopup(alarm) {
    // Clear previous alarm information
    document.getElementById('alarmInfo').innerHTML = '';

    // Display alarm information in the popup HTML
    if (alarm == undefined) {
        document.getElementById('alarmInfo').innerHTML += `No alarms`;        
    } else {
        document.getElementById('alarmInfo').innerHTML += `Firing in: ${alarm.remaining} mins`;        
    }

    // Display a German drop of knowledge.
    populateNextQuestion();
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