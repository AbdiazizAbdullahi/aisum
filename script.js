// Check if PouchDB is loaded
if (typeof PouchDB === 'undefined') {
    console.error('PouchDB library not found. Make sure pouchdb.min.js is included.');
    alert('Error: PouchDB not loaded. Check the console.');
}

// Check if pdf.js is available
if (typeof pdfjsLib === 'undefined') {
    console.error('pdf.js library not found. Make sure pdf.min.js and pdf.worker.min.js are included.');
    alert('Error: pdf.js not loaded. PDF functionality will not work. Check the console.');
} else {
    // IMPORTANT: Set the worker source for pdf.js
    // The path should match the CDN URL or local path where pdf.worker.min.js is located
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Check if CryptoJS is loaded
if (typeof CryptoJS === 'undefined') {
    console.error('CryptoJS library not found. Make sure crypto-js.min.js is included.');
    alert('Error: CryptoJS not loaded. Authentication will not work.');
}

// Initialize PouchDB instances
const db = new PouchDB('summaries_db'); // Existing DB for summaries
const authDb = new PouchDB('user_auth'); // New DB for authentication

// DOM Elements (Existing)
const inputText = document.getElementById('inputText');
const fileInput = document.getElementById('fileInput');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryOutput = document.getElementById('summaryOutput');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statusElement = document.getElementById('status');

// DOM Elements (Auth - New)
const authContainer = document.querySelector('.auth-container');
const authForms = document.getElementById('authForms');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupUsernameInput = document.getElementById('signupUsername');
const signupPasswordInput = document.getElementById('signupPassword');
const loginUsernameInput = document.getElementById('loginUsername');
const loginPasswordInput = document.getElementById('loginPassword');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const showLoginLink = document.getElementById('showLogin');
const showSignupLink = document.getElementById('showSignup');
const authStatusElement = document.getElementById('authStatus');
const mainContent = document.getElementById('mainContent');

// --- Configuration ---
// IMPORTANT: Replace with the correct Gemini API endpoint and model.
// Check Google AI documentation for the latest details.
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;
// WARNING: Hardcoding API keys is insecure for production apps.
const API_KEY = "AIzaSyAZ98dBqFlrMqIy1RTFPI3glIB1JXI3oeU";

// --- Authentication Logic (New Section) ---

function setAuthStatus(message, isError = false) {
    authStatusElement.textContent = message;
    authStatusElement.style.color = isError ? '#d9534f' : '#4cae4c'; // Use alert colors
}

function hashPassword(password) {
    // Basic hashing - NOT SUITABLE FOR PRODUCTION (use bcrypt on backend ideally)
    return CryptoJS.SHA256(password).toString();
}

async function signup() {
    const username = signupUsernameInput.value.trim();
    const password = signupPasswordInput.value.trim();

    if (!username || !password) {
        setAuthStatus('Username and password are required.', true);
        return;
    }

    setAuthStatus('Signing up...', false);

    try {
        // Check if user already exists
        try {
            await authDb.get(username);
            setAuthStatus('Username already exists.', true);
            return; // Exit if user exists
        } catch (err) {
            if (err.name !== 'not_found') {
                throw err; // Re-throw unexpected errors
            }
            // If 'not_found', it's good, we can proceed
        }

        const hashedPassword = hashPassword(password);
        await authDb.put({
            _id: username,
            passwordHash: hashedPassword
        });

        setAuthStatus('Signup successful! Please log in.', false);
        signupUsernameInput.value = '';
        signupPasswordInput.value = '';
        showLoginForm(); // Switch to login form after successful signup
    } catch (err) {
        console.error('Signup Error:', err);
        setAuthStatus('Signup failed. Please try again.', true);
    }
}

async function login() {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) {
        setAuthStatus('Username and password are required.', true);
        return;
    }

    setAuthStatus('Logging in...', false);

    try {
        const userDoc = await authDb.get(username);
        const hashedPassword = hashPassword(password);

        if (userDoc.passwordHash === hashedPassword) {
            sessionStorage.setItem('loggedInUser', username); // Store session
            setAuthStatus(''); // Clear status on success
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
            console.log('Login successful. Calling showAppContent for user:', username); // <<< DEBUG LOG
            showAppContent(username);
        } else {
            setAuthStatus('Invalid username or password.', true);
        }
    } catch (err) {
        if (err.name === 'not_found') {
            setAuthStatus('Invalid username or password.', true);
        } else {
            console.error('Login Error:', err);
            setAuthStatus('Login failed. Please try again.', true);
        }
    }
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    showAuthForms();
}

