// renderer.js
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const voiceButton = document.getElementById('voice-button');
const memoryStatusDiv = document.getElementById('memory-status');
const gitBranchDiv = document.getElementById('git-branch');
const gitStatusDiv = document.getElementById('git-status');

// Helper function to get current timestamp
function getCurrentTimestamp() {
    return `[${new Date().toLocaleTimeString('en-US', { hour12: false })}]`;
}

// --- Speech Recognition Setup ---
let recognition;
let isRecognizing = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    console.log('Speech Recognition API available.');
} else {
    console.error('Speech Recognition API not supported.');
    if(voiceButton) voiceButton.disabled = true;
    if(voiceButton) voiceButton.title = "Speech Recognition not supported";
}

// Modify existing message functions to include timestamps
function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'gemini-message');
    
    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = getCurrentTimestamp() + ' ';
    timestampSpan.style.color = '#777'; // Muted color for timestamp
    
    messageDiv.appendChild(timestampSpan);
    messageDiv.innerHTML += message;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'error-message');
    
    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = getCurrentTimestamp() + ' ';
    timestampSpan.style.color = '#777'; // Muted color for timestamp
    
    messageDiv.appendChild(timestampSpan);
    messageDiv.innerHTML += message;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addInfoMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'info-message');
    
    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = getCurrentTimestamp() + ' ';
    timestampSpan.style.color = '#777'; // Muted color for timestamp
    
    messageDiv.appendChild(timestampSpan);
    messageDiv.innerHTML += message;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- Speech Recognition Event Handlers ---
if (recognition) {
    recognition.onstart = () => {
        console.log('Voice recognition started.');
        isRecognizing = true;
        voiceButton.textContent = '';
        voiceButton.style.backgroundColor = '#f44336';
    };

    recognition.onspeechend = () => {
        console.log('Speech ended, processing...');
        recognition.stop();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice Result:', transcript);
        messageInput.value = transcript;
        sendMessage();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMsg = `Speech error: ${event.error}`;
        if (event.error === 'no-speech') errorMsg = "Didn't hear anything. Try again.";
        else if (event.error === 'audio-capture') errorMsg = "Microphone error. Check OS permissions/settings.";
        else if (event.error === 'not-allowed') errorMsg = "Microphone access denied. Check OS permissions/settings.";
        else if (event.error === 'network') errorMsg = "Network error during speech recognition. Check connection.";

        addErrorMessage(errorMsg);
        if (isRecognizing) {
            isRecognizing = false;
            voiceButton.textContent = '';
            voiceButton.style.backgroundColor = '#555';
        }
    };

    recognition.onend = () => {
        console.log('Voice recognition ended.');
        if (isRecognizing) {
            isRecognizing = false;
            voiceButton.textContent = '';
            voiceButton.style.backgroundColor = '#555';
        }
    };
}

// --- Command History Setup ---
let commandHistory = [];
let historyIndex = -1; // -1 means we are at the current input, not browsing history
let tempInputBeforeHistory = ''; // Store temporary input before navigating history

// --- Slash Command Functions ---
function clearChat() {
    console.log('Clearing chat display.');
    chatContainer.innerHTML = ''; // Remove all messages from display
    // Optional: Send message to backend to clear its history too?
    // window.electronAPI.sendToGemini('/internal_clear_history'); // If backend supports it
    addInfoMessage('Chat display cleared.'); // Give user feedback
}

function showHelp() {
    console.log('Showing help.');
    const helpText = `Available Commands:\n` +
                     `  /clear                - Clears the chat window display.\n` +
                     `  /help                 - Shows this help message.\n` +
                     `  /read <filename>      - Reads project file content for discussion.\n` +
                     `  /search <query>       - Performs a web search via Tavily.\n` +
                     `  /write <file> <prompt> - Generates content using the prompt and writes it to the file (overwrites).\n` +
                     `  /append <file> <prompt>- Generates content using the prompt and appends it to the file.\n` +
                     `  quit | exit | bye     - Saves history and closes the backend connection.`;
    addInfoMessage(helpText); // Display help text in the chat
}

// Modify sendMessage function
function sendMessage() {
    const message = messageInput.value.trim();
    const lowerMessage = message.toLowerCase();

    // --- Handle Local Commands First ---
    if (lowerMessage === '/clear') {
        clearChat();
        messageInput.value = ''; // Clear input
        historyIndex = -1; // Reset history
        tempInputBeforeHistory = ''; // Clear temp input
        // Don't add /clear to history or send to backend
        return;
    }
    if (lowerMessage === '/help') {
        showHelp();
        messageInput.value = ''; // Clear input
        historyIndex = -1; // Reset history
        tempInputBeforeHistory = ''; // Clear temp input
        // Optionally add /help to history? For now, let's not.
        return;
    }
    // Add other local commands here later

    // --- If not a local command and not empty, process for sending ---
    if (message) {
        console.log('renderer: Sending to preload:', message);
        addMessage(message, true); // Display user message

        // Add to history only if it's not a locally handled command
        if (!commandHistory.includes(message)) { // Avoid duplicates if user resends
             commandHistory.push(message);
        }
        historyIndex = -1; // Reset history navigation index
        tempInputBeforeHistory = ''; // Clear temp input

        window.electronAPI.sendToGemini(message); // Send via preload
        messageInput.value = ''; // Clear input
    }
}

