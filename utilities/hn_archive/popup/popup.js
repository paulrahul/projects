chrome.runtime.onMessage.addListener((message) => {
    if (message.summary) {
        document.getElementById("summary").innerText = decodeHTMLEntities(message.summary);
    }

    if (message.hnStoryId) {
        document.getElementById("hnStoryId").value = message.hnStoryId
    }
});

function decodeHTMLEntities(text) {
    let textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
}

document.addEventListener("DOMContentLoaded", async () => {
    // const summaryDiv = document.getElementById("summary");
    const aiSummaryDiv = document.getElementById("ai-summary");
    const apiKeyInput = document.getElementById("api-key");
    const saveKeyBtn = document.getElementById("save-key");
    // const getSummaryBtn = document.getElementById("get-summary");
    const getAISummaryBtn = document.getElementById("get-ai-summary");
    const apiKeyTooltip = document.getElementById("api-key-tooltip");

    // Load API Key from Chrome Storage
    chrome.storage.local.get("hane_openai_key", (data) => {
        if (data.hane_openai_key) {
            apiKeyInput.value = "********"; // Hide actual key
            saveKeyBtn.textContent = "Edit";
        }
    });

    // Save API Key
    saveKeyBtn.addEventListener("click", () => {
        if (saveKeyBtn.textContent === "Edit") {
            apiKeyInput.value = "";
            apiKeyInput.focus();
            saveKeyBtn.textContent = "Save";
        } else {
            const key = apiKeyInput.value.trim();
            if (key) {
                chrome.storage.local.set({ "hane_openai_key": key }, () => {
                    alert("API Key saved!");
                    apiKeyInput.value = "********"; // Hide after saving
                    saveKeyBtn.textContent = "Edit";

                    apiKeyInput.classList.remove("error");
                    apiKeyTooltip.style.display = "none";
                });
            }
        }
    });

    // Get AI Summary (from OpenAI API)
    getAISummaryBtn.addEventListener("click", () => {
        aiSummaryDiv.textContent = "Generating AI summary...";
        const hnStoryId = document.getElementById("hnStoryId").value;
        chrome.storage.local.get("hane_openai_key", (data) => {
            if (!data.hane_openai_key) {
                // aiSummaryDiv.textContent = "No API key saved. Please enter one.";
                
                apiKeyInput.classList.add("error");
                apiKeyTooltip.style.display = "block";
                apiKeyInput.focus();
                return;
            }
            apiKeyInput.classList.remove("error");
            apiKeyTooltip.style.display = "none";

            chrome.runtime.sendMessage({ action: "fetch_ai_summary", apiKey: data.hane_openai_key, hnStoryId: hnStoryId }, (response) => {
                aiSummaryDiv.textContent = response ? response.ai_summary : "Error generating AI summary.";
                getAISummaryBtn.style.display = "none";
            });
        });
    });
});

