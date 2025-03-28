document.addEventListener("DOMContentLoaded", function () {
    const questionInput = document.getElementById("question");
    const askButton = document.getElementById("askButton");
    const responsesDiv = document.getElementById("responses");
    const progressBar = document.getElementById("progressBar");
    const progress = document.getElementById("progress");

    askButton.addEventListener("click", async function () {
        const question = questionInput.value.trim();
        if (!question) return;

        askButton.disabled = true;
        askButton.textContent = "Processing...";
        showProgressBar();

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
                hideProgressBar();
            }
        });
    });

    function displayResponse(question, answer) {
        const responseDiv = document.createElement("div");
        responseDiv.classList.add("response");
        responseDiv.innerHTML = `<strong>Q:</strong> ${question}<br><strong>A:</strong> ${answer}`;
        
        responsesDiv.insertBefore(responseDiv, responsesDiv.firstChild);
    }

    function showProgressBar() {
        progressBar.style.display = "block";
        progress.style.width = "0%";

        let width = 0;
        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
            } else {
                width += 5;
                progress.style.width = width + "%";
            }
        }, 200);
    }

    function hideProgressBar() {
        progressBar.style.display = "none";
        progress.style.width = "0%";
    }
});
