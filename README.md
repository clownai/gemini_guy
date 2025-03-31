# Gemini Guy: AI Coding Assistant

## Overview
Gemini Guy is an AI-powered coding assistant built with Electron and Google's Gemini AI.

## Setup and Installation

### Prerequisites
- Python 3.9+
- Node.js 16+
- A GitHub account for optional Git integration

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/clownai/gemini_guy.git
cd gemini_guy
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Install Node.js dependencies:
```bash
npm install
```

5. Configure API Keys
Create a `.env` file in the project root with the following keys:
```
GOOGLE_API_KEY=your_google_generative_ai_key
TAVILY_API_KEY=your_tavily_search_key  # Optional
HUGGINGFACE_TOKEN=your_hugging_face_token  # Optional
```

- Get a Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Get a Tavily API key from [Tavily](https://tavily.com/)
- Get a Hugging Face token from [Hugging Face](https://huggingface.co/settings/tokens)

### Running the Application

```bash
npm start
```

## Features

### AI Interactions
- Chat with Gemini AI
- Web search using Tavily
- Hugging Face model search

### Hugging Face Search
- Click the "HF Search" button in the sidebar
- Enter a search query for Hugging Face models
- View model details like downloads and last modified date

### Commands
- `/search <query>`: Web search
- `/hf_search <query>`: Hugging Face model search
- `/read <filename>`: Read file contents
- `/write <filename> <prompt>`: Generate and write content
- `/append <filename> <prompt>`: Append generated content

## Usage

### Available Commands
- `/clear`: Clears the chat window display.
- `/help`: Shows available commands.
- `quit`, `exit`, or `bye`: Saves history and closes the backend connection.

## Troubleshooting
- Ensure all API keys are correctly set in `.env`
- Check console logs for detailed error messages

## Contributing
PRs welcome! Please follow standard GitHub contribution guidelines.

## License
MIT License

## Acknowledgments
- Google AI
- Tavily Search API
- Electron
