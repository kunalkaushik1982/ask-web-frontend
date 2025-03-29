document.addEventListener("DOMContentLoaded", async () => {
    const askButton = document.getElementById("askQuestion");
    const responseContainer = document.getElementById("responseContainer");
    const loadingIndicator = document.getElementById("loading");
    const apiKeyInput = document.getElementById("apiKey");
    const saveApiKeyButton = document.getElementById("saveApiKey");
    const changeApiKeyButton = document.getElementById("changeApiKey");
    const questionLimitInput = document.getElementById("questionLimit");
    const saveLimitButton = document.getElementById("saveLimit");
    const themeToggle = document.getElementById("toggleTheme");

    let apiKey = "";
    let questionLimit = 5;
    let tabUrl = "";

    // Get the current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabUrl = tabs[0]?.url || "";
        loadStoredData();
    });

    // Load stored API key & question limit
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

    // Save API key
    saveApiKeyButton.addEventListener("click", () => {
        apiKey = apiKeyInput.value;
        chrome.storage.local.set({ apiKey });
        alert("API Key saved!");
        apiKeyInput.value = "******"; 
    });

    // Change API key
    changeApiKeyButton.addEventListener("click", () => {
        apiKeyInput.value = "";
        apiKeyInput.focus();
    });

    // Save question limit
    saveLimitButton.addEventListener("click", () => {
        questionLimit = parseInt(questionLimitInput.value, 10) || 5;
        chrome.storage.local.set({ questionLimit });
        alert("Question limit saved!");
    });

    // Load stored Q&A for this page
    function loadStoredData() {
        if (!tabUrl) return;
        chrome.storage.local.get([tabUrl], (data) => {
            const storedData = data[tabUrl] || [];
            responseContainer.innerHTML = "";
            storedData.forEach(({ question, answer }) => {
                addQuestionToUI(question, answer);
            });
        });
    }

    // Add a Q&A pair to the UI with animation
    function addQuestionToUI(question, answer) {
        const item = document.createElement("div");
        item.className = "question-item";
        item.innerHTML = `<strong>Q:</strong> ${question} <br> <strong>A:</strong> ${answer}`;
        responseContainer.prepend(item);
    }

    // Ask a new question
    askButton.addEventListener("click", async () => {
        const question = document.getElementById("question").value.trim();
        if (!question) return alert("Please enter a question.");
        if (!apiKey) return alert("Please set an API key first.");

        loadingIndicator.style.display = "block";

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tabUrl = tabs[0]?.url || "";
            if (!tabUrl) return alert("Unable to retrieve the page URL.");

            const response = await fetch("http://127.0.0.1:8000/process_page/", {
                method: "POST",
                headers: { "Content-Type": "application/json","Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ url: tabUrl, question, apiKey }),
            });

            loadingIndicator.style.display = "none";

            if (!response.ok) {
                return alert("Error: No response received.");
            }

            const data = await response.json();
            const answer = data.answer || "No answer available.";

            addQuestionToUI(question, answer);
            saveQuestionToStorage(tabUrl, question, answer);
        });
    });

    // Save Q&A pair to storage
    function saveQuestionToStorage(tabUrl, question, answer) {
        chrome.storage.local.get([tabUrl], (data) => {
            let storedData = data[tabUrl] || [];
            storedData.unshift({ question, answer });

            if (storedData.length > questionLimit) {
                storedData = storedData.slice(0, questionLimit);
            }

            chrome.storage.local.set({ [tabUrl]: storedData });
        });
    }

    // Theme Toggle
    chrome.storage.local.get(["theme"], (data) => {
        if (data.theme === "dark") {
            document.body.classList.add("dark-mode");
            themeToggle.textContent = "☀️";
        }
    });

    themeToggle.addEventListener("click", () => {
        const isDarkMode = document.body.classList.toggle("dark-mode");
        themeToggle.textContent = isDarkMode ? "☀️" : "🌙";
        chrome.storage.local.set({ theme: isDarkMode ? "dark" : "light" });
    });
});
