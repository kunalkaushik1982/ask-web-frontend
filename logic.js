document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ Logic script loaded");

    // State management
    const state = {
        apiKey: "",
        questionLimit: 5,
        tabUrl: "",
        questions: [],
        currentIndex: 0
    };

    // DOM Elements
    const elements = {
        // Settings
        apiKeyInput: document.getElementById("apiKey"),
        saveApiKeyButton: document.getElementById("saveApiKey"),
        changeApiKeyButton: document.getElementById("changeApiKey"),
        questionLimitInput: document.getElementById("questionLimit"),
        saveLimitButton: document.getElementById("saveLimit"),
        
        // Ask Questions
        askButton: document.getElementById("askQuestion"),
        responseContainer: document.getElementById("responseContainer"),
        loadingIndicator: document.getElementById("loading"),
        questionInput: document.getElementById("question"),
        
        // Summarize Web Page
        summarizeButton: document.getElementById("summarizePage"),
        summaryStyleDropdown: document.getElementById("summaryStyle"),
        summaryContainer: document.getElementById("summaryContainer"),
        summaryLoading: document.getElementById("summaryLoading"),
        
        // Suggestions
        fetchSuggestionsButton: document.getElementById("fetchSuggestions"),
        suggestionsContainer: document.getElementById("suggestionsContainer"),
        suggestionsLoading: document.getElementById("suggestionsLoading"),
        relatedLinksContainer: document.getElementById("relatedLinksContainer"),
        relatedLinksSection: document.getElementById("relatedLinksSection"),
        
        // Navigation
        prevQuestion: document.getElementById("prevQuestion"),
        nextQuestion: document.getElementById("nextQuestion")
    };

    // Hide loading indicators initially
    elements.summaryLoading.style.display = "none";
    elements.suggestionsLoading.style.display = "none";

    // API Service
    const apiService = {
        baseUrl: "http://127.0.0.1:8000",
        
        async makeRequest(endpoint, method, data) {
            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${state.apiKey}`
                    },
                    body: data ? JSON.stringify(data) : undefined
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`Error making request to ${endpoint}:`, error);
                throw error;
            }
        },
        
        async summarizePage(url, style) {
            return this.makeRequest("/summarize_page/", "POST", {
                url,
                style,
                apiKey: state.apiKey
            });
        },
        
        async processPage(url, question) {
            return this.makeRequest("/process_page/", "POST", {
                url,
                question,
                apiKey: state.apiKey
            });
        },
        
        async getSuggestions(url) {
            return this.makeRequest("/get_suggestions/", "POST", {
                url
            });
        },
        
        async fetchRelatedLinks(query) {
            return this.makeRequest(`/fetch_related_links?query=${encodeURIComponent(query)}`, "GET");
        }
    };

    // Storage Service
    const storageService = {
        async get(keys) {
            return new Promise(resolve => {
                chrome.storage.local.get(keys, resolve);
            });
        },
        
        async set(data) {
            return new Promise(resolve => {
                chrome.storage.local.set(data, resolve);
            });
        },
        
        async saveQuestions() {
            if (!state.tabUrl) return;
            await this.set({ [state.tabUrl]: state.questions });
        }
    };

    // UI Service
    const uiService = {
        toggleLoading(element, isLoading) {
            element.style.display = isLoading ? "block" : "none";
        },
        
        showAlert(message) {
            alert(message);
        },
        
        clearInput(element) {
            element.value = "";
        },
        
        setFocus(element) {
            element.focus();
        },
        
        renderQuestion() {
            elements.responseContainer.innerHTML = "";
    
            if (state.questions.length > 0) {
                const { question, answer } = state.questions[state.currentIndex];
                this.addQuestionToUI(question, answer);
            } else {
                elements.responseContainer.innerHTML = "<p>No questions yet.</p>";
            }
    
            // Update navigation buttons
            elements.prevQuestion.disabled = state.currentIndex === 0 || state.questions.length === 0;
            elements.nextQuestion.disabled = state.currentIndex >= state.questions.length - 1 || state.questions.length === 0;
        },
        
        addQuestionToUI(question, answer) {
            const item = document.createElement("div");
            item.className = "question-item";
            item.innerHTML = `<strong>Q:</strong> ${question} <br> <strong>A:</strong> ${answer}`;
            elements.responseContainer.appendChild(item);
        },
        
        displaySummary(summary) {
            elements.summaryContainer.innerHTML = summary ? 
                `<p>${summary.replace(/\n/g, "<br>")}</p>` : 
                "<p>Error: Could not generate summary.</p>";
        },
        
        displaySuggestions(suggestions) {
            elements.suggestionsContainer.innerHTML = "";
            
            let data;
            try {
                data = typeof suggestions === "string" ? JSON.parse(suggestions) : suggestions;
            } catch (error) {
                console.error("Invalid JSON response", error);
                elements.suggestionsContainer.innerHTML = "<p>Error: Invalid response format.</p>";
                return;
            }
            
            if (data.phrases && data.phrases.length > 0) {
                const list = document.createElement("ul");
                
                data.phrases.forEach(phrase => {
                    const listItem = document.createElement("li");
                    listItem.textContent = phrase;
                    listItem.classList.add("clickable-suggestion");
                    listItem.addEventListener("click", () => controller.handleSuggestionClick(phrase));
                    list.appendChild(listItem);
                });
                
                elements.suggestionsContainer.appendChild(list);
            } else {
                elements.suggestionsContainer.innerHTML = "<p>No suggestions available.</p>";
            }
        },
        
        displayRelatedLinks(links) {
            elements.relatedLinksContainer.innerHTML = "";
            elements.relatedLinksSection.classList.remove("hidden");
            
            let data;
            try {
                if (typeof links === "string") {
                    data = JSON.parse(links);
                } else {
                    data = links;
                }
                
                if (data.related_links && Array.isArray(data.related_links)) {
                    data = data.related_links;
                }
            } catch (error) {
                console.error("Invalid links data", error);
                elements.relatedLinksContainer.innerHTML = "<p>Error: Invalid response format.</p>";
                return;
            }
            
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(link => {
                    const linkCard = document.createElement("div");
                    linkCard.classList.add("related-link-card");
                    
                    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${link.hostname}`;
                    
                    linkCard.innerHTML = `
                        <div class="related-link-content">
                            <img src="${faviconUrl}" alt="Favicon" class="related-link-favicon">
                            <div class="related-link-details">
                                <a href="${link.url}" target="_blank" class="related-link-title">${link.title}</a>
                                <p class="related-link-hostname">${link.hostname}</p>
                            </div>
                        </div>
                    `;
                    elements.relatedLinksContainer.appendChild(linkCard);
                });
            } else {
                elements.relatedLinksContainer.innerHTML = "<p>No links found.</p>";
            }
        }
    };

    // Chrome Service
    const chromeService = {
        async getCurrentTabUrl() {
            return new Promise(resolve => {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    const tab = tabs[0];
                    resolve(tab ? tab.url : "");
                });
            });
        }
    };

    // Controller - coordinates interactions between services
    const controller = {
        async init() {
            // Load stored data
            await this.loadStoredData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Get current tab URL
            state.tabUrl = await chromeService.getCurrentTabUrl();
            
            // Load questions for current tab
            await this.loadQuestionsForCurrentTab();
        },
        
        async loadStoredData() {
            const data = await storageService.get(["apiKey", "questionLimit"]);
            
            if (data.apiKey) {
                state.apiKey = data.apiKey;
                elements.apiKeyInput.value = "******";
            }
            
            if (data.questionLimit) {
                state.questionLimit = data.questionLimit;
                elements.questionLimitInput.value = state.questionLimit;
            }
        },
        
        async loadQuestionsForCurrentTab() {
            if (!state.tabUrl) return;
            
            const data = await storageService.get([state.tabUrl]);
            state.questions = data[state.tabUrl] || [];
            state.currentIndex = 0;
            
            uiService.renderQuestion();
        },
        
        setupEventListeners() {
            // API Key management
            elements.saveApiKeyButton.addEventListener("click", () => this.handleSaveApiKey());
            elements.changeApiKeyButton.addEventListener("click", () => this.handleChangeApiKey());
            
            // Question limit
            elements.saveLimitButton.addEventListener("click", () => this.handleSaveQuestionLimit());
            
            // Question handling
            elements.askButton.addEventListener("click", () => this.handleAskQuestion());
            
            // Summarization
            elements.summarizeButton.addEventListener("click", () => this.handleSummarizePage());
            
            // Suggestions
            elements.fetchSuggestionsButton.addEventListener("click", () => this.handleFetchSuggestions());
            
            // Navigation
            window.changeQuestion = (offset) => this.changeQuestionIndex(offset);
        },
        
        async handleSaveApiKey() {
            const newApiKey = elements.apiKeyInput.value.trim();
            if (!newApiKey) {
                return uiService.showAlert("Please enter an API Key.");
            }
            
            await storageService.set({ apiKey: newApiKey });
            state.apiKey = newApiKey;
            elements.apiKeyInput.value = "******";
            uiService.showAlert("API Key saved successfully!");
        },
        
        handleChangeApiKey() {
            uiService.clearInput(elements.apiKeyInput);
            uiService.setFocus(elements.apiKeyInput);
        },
        
        async handleSaveQuestionLimit() {
            const newLimit = parseInt(elements.questionLimitInput.value, 10);
            if (isNaN(newLimit) || newLimit < 1) {
                return uiService.showAlert("Please enter a valid number (1 or higher).");
            }
            
            await storageService.set({ questionLimit: newLimit });
            state.questionLimit = newLimit;
            uiService.showAlert("Question limit updated successfully!");
        },
        
        async handleAskQuestion() {
            const question = elements.questionInput.value.trim();
            
            if (!question) {
                return uiService.showAlert("Please enter a question.");
            }
            
            if (!state.apiKey) {
                return uiService.showAlert("Please set an API key first.");
            }
            
            uiService.toggleLoading(elements.loadingIndicator, true);
            
            try {
                const tabUrl = await chromeService.getCurrentTabUrl();
                
                if (!tabUrl) {
                    uiService.toggleLoading(elements.loadingIndicator, false);
                    return uiService.showAlert("Unable to retrieve the page URL.");
                }
                
                const data = await apiService.processPage(tabUrl, question);
                const answer = data.answer || "No answer available.";
                
                // Update questions list
                state.questions.unshift({ question, answer });
                if (state.questions.length > state.questionLimit) {
                    state.questions.pop();
                }
                
                // Save to storage
                await storageService.saveQuestions();
                
                // Clear input and update UI
                uiService.clearInput(elements.questionInput);
                state.currentIndex = 0;
                uiService.renderQuestion();
            } catch (error) {
                uiService.showAlert("Error: " + (error.message || "No response received."));
            } finally {
                uiService.toggleLoading(elements.loadingIndicator, false);
            }
        },
        
        async handleSummarizePage() {
            if (!state.apiKey) {
                return uiService.showAlert("Please enter your OpenAI API key in the settings.");
            }
            
            uiService.toggleLoading(elements.summaryLoading, true);
            elements.summaryContainer.innerHTML = ""; // Clear previous summary
            
            try {
                const tabUrl = await chromeService.getCurrentTabUrl();
                const selectedStyle = elements.summaryStyleDropdown.value;
                
                const data = await apiService.summarizePage(tabUrl, selectedStyle);
                uiService.displaySummary(data.summary);
            } catch (error) {
                uiService.displaySummary(null);
                console.error("Error:", error);
            } finally {
                uiService.toggleLoading(elements.summaryLoading, false);
            }
        },
        
        async handleFetchSuggestions() {
            if (!state.apiKey) {
                return uiService.showAlert("Please set an API key first.");
            }
            
            uiService.toggleLoading(elements.suggestionsLoading, true);
            elements.suggestionsContainer.innerHTML = "";
            
            try {
                const tabUrl = await chromeService.getCurrentTabUrl();
                
                if (!tabUrl) {
                    return uiService.showAlert("Unable to retrieve the page URL.");
                }
                
                const data = await apiService.getSuggestions(tabUrl);
                uiService.displaySuggestions(data.suggestions);
            } catch (error) {
                uiService.showAlert("Error: No suggestions available.");
                console.error("Error:", error);
            } finally {
                uiService.toggleLoading(elements.suggestionsLoading, false);
            }
        },
        
        async handleSuggestionClick(phrase) {
            elements.relatedLinksContainer.innerHTML = "<p>Loading...</p>";
            elements.relatedLinksSection.classList.remove("hidden");
            
            try {
                const data = await apiService.fetchRelatedLinks(phrase);
                uiService.displayRelatedLinks(data);
            } catch (error) {
                elements.relatedLinksContainer.innerHTML = "<p>Error fetching links.</p>";
                console.error("Error fetching related links:", error);
            }
        },
        
        changeQuestionIndex(offset) {
            state.currentIndex = Math.max(0, Math.min(state.currentIndex + offset, state.questions.length - 1));
            uiService.renderQuestion();
        }
    };

    // Initialize the application
    await controller.init();
    console.log("✅ Logic event listeners initialized");
});