function showLoginForm() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    setAuthStatus(''); // Clear status when switching forms
}

function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    setAuthStatus(''); // Clear status when switching forms
}

function showAppContent(username) {
    console.log('showAppContent called for user:', username); // <<< DEBUG LOG
    authContainer.style.display = 'none'; // Hide the entire auth section
    mainContent.style.display = 'block';
    console.log('Attempting to show logout button:', logoutBtn); // <<< DEBUG LOG
    logoutBtn.style.display = 'inline-block'; // Show logout button
    console.log('Logout button display style set to:', logoutBtn.style.display); // <<< DEBUG LOG
    const welcomeTitle = mainContent.querySelector('h1');
    if (welcomeTitle) {
        welcomeTitle.textContent = `AI Text Summarizer (Logged in as: ${username})`; // Optional: Show logged-in user
    }

    // Load history *after* login
    loadHistory();
}

function showAuthForms() {
    mainContent.style.display = 'none';
    logoutBtn.style.display = 'none'; // Hide logout button
    authContainer.style.display = 'block'; // Show the auth section
    showLoginForm(); // Default to showing login form
    const welcomeTitle = mainContent.querySelector('h1');
    if (welcomeTitle) {
        welcomeTitle.textContent = `AI Text Summarizer`; // Reset title
    }
    // Clear sensitive fields on logout/show auth
    loginUsernameInput.value = '';
    loginPasswordInput.value = '';
    signupUsernameInput.value = '';
    signupPasswordInput.value = '';
    setAuthStatus(''); // Clear auth status
}

function checkLoginState() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        showAppContent(loggedInUser);
    } else {
        showAuthForms();
    }
}

// --- Event Listeners ---

// Auth Listeners (New)
signupBtn.addEventListener('click', signup);
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showSignupForm(); });

// Existing Listeners (Remain the same, but only functional when mainContent is visible)
summarizeBtn.addEventListener('click', handleSummarize);
fileInput.addEventListener('change', handleFileUpload);
clearHistoryBtn.addEventListener('click', clearHistory);

// Load initial state on page load
document.addEventListener('DOMContentLoaded', checkLoginState);

// --- Functions ---

async function handleSummarize() {
    const text = inputText.value.trim();

    if (!text) {
        setStatus('Error: Please enter text or upload a file to summarize.', true);
        return;
    }

    setStatus('Summarizing...', false);
    summaryOutput.textContent = ''; // Clear previous summary

    try {
        const summary = await callGeminiApi(API_KEY, text);
        summaryOutput.textContent = summary;
        setStatus('Summary generated successfully!', false);

        // Save to history
        const historyEntry = {
            _id: new Date().toISOString(), // Use timestamp as ID
            originalText: text,
            summary: summary,
            timestamp: new Date().getTime()
        };
        await db.put(historyEntry);
        await loadHistory(); // Refresh history list

    } catch (error) {
        console.error('Summarization Error:', error);
        setStatus(`Error: ${error.message}`, true);
        summaryOutput.textContent = 'Failed to generate summary. Check console for details.';
    }
}

