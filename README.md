# AI Text Summarizer

A simple web application to summarize text using the Google Gemini API and store results locally using PouchDB.

## Features

*   Summarize text pasted into a textarea.
*   Summarize text from uploaded `.txt` and `.pdf` files.
*   Uses the Google Gemini API for summarization.
*   Stores summarization history (original text and summary) locally in the browser using PouchDB.
*   View past summaries from history.
*   Clear summarization history.
*   Basic user interface using HTML and CSS.

## How to Use

1.  **Get a Gemini API Key:**
    *   You need an API key from Google AI Studio ([https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
2.  **Open `index.html`:**
    *   Open the `index.html` file directly in your web browser.
3.  **Provide Text:**
    *   Paste the text you want to summarize into the text area.
    *   *Alternatively*, click the file input to upload a `.txt` or `.pdf` file. The content will be loaded into the text area.
4.  **Summarize:**
    *   Click the "Summarize" button.
    *   The application will call the Gemini API.
    *   The generated summary will appear in the "Summary" section.
5.  **View History:**
    *   Successful summaries are saved automatically.
    *   The "History" section lists past summaries by timestamp.
    *   Click on a history item to load the original text and its summary back into the input/output areas.
6.  **Clear History:**
    *   Click the "Clear History" button to permanently delete all saved summaries from your browser's local storage.

## Technology Stack

*   HTML5
*   CSS3
*   JavaScript (Vanilla)
*   PouchDB (for local storage)
*   Google Gemini API (for summarization)

## Limitations

*   **No Backend/Authentication:** Data is stored locally per browser. There's no user account system.
*   **Limited File Types:** Only supports plain text (`.txt`) and PDF (`.pdf`) uploads.
*   **API Rate Limits:** Subject to Google Gemini API usage limits and potential costs.
*   **Error Handling:** Basic error handling is implemented; check the browser console for detailed errors.