// Replace existing keypress listener with keydown
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent newline in input
        sendMessage();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault(); // Prevent cursor moving to beginning
        if (commandHistory.length > 0) {
            if (historyIndex === -1) { 
                // First time navigating up, store current input
                tempInputBeforeHistory = messageInput.value;
                historyIndex = commandHistory.length - 1;
            } else if (historyIndex > 0) {
                historyIndex--;
            }
            messageInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault(); // Prevent cursor moving to end
        if (historyIndex !== -1) {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                messageInput.value = commandHistory[historyIndex];
            } else {
                // Reached the end of history, restore temp input or clear
                historyIndex = -1;
                messageInput.value = tempInputBeforeHistory;
                tempInputBeforeHistory = ''; // Clear temp input
            }
        }
    } else {
        // Any other key press resets the history navigation
        // This allows user to type something new after browsing history
        if (historyIndex !== -1) {
            historyIndex = -1;
            // Restore or clear temp input
            messageInput.value = tempInputBeforeHistory;
            tempInputBeforeHistory = '';
        }
    }
});

// --- Event Listeners ---
sendButton.addEventListener('click', sendMessage);
voiceButton.addEventListener('click', () => {
    if (!recognition) {
        addErrorMessage("Speech recognition not supported.");
        return;
    }
    if (isRecognizing) {
        console.log('Manually stopping voice recognition...');
        recognition.stop();
    } else {
        console.log('Starting voice recognition...');
        try {
            recognition.start();
        } catch (e) {
            console.error("Error starting recognition:", e);
            addErrorMessage(`Could not start voice recognition: ${e.message}`);
            isRecognizing = false;
            voiceButton.textContent = '';
            voiceButton.style.backgroundColor = '#555';
        }
    }
});

// --- IPC Listeners ---
let currentGeminiMessageDiv = null;

window.electronAPI.onGeminiResponse((messageChunk) => {
    // We need to accumulate the full response before processing for code blocks.
    // Find the last '.gemini-message' div or create a new one if needed.
    let messageDivs = chatContainer.querySelectorAll('.gemini-message');
    let lastMessageDiv = messageDivs.length > 0 ? messageDivs[messageDivs.length - 1] : null;

    // Check if this chunk seems to start a new message
    let isNewMessage = !lastMessageDiv || !lastMessageDiv.hasAttribute('data-accumulating');

    if (isNewMessage) {
        lastMessageDiv = document.createElement('div');
        lastMessageDiv.classList.add('message', 'gemini-message');
        // Add timestamp to the new message div
        const timestampSpan = document.createElement('span');
        timestampSpan.style.color = '#aaa'; // Muted timestamp color
        timestampSpan.style.marginRight = '8px';
        timestampSpan.textContent = `[${new Date().toLocaleTimeString()}]`;
        lastMessageDiv.appendChild(timestampSpan);
        // Add "Gemini Guy: " label span
        const labelSpan = document.createElement('span');
        labelSpan.style.color = '#cccccc';
        labelSpan.style.marginRight = '5px';
        labelSpan.textContent = "Gemini Guy:";
        lastMessageDiv.appendChild(labelSpan);

        lastMessageDiv.setAttribute('data-accumulating', 'true'); // Mark as accumulating
        lastMessageDiv.setAttribute('data-full-response', ''); // Store full raw text
        chatContainer.appendChild(lastMessageDiv);
    }

    // Append raw chunk to data attribute
    let currentFullResponse = lastMessageDiv.getAttribute('data-full-response') || '';
    currentFullResponse += messageChunk;
    lastMessageDiv.setAttribute('data-full-response', currentFullResponse);

    // If the chunk contains a newline, assume it's the end (or near end) and render the whole message
    if (messageChunk.includes('\n')) {
        lastMessageDiv.removeAttribute('data-accumulating'); // Mark as finished accumulating
        renderMessageContent(lastMessageDiv, currentFullResponse); // Render the full content
    }

    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll down
});

