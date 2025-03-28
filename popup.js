document.addEventListener("DOMContentLoaded", function () {
    const apiKeyInput = document.getElementById("apiKey");
    const saveApiKeyBtn = document.getElementById("saveApiKey");
    const changeApiKeyBtn = document.getElementById("changeApiKey");
    const questionInput = document.getElementById("question");
    const askQuestionBtn = document.getElementById("askQuestion");
    const responseContainer = document.getElementById("responseContainer");
    const loadingIndicator = document.getElementById("loading");

    // Load API Key if saved
    const storedApiKey = localStorage.getItem("openai_api_key");
    if (storedApiKey) {
        apiKeyInput.value = storedApiKey;
    }

    // Save API Key
    saveApiKeyBtn.addEventListener("click", function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem("openai_api_key", apiKey);
            alert("API Key saved!");
        } else {
            alert("Please enter a valid API Key.");
        }
    });

    // Change API Key
    changeApiKeyBtn.addEventListener("click", function () {
        localStorage.removeItem("openai_api_key");
        apiKeyInput.value = "";
        alert("API Key removed. Enter a new one.");
    });

    // Ask a Question
    askQuestionBtn.addEventListener("click", function () {
        const question = questionInput.value.trim();
        const apiKey = localStorage.getItem("openai_api_key");

        if (!question) {
            alert("Please enter a question!");
            return;
        }
        if (!apiKey) {
            alert("Please save your API Key first.");
            return;
        }

        loadingIndicator.style.display = "block"; // Show processing indicator

        // Get current tab URL
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || tabs.length === 0) {
                alert("Could not get the current tab.");
                loadingIndicator.style.display = "none";
                return;
            }

            const url = tabs[0].url;

            // Send request to backend
            fetch("http://127.0.0.1:8000/process_page/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({ url: url, question: question })
            })
            .then(response => response.json())
            .then(data => {
                loadingIndicator.style.display = "none"; // Hide processing indicator
                if (data.answer) {
                    displayResponse(question, data.answer);
                } else {
                    displayResponse(question, "Error: No response received.");
                }
            })
            .catch(error => {
                loadingIndicator.style.display = "none";
                displayResponse(question, "Error: Failed to fetch response.");
            });
        });
    });

    // Function to display response at the top
    function displayResponse(question, answer) {
        const qaBox = document.createElement("div");
        qaBox.className = "question-item";
        qaBox.innerHTML = `<strong>Q:</strong> ${question}<br><strong>A:</strong> ${answer}`;

        // Add the latest question at the top of the response history
        responseContainer.prepend(qaBox);

        // Clear the input field after asking a question
        questionInput.value = "";
    }
});
