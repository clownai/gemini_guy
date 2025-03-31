# Gemini Guy: AI Coding Assistant

## Overview
Gemini Guy is an AI-powered coding assistant built with Electron and Google's Gemini AI.

## Features
- AI-powered chat interface
- File reading and discussion
- Web search capabilities
- Cross-platform desktop application

## Setup

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- pip (Python package manager)

### Installation Steps
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/yourusername/gemini-guy.git
    cd gemini-guy
    ```

2.  **Python Environment:**
    *   Create a virtual environment (optional but recommended):
        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows: venv\Scripts\activate
        ```
    *   Install Python dependencies:
        ```bash
        pip install -r requirements.txt
        ```
        *(Includes google-generativeai, python-dotenv, tavily-python)*

3.  **Node.js Dependencies:**
    ```bash
    npm install
    ```

4.  **API Keys:**
    *   **Google AI:** Obtain from [Google AI Studio](https://makersuite.google.com/app/apikey) and add to `.env` as `GOOGLE_API_KEY="YOUR_KEY"`.
    *   **Tavily (for Web Search):** Sign up for a free key at [tavily.com](https://tavily.com/). Add it to your `.env` file as `TAVILY_API_KEY="YOUR_TAVILY_KEY"`.
    *   **Important:** Keep your `.env` file secure!

5.  **Create `.env` File:**
    Create a `.env` file in the project root with:
    ```
    GOOGLE_API_KEY=your_google_ai_key
    TAVILY_API_KEY=your_tavily_key
    ```

## Usage

### Running the Application
```bash
npm start
```

### Available Commands
- `/clear`: Clears the chat window display.
- `/help`: Shows available commands.
- `/read <filename>`: Reads a project file's content for discussion.
- `/search <query>`: Performs a web search via Tavily.
- `/write <file> <prompt>`: Generates content using the prompt and writes it to the file (overwrites).
- `/append <file> <prompt>`: Generates content using the prompt and appends it to the file.
- `quit`, `exit`, or `bye`: Saves history and closes the backend connection.

## Contributing
Contributions welcome! Please read our contributing guidelines.

## License
MIT License

## Acknowledgments
- Google AI
- Tavily Search API
- Electron
