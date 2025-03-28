document.addEventListener("DOMContentLoaded", function () {
    const questionInput = document.getElementById("question");
    const askButton = document.getElementById("askButton");
    const responsesDiv = document.getElementById("responses");

    askButton.addEventListener("click", async function () {
        const question = questionInput.value.trim();
        if (!question) return;

        askButton.disabled = true;
        askButton.textContent = "Processing...";

        // Get the current tab URL
        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
            const url = tabs[0].url;

            try {
                const response = await fetch("http://127.0.0.1:8000/process_page/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url, question }),
                });

                const data = await response.json();
                if (data.answer) {
                    displayResponse(question, data.answer);
                } else {
                    displayResponse(question, "Error: No response received.");
                }
            } catch (error) {
                displayResponse(question, "Error: Unable to reach server.");
            } finally {
                askButton.disabled = false;
                askButton.textContent = "Ask";
                questionInput.value = "";
            }
        });
    });

    function displayResponse(question, answer) {
        const responseDiv = document.createElement("div");
        responseDiv.classList.add("response");
        responseDiv.innerHTML = `<strong>Q:</strong> ${question}<br><strong>A:</strong> ${answer}`;
        
        // Ensure the latest response is added at the top
        responsesDiv.insertBefore(responseDiv, responsesDiv.firstChild);
    }
});
