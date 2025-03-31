document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ Logic script loaded");

    const apiKeyInput = document.getElementById("apiKey");
    const saveApiKeyButton = document.getElementById("saveApiKey");
    const changeApiKeyButton = document.getElementById("changeApiKey");
    const questionLimitInput = document.getElementById("questionLimit");
    const saveLimitButton = document.getElementById("saveLimit");

    const askButton = document.getElementById("askQuestion");
    const responseContainer = document.getElementById("responseContainer");
    const loadingIndicator = document.getElementById("loading");

    const summarizeButton = document.getElementById("summarizePage");
    const summaryStyleDropdown = document.getElementById("summaryStyle");
    const summaryContainer = document.getElementById("summaryContainer");
    const summaryLoading = document.getElementById("summaryLoading");

    const fetchSuggestionsButton = document.getElementById("fetchSuggestions");
    const suggestionsContainer = document.getElementById("suggestionsContainer");
    const suggestionsLoading = document.getElementById("suggestionsLoading");
    
    let apiKey = "";
    let questionLimit = 5;
    let tabUrl = "";
    let questions = [];
    let currentIndex = 0;

    // Hide loading indicator initially
    summaryLoading.style.display = "none";
    suggestionsLoading.style.display = "none";


    // Fetch the current tab's URL
    function getCurrentTabUrl(callback) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const tab = tabs[0];
                if (tab) {
                    callback(tab.url);
                }
            });
        }
    
    // Handle summarization request
    summarizeButton.addEventListener("click", function () {
            //const apiKey = apiKeyInput.value.trim();
            console.log(apiKey)
            if (!apiKey) {
                alert("Please enter your OpenAI API key in the settings.");
                return;
            }    
            getCurrentTabUrl(function (url) {
                const selectedStyle = summaryStyleDropdown.value;
    
                summaryLoading.style.display = "block";
                summaryContainer.innerHTML = ""; // Clear previous summary
    
                fetch("http://127.0.0.1:8000/summarize_page/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        url: url,
                        style: selectedStyle,
                        apiKey
                    })
                })
                .then(response => response.json())
                .then(data => {
                    summaryLoading.style.display = "none";
    
                    if (data.summary) {
                        summaryContainer.innerHTML = `<p>${data.summary.replace(/\n/g, "<br>")}</p>`;
                    } else {
                        summaryContainer.innerHTML = "<p>Error: Could not generate summary.</p>";
                    }
                })
                .catch(error => {
                    summaryLoading.style.display = "none";
                    summaryContainer.innerHTML = "<p>Error processing the request.</p>";
                    console.error("Error:", error);
                });
            });
        });

    
    // 🔹 Load stored API key & question limit
    chrome.storage.local.get(["apiKey", "questionLimit"], (data) => {
        if (data.apiKey) {
            apiKey = data.apiKey;
            apiKeyInput.value = "******";
        }
        if (data.questionLimit) {
            questionLimit = data.questionLimit;
            questionLimitInput.value = questionLimit;
        }
    });

    // 🔹 Save API Key
    saveApiKeyButton.addEventListener("click", () => {
        const newApiKey = apiKeyInput.value.trim();
        if (!newApiKey) return alert("Please enter an API Key.");

        chrome.storage.local.set({ apiKey: newApiKey }, () => {
            apiKey = newApiKey;
            apiKeyInput.value = "******";
            alert("API Key saved successfully!");
        });
    });

    // 🔹 Change API Key (Allows User to Enter a New Key)
    changeApiKeyButton.addEventListener("click", () => {
        apiKeyInput.value = "";
        apiKeyInput.focus();
    });

    // 🔹 Save Question Limit
    saveLimitButton.addEventListener("click", () => {
        const newLimit = parseInt(questionLimitInput.value, 10);
        if (isNaN(newLimit) || newLimit < 1) {
            alert("Please enter a valid number (1 or higher).");
            return;
        }

        chrome.storage.local.set({ questionLimit: newLimit }, () => {
            questionLimit = newLimit;
            alert("Question limit updated successfully!");
        });
    });

    // 🔹 Get Current Tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabUrl = tabs[0]?.url || "";
        loadStoredData();
    });

    // 🔹 Load stored questions
    function loadStoredData() {
        if (!tabUrl) return;
        chrome.storage.local.get([tabUrl], (data) => {
            questions = data[tabUrl] || [];
            currentIndex = 0;
            renderQuestion();
        });
    }

    // 🔹 Render the current question
    function renderQuestion() {
        responseContainer.innerHTML = "";

        if (questions.length > 0) {
            const { question, answer } = questions[currentIndex];
            addQuestionToUI(question, answer);
        } else {
            responseContainer.innerHTML = "<p>No questions yet.</p>";
        }

        // 🔹 Disable/Enable navigation buttons
        document.getElementById("prevQuestion").disabled = currentIndex === 0 || questions.length === 0;
        document.getElementById("nextQuestion").disabled = currentIndex >= questions.length - 1 || questions.length === 0;
    }

    // 🔹 Display question in UI
    function addQuestionToUI(question, answer) {
        const item = document.createElement("div");
        item.className = "question-item";
        item.innerHTML = `<strong>Q:</strong> ${question} <br> <strong>A:</strong> ${answer}`;
        responseContainer.appendChild(item);
    }

    // 🔹 Handle asking a new question
    askButton.addEventListener("click", async () => {
        console.log(apiKey)
        const questionInput = document.getElementById("question");
        const question = questionInput.value.trim();
        if (!question) return alert("Please enter a question.");
        if (!apiKey) return alert("Please set an API key first.");

        loadingIndicator.style.display = "block";

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tabUrl = tabs[0]?.url || "";
            if (!tabUrl) return alert("Unable to retrieve the page URL.");

            const response = await fetch("http://127.0.0.1:8000/process_page/", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ url: tabUrl, question, apiKey }),
            });

            loadingIndicator.style.display = "none";

            if (!response.ok) {
                return alert("Error: No response received.");
            }

            const data = await response.json();
            const answer = data.answer || "No answer available.";

            questions.unshift({ question, answer });
            if (questions.length > questionLimit) {
                questions.pop();
            }
            chrome.storage.local.set({ [tabUrl]: questions });

            questionInput.value = "";
            currentIndex = 0;
            renderQuestion();
        });
    });

    // 🔹 Change question index
    window.changeQuestion = (offset) => {
        currentIndex = Math.max(0, Math.min(currentIndex + offset, questions.length - 1));
        renderQuestion();
    };

    // 🔹 Handle asking a suggestion
    fetchSuggestionsButton.addEventListener("click", async () => {
        console.log("1")
        console.log(apiKey)
        if (!apiKey) return alert("Please set an API key first.");

        suggestionsLoading.style.display = "block";
        suggestionsContainer.innerHTML = "";

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tabUrl = tabs[0]?.url || "";
            if (!tabUrl) return alert("Unable to retrieve the page URL.");

            const response = await fetch("http://127.0.0.1:8000/get_suggestions/", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ url: tabUrl }),
            });

            suggestionsLoading.style.display = "none";
            console.log(response)
            if (!response.ok) {
                return alert("Error: No suggestions available.");
            }

            const data = await response.json();
            console.log(data)
            displaySuggestions(data.suggestions);
        });
    });
    
    function displaySuggestions(response) {
        // Parse the response if it's a JSON string
        let data;
        try {
            data = typeof response === "string" ? JSON.parse(response) : response;
        } catch (error) {
            console.error("Invalid JSON response", error);
            return;
        }
    
        // Ensure the response contains phrases
        if (!data.phrases || !Array.isArray(data.phrases)) {
            console.error("No phrases found in response");
            return;
        }
    
        // Get the suggestions container
        const container = document.getElementById("suggestionsContainer");
        if (!container) {
            console.error("Container element not found");
            return;
        }
    
        // Clear existing suggestions
        container.innerHTML = "";
    
        // Create and append a title for the suggestions
        const title = document.createElement("h3");
        title.textContent = "Key Phrases";
        container.appendChild(title);
    
        // Create a list for phrases
        const list = document.createElement("ul");
        list.classList.add("suggestions-list");
    
        // Append phrases to the list as clickable items
        data.phrases.forEach(phrase => {
            const listItem = document.createElement("li");
            listItem.textContent = phrase;
            listItem.classList.add("suggestion-item");
            listItem.addEventListener("click", function () {
                copyToClipboard(phrase);
            });
            list.appendChild(listItem);
        });
    
        // Append the list to the container
        container.appendChild(list);
    }
    
    // Function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                alert("Copied: " + text);
            })
            .catch(err => {
                console.error("Failed to copy text:", err);
            });
    }
    
    console.log("✅ Logic event listeners initialized");
});
