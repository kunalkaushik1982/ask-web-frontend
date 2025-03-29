document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ UI script loaded");

    // 🎨 Theme Toggle
    const themeToggle = document.getElementById("toggleTheme");
    const settingsIcon = document.getElementById("openSettings");
    const askIcon = document.getElementById("openAskQuestion");
    const headerTitle = document.getElementById("headerTitle");
    const qaTab = document.getElementById("qaSection");
    const settingsTab = document.getElementById("settingsSection");

    const prevQuestionButton = document.getElementById("prevQuestion");
    const nextQuestionButton = document.getElementById("nextQuestion");

    // 🔹 Load theme from storage
    chrome.storage.local.get(["theme"], (data) => {
        document.body.classList.toggle("dark-mode", data.theme === "dark");
        themeToggle.textContent = data.theme === "dark" ? "☀️" : "🌙";
    });

    // 🔹 Theme Toggle Click Event
    themeToggle.addEventListener("click", () => {
        const isDarkMode = document.body.classList.toggle("dark-mode");
        themeToggle.textContent = isDarkMode ? "☀️" : "🌙";
        chrome.storage.local.set({ theme: isDarkMode ? "dark" : "light" });
    });

    // 🔹 Open Settings Tab
    settingsIcon.addEventListener("click", () => {
        qaTab.classList.add("hidden");
        settingsTab.classList.remove("hidden");
        headerTitle.textContent = "Change Settings";
    });

    // 🔹 Open Ask Question Tab
    askIcon.addEventListener("click", () => {
        settingsTab.classList.add("hidden");
        qaTab.classList.remove("hidden");
        headerTitle.textContent = "Ask Questions";
    });

    // 🔹 Previous Question Button
    prevQuestionButton.addEventListener("click", () => {
        changeQuestion(-1);
    });

    // 🔹 Next Question Button
    nextQuestionButton.addEventListener("click", () => {
        changeQuestion(1);
    });

    console.log("✅ UI event listeners initialized");
});
