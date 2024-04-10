chrome.runtime.onInstalled.addListener(() => {
    // Set up periodic reminders
    chrome.alarms.create('periodicReminder', {
      periodInMinutes: 30 // adjust the period as needed
    });
});

chrome.alarms.onAlarm.addListener(alarm => {
    console.log("Alarm triggered")
    if (alarm.name === 'periodicReminder') {
      showNotification("Don't forget to take a break!"); // customize message
    }
});
  
function showNotification(message) {
    console.log("Notification " + message + " to be sent.")
    chrome.notifications.create(
        options = {
            iconUrl: 'images/notification.png', // provide an icon
            title: 'Reminder',
            type: 'basic',
            message: message,
            requireInteraction: true,
        }
    );
}