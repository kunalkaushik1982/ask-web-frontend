document.addEventListener("DOMContentLoaded", async () => {
    const themeToggle = document.getElementById("toggleTheme");
    const settingsIcon = document.getElementById("openSettings");
    const askIcon = document.getElementById("openAskQuestion"); // New Ask Question Icon

    
    const headerTitle = document.getElementById("headerTitle"); // Get the header title element

    const qaTab = document.getElementById("qaSection");
    const settingsTab = document.getElementById("settingsSection");

    const askButton = document.getElementById("askQuestion");
    const responseContainer = document.getElementById("responseContainer");
    const loadingIndicator = document.getElementById("loading");
    const apiKeyInput = document.getElementById("apiKey");
    const saveApiKeyButton = document.getElementById("saveApiKey");
    const changeApiKeyButton = document.getElementById("changeApiKey");
    const questionLimitInput = document.getElementById("questionLimit");
    const saveLimitButton = document.getElementById("saveLimit");
    const prevQuestionButton = document.getElementById("prevQuestion");
    const nextQuestionButton = document.getElementById("nextQuestion");

    let apiKey = "";
    let questionLimit = 5;
    let tabUrl = "";
    let questions = [];
    let currentIndex = 0;

    // ✅ Load theme preference
    chrome.storage.local.get(["theme"], (data) => {
        if (data.theme === "dark") {
            document.body.classList.add("dark-mode");
            themeToggle.textContent = "☀️";
        } else {
            document.body.classList.remove("dark-mode");
            themeToggle.textContent = "🌙";
        }
    });

    // ✅ Theme Toggle Click Event
    themeToggle.addEventListener("click", () => {
        const isDarkMode = document.body.classList.toggle("dark-mode");
        themeToggle.textContent = isDarkMode ? "☀️" : "🌙";
        chrome.storage.local.set({ theme: isDarkMode ? "dark" : "light" });
    });

    // ✅ Open Settings Tab when ⚙️ is clicked
    settingsIcon.addEventListener("click", () => {
        qaTab.classList.add("hidden");
        settingsTab.classList.remove("hidden");
        // ✅ Change the header title
        headerTitle.textContent = "Change Settings";
    });

    // ✅ Open Ask Question Tab when ❓ is clicked
    askIcon.addEventListener("click", () => {
        settingsTab.classList.add("hidden");
        qaTab.classList.remove("hidden");
        // ✅ Change the header title
        headerTitle.textContent = "Ask Questions";
    });

    // ✅ Get the current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabUrl = tabs[0]?.url || "";
        loadStoredData();
    });

    // ✅ Load stored API key & question limit
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

    // ✅ Save API Key
    saveApiKeyButton.addEventListener("click", () => {
        const newApiKey = apiKeyInput.value.trim();
        if (!newApiKey) return alert("Please enter an API Key.");
        
        chrome.storage.local.set({ apiKey: newApiKey }, () => {
            apiKey = newApiKey;
            apiKeyInput.value = "******"; // Hide API key after saving
            alert("API Key saved successfully!");
        });
    });

    // ✅ Change API Key (Allows User to Enter a New Key)
    changeApiKeyButton.addEventListener("click", () => {
        apiKeyInput.value = "";
        apiKeyInput.focus();
    });

    // ✅ Save Question Limit
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


    // ✅ Load stored Q&A
    function loadStoredData() {
        if (!tabUrl) return;
        chrome.storage.local.get([tabUrl], (data) => {
            questions = data[tabUrl] || [];
            currentIndex = 0;
            renderQuestion();
        });
    }

    // ✅ Render the current question & update buttons
    function renderQuestion() {
        responseContainer.innerHTML = "";

        if (questions.length > 0) {
            const { question, answer } = questions[currentIndex];
            addQuestionToUI(question, answer);
        } else {
            responseContainer.innerHTML = "<p>No questions yet.</p>";
        }

        // ✅ Disable/Enable buttons based on available questions
        prevQuestionButton.disabled = currentIndex === 0 || questions.length === 0;
        nextQuestionButton.disabled = currentIndex >= questions.length - 1 || questions.length === 0;
    }

    // ✅ Display a question in the UI
    function addQuestionToUI(question, answer) {
        const item = document.createElement("div");
        item.className = "question-item";
        item.innerHTML = `<strong>Q:</strong> ${question} <br> <strong>A:</strong> ${answer}`;
        responseContainer.appendChild(item);
    }

    // ✅ Handle asking a new question
    askButton.addEventListener("click", async () => {
        const questionInput = document.getElementById("question");
        const question = document.getElementById("question").value.trim();
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
            
            // ✅ Clear input box after response
            questionInput.value = "";
            currentIndex = 0;
            renderQuestion();
        });
    });

    // ✅ Handle previous question click
    prevQuestionButton.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    });

    // ✅ Handle next question click
    nextQuestionButton.addEventListener("click", () => {
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion();
        }
    });

});