async function callGeminiApi(apiKey, textToSummarize) {
    const url = `${GEMINI_API_ENDPOINT}?key=${apiKey}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: `Summarize the following text:

${textToSummarize}`
            }]
        }],
        // Optional: Add generation config if needed (e.g., temperature, max tokens)
        // generationConfig: {
        //   temperature: 0.7,
        //   maxOutputTokens: 256
        // }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();

    // Extract the summary text - Adjust based on the actual Gemini API response structure
    // This structure might change, refer to Gemini documentation.
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
    } else {
        console.error('Unexpected API response structure:', data);
        throw new Error('Could not extract summary from API response.');
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (file.type === 'application/pdf') {
        // Process PDF file
        const fileReader = new FileReader();
        fileReader.onload = async function(e) {
            const pdfData = e.target.result;
            const pdfDoc = await pdfjsLib.getDocument({data: pdfData}).promise;
            const numPages = pdfDoc.numPages;
            const pageTextPromises = [];

            for (let i = 1; i <= numPages; i++) {
                pageTextPromises.push(pdfDoc.getPage(i).then(function(page) {
                    return page.getTextContent();
                }).then(function(content) {
                    return content.items.map(item => item.str).join(' ');
                }));
            }

            const text = await Promise.all(pageTextPromises).then(pages => pages.join(' '));
            inputText.value = text.trim();
            setStatus(`File '${file.name}' loaded successfully.`, false);
        };
        fileReader.readAsArrayBuffer(file);
    } else if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(e) {
            inputText.value = e.target.result;
            setStatus(`File '${file.name}' loaded successfully.`, false);
        };
        reader.onerror = function(e) {
            setStatus('Error reading file.', true);
            console.error('File Reading Error:', e);
            inputText.value = '';
        };
        reader.readAsText(file);
    } else {
        setStatus('Error: Please upload a .txt or .pdf file.', true);
        inputText.value = ''; // Clear textarea if invalid file
    }
}

async function loadHistory() {
    historyList.innerHTML = ''; // Clear existing list
    try {
        const result = await db.allDocs({
            include_docs: true,
            descending: true // Show newest first
        });

        if (result.rows.length === 0) {
             const li = document.createElement('li');
             li.textContent = 'No history yet.';
             historyList.appendChild(li);
             clearHistoryBtn.style.display = 'none'; // Hide clear button if no history
        } else {
            result.rows.forEach(row => {
                const doc = row.doc;
                const li = document.createElement('li');
                li.textContent = `Summary from ${new Date(doc.timestamp).toLocaleString()}`;
                li.dataset.docId = doc._id; // Store doc ID for retrieval
                li.title = 'Click to view original text and summary';

                li.addEventListener('click', async () => {
                    try {
                        const clickedDoc = await db.get(li.dataset.docId);
                        inputText.value = clickedDoc.originalText;
                        summaryOutput.textContent = clickedDoc.summary;
                        setStatus(`Loaded history item from ${new Date(clickedDoc.timestamp).toLocaleString()}`, false);
                    } catch (err) {
                        console.error('Error loading history item:', err);
                        setStatus('Error loading history item.', true);
                    }
                });
                historyList.appendChild(li);
            });
             clearHistoryBtn.style.display = 'inline-block'; // Show clear button
        }

    } catch (err) {
        console.error('Error loading history:', err);
        setStatus('Error loading history.', true);
        const li = document.createElement('li');
        li.textContent = 'Error loading history.';
        historyList.appendChild(li);
        clearHistoryBtn.style.display = 'none';
    }
}

async function clearHistory() {
    if (!confirm('Are you sure you want to clear all summarization history? This cannot be undone.')) {
        return;
    }
    try {
        // Fetch all docs
        const allDocs = await db.allDocs({ include_docs: true });
        // Prepare for bulk delete
        const docsToDelete = allDocs.rows.map(row => ({
            _id: row.id,
            _rev: row.doc._rev,
            _deleted: true
        }));
        // Bulk delete
        if (docsToDelete.length > 0) {
           await db.bulkDocs(docsToDelete);
        }
        setStatus('History cleared.', false);
        summaryOutput.textContent = '';
        inputText.value = '';
        await loadHistory(); // Refresh the list (will show 'No history yet.')
    } catch (err) {
        console.error('Error clearing history:', err);
        setStatus('Error clearing history.', true);
    }
}

function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? '#d9534f' : '#4cae4c';
}
