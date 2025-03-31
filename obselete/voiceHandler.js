let apiKey = "";
const API_BASE_URL = "http://127.0.0.1:8000"; // Change if backend is hosted elsewhere

// 🔹 Load stored API key
chrome.storage.local.get(["apiKey"], (data) => {
    if (data.apiKey) {
        apiKey = data.apiKey;
        document.getElementById("apiKey").value = "******";
    }
});

let mediaRecorder;
let audioChunks = [];

/**
 * 🎙️ Start Recording User Speech
 */
async function startRecording() {
    try {
        alert("🔹 Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        alert(stream)

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
            console.log("🎤 Recording finished, sending for transcription...");
            await transcribeAudio(audioBlob);
        };

        mediaRecorder.start();
        console.log("🎙️ Recording started...");
    } catch (error) {
        console.error("❌ Microphone access error:", error);
        // alert("Error accessing microphone. Please check Chrome permissions.");
        alert(error);
    }
}

/**
 * ⏹️ Stop Recording User Speech
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        console.log("⏹️ Recording stopped...");
    }
}

/**
 * 🎤 Send Audio File to Backend for Transcription
 */
async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "audio.wav");

    try {
        const response = await fetch(`${API_BASE_URL}/transcribe_audio/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });

        const data = await response.json();
        if (data.transcribed_text) {
            document.getElementById("question").value = data.transcribed_text;
            console.log("✅ Transcribed text received:", data.transcribed_text);
        }
    } catch (error) {
        console.error("❌ Error transcribing audio:", error);
    }
}

/**
 * 🔊 Convert Text to Speech (TTS)
 */
async function generateSpeech(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/generate_speech/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ text }),
        });

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        console.log("🔊 Speech generated and played.");
    } catch (error) {
        console.error("❌ Error generating speech:", error);
    }
}

/**
 * 🎧 Listen Button Event (Text-to-Speech)
 */
document.getElementById("listen-button").addEventListener("click", () => {
    const text = document.getElementById("response-text").innerText;
    generateSpeech(text);
});

/**
 * 🎤 Attach Event Listeners to Mic Button
 */
document.getElementById("mic-button").addEventListener("mousedown", startRecording);
document.getElementById("mic-button").addEventListener("mouseup", stopRecording);