// New function to render message content, handling code blocks
function renderMessageContent(messageDiv, fullText) {
    // Clear previous simple text if any was added during accumulation
    // Find first span (timestamp) and second span (label), keep them.
    const spans = messageDiv.querySelectorAll('span');
    while (messageDiv.childNodes.length > spans.length) {
        messageDiv.removeChild(messageDiv.lastChild);
    }

    // Regex to find code blocks ```lang\n code ``` or ```\n code ```
    const codeBlockRegex = /```(\w+)?\s*?\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(fullText)) !== null) {
        // Add text before the code block
        if (match.index > lastIndex) {
            const textNode = document.createTextNode(fullText.substring(lastIndex, match.index));
            const textSpan = document.createElement('span'); // Wrap text in span for consistency
            textSpan.appendChild(textNode);
            messageDiv.appendChild(textSpan);
        }

        // Add the code block
        const lang = match[1] || 'plaintext'; // Default to plaintext if no language specified
        const code = match[2];

        const wrapper = document.createElement('div');
        wrapper.classList.add('code-block-wrapper');

        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        // Add language class for highlight.js
        codeElement.classList.add(`language-${lang}`);
        codeElement.textContent = code; // Set the raw code content

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.classList.add('copy-code-button');
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(code)
                .then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000); // Reset after 2s
                })
                .catch(err => {
                    console.error('Failed to copy code:', err);
                    copyButton.textContent = 'Error';
                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                });
        });

        pre.appendChild(codeElement);
        wrapper.appendChild(pre);
        wrapper.appendChild(copyButton);
        messageDiv.appendChild(wrapper);

        // Apply highlighting AFTER adding to DOM
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(codeElement);
        } else {
            console.warn('highlight.js (hljs) not loaded.');
        }

        lastIndex = codeBlockRegex.lastIndex;
    }

    // Add any remaining text after the last code block
    if (lastIndex < fullText.length) {
        const textNode = document.createTextNode(fullText.substring(lastIndex));
        const textSpan = document.createElement('span');
        textSpan.appendChild(textNode);
        messageDiv.appendChild(textSpan);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight; // Ensure scroll after render
}

window.electronAPI.onGeminiError((errorMsg) => {
    console.error('renderer: Received error:', errorMsg);
    addErrorMessage(errorMsg);
    currentGeminiMessageDiv = null;
});

window.electronAPI.onBackendStopped((msg) => {
    console.warn('renderer: Backend stopped:', msg);
    addInfoMessage(`Backend process stopped: ${msg}. Please restart the application.`);
    messageInput.disabled = true;
    sendButton.disabled = true;
    voiceButton.disabled = true;
    currentGeminiMessageDiv = null;
});

// File Write Status Listener
window.electronAPI.onFileWriteStatus((statusMsg) => {
    console.log('Renderer: File Write Status:', statusMsg);
    // Display the status message (could be success, error, or 'generating')
    // Use addInfoMessage for non-errors, addErrorMessage for errors
    if (statusMsg.includes('Error') || statusMsg.includes('❌')) {
        addErrorMessage(statusMsg);
    } else {
        addInfoMessage(statusMsg); // Display confirmations/generating status
    }
});

// Git Status Elements
const gitStatusSpan = document.getElementById('git-branch-status');

// Git Status Listener
window.electronAPI.onGitStatusResult((gitInfo) => {
    console.log('Renderer: Git Status Received:', gitInfo);
    if (gitInfo.isRepo === false) {
        gitStatusSpan.innerHTML = `Git: (No Repo) <button id="init-git-button" class="status-bar-button">Initialize Here</button>`;
        // Add listener for the dynamically created button
        document.getElementById('init-git-button')?.addEventListener('click', () => {
            gitStatusSpan.textContent = 'Git: Initializing...';
            window.electronAPI.initializeGitRepo();
        });
    } else {
        // Format the display string
        gitStatusSpan.textContent = `Git: ${gitInfo.branch || 'N/A'} | Status: ${gitInfo.status || 'N/A'}`;
    }
});

// Git Initialization Status Listener
window.electronAPI.onGitInitStatus((result) => {
    console.log('Renderer: Git Init Status:', result);
    if (result.success) {
        addInfoMessage(result.message);
    } else {
        addErrorMessage(result.message);
    }
});

// Refresh Git Status Button
document.getElementById('tool-refresh-git-btn')?.addEventListener('click', () => {
    console.log('Refresh Git Status button clicked');
    gitStatusSpan.textContent = 'Git: (loading...)'; // Update status bar
    window.electronAPI.requestGitStatus();
});

// Trigger initial Git status check
window.electronAPI.requestGitStatus();

// Hugging Face search button event listener
document.getElementById('tool-huggingface-btn')?.addEventListener('click', () => {
    console.log('Hugging Face Search button clicked');
    const query = prompt("Search Hugging Face Hub for (models):"); // Use simple browser prompt for now
    if (query && query.trim()) {
        addInfoMessage(`Searching Hugging Face Hub for "${query}"...`); // User feedback
        window.electronAPI.triggerHuggingFaceTask({ type: 'search', query: query.trim() });
    } else if (query !== null) { // Handle empty input vs clicking cancel
         addErrorMessage("Search query cannot be empty.");
    }
     // If user clicks Cancel, prompt returns null, nothing happens.
});

console.log('Renderer script loaded.');
addInfoMessage("App Initialized. Waiting for Python backend...");
