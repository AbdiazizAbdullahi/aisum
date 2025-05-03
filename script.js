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

// Initialize PouchDB
const db = new PouchDB('summaries_db');

// DOM Elements
const inputText = document.getElementById('inputText');
const fileInput = document.getElementById('fileInput');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryOutput = document.getElementById('summaryOutput');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statusElement = document.getElementById('status');

// --- Configuration ---
// IMPORTANT: Replace with the correct Gemini API endpoint and model.
// Check Google AI documentation for the latest details.
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;
// WARNING: Hardcoding API keys is insecure for production apps.
const API_KEY = "AIzaSyAZ98dBqFlrMqIy1RTFPI3glIB1JXI3oeU";

// --- Event Listeners ---
summarizeBtn.addEventListener('click', handleSummarize);
fileInput.addEventListener('change', handleFileUpload);
clearHistoryBtn.addEventListener('click', clearHistory);

// Load history on page load
document.addEventListener('DOMContentLoaded', loadHistory);

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
