import os
import sys
import json
import google.generativeai as genai
from datetime import datetime
from tavily import TavilyClient
from dotenv import load_dotenv

# Load API key from .env file
def load_api_key():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GOOGLE_API_KEY='):
                    return line.split('=', 1)[1].strip()
        raise ValueError("API key not found in .env file")
    except FileNotFoundError:
        print("Error: .env file not found", file=sys.stderr)
        sys.exit(1)

# Configure Gemini API
try:
    load_dotenv()
    google_api_key = os.getenv("GOOGLE_API_KEY")
    tavily_api_key = os.getenv("TAVILY_API_KEY")
    
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found. Check .env file.")
    
    genai.configure(api_key=google_api_key)
    print("🔑 Google API Key configured successfully.", file=sys.stderr, flush=True)
    
    if tavily_api_key:
        print("🔑 Tavily API Key loaded.", file=sys.stderr, flush=True)
    else:
        print("⚠️ Tavily API Key (TAVILY_API_KEY) not found in .env. /search command will be disabled.", file=sys.stderr, flush=True)

except Exception as e:
    print(f"Configuration error: {e}", file=sys.stderr)
    sys.exit(1)

# Model configuration
model = genai.GenerativeModel('gemini-1.5-pro-latest')

# System prompt with memory reference
system_prompt = """You are Gemini Guy, a helpful and friendly AI assistant. 
Your goal is to assist users with a wide range of tasks, including:
- Coding help and explanations
- Problem-solving
- Creative writing
- Technical documentation
- Best coding practices
- System architecture

You can refer to context saved by the user in the 'memory.md' file within the project if relevant to the current discussion.

Remember to adapt your communication style to the user's level of expertise."""

# Initial conversation history with system context
initial_history = [
    {
        'role': 'user',
        'parts': [system_prompt]
    },
    {
        'role': 'model',
        'parts': ["I understand. I'm ready to help you with any task or question you have."]
    }
]

# Conversation tracking
conversation_history = initial_history.copy()

def main():
    # Redirect stderr to avoid potential encoding issues
    sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf-8', buffering=1)

    print("Gemini Guy initialized. Ready to chat!", file=sys.stderr)
    sys.stderr.flush()

    # Main conversation loop
    while True:
        try:
            # Read input from stdin
            user_input = input().strip()

            # Skip empty inputs
            if not user_input:
                continue

            # Handle /search command
            if user_input.lower().startswith('/search '):
                if not tavily_api_key:
                    print("Gemini Guy: Error: TAVILY_API_KEY not found in .env file. Cannot perform web search.", flush=True)
                    continue

                try:
                    parts = user_input.split(' ', 1)
                    query = parts[1].strip() if len(parts) > 1 else None

                    if not query:
                        print("Gemini Guy: Please provide a search query after /search.", flush=True)
                        continue

                    print(f"Gemini Guy [Searching web for '{query}']: ", end="", flush=True)

                    # Call Tavily API
                    tavily = TavilyClient(api_key=tavily_api_key)
                    results = tavily.search(query=query, search_depth="basic", max_results=5)

                    # Format results for Gemini
                    search_context = f"Web search results for the query '{query}':\n\n"
                    if results and 'results' in results and results['results']:
                        for i, result in enumerate(results['results']):
                            search_context += f"Result {i+1}:\n"
                            search_context += f"  Title: {result.get('title', 'N/A')}\n"
                            search_context += f"  URL: {result.get('url', 'N/A')}\n"
                            search_context += f"  Content Snippet: {result.get('content', 'N/A')}\n\n"
                    else:
                        search_context += "No results found or error fetching results.\n"

                    # Create prompt for Gemini to synthesize answer
                    prompt_for_gemini = (
                        f"Based on the user's original query '{query}' and the following web search results, please provide a comprehensive answer or summary:\n\n"
                        f"{search_context}\n\n"
                        f"Synthesized Answer:"
                    )

                    # Send the combined prompt to Gemini
                    response = model.generate_content(prompt_for_gemini)
                    
                    # Extract and print the text response
                    response_text = response.text.strip()
                    print(response_text)
                    sys.stdout.flush()

                    # Append to conversation history
                    conversation_history.append({
                        'role': 'user',
                        'parts': [user_input]
                    })
                    conversation_history.append({
                        'role': 'model',
                        'parts': [response_text]
                    })

                except Exception as search_e:
                    print(f"\n❌ Error during web search: {search_e}", flush=True)
                    continue

            # Append user input to conversation history
            conversation_history.append({
                'role': 'user',
                'parts': [user_input]
            })

            # Generate response
            try:
                response = model.generate_content(conversation_history)
                
                # Extract and print the text response
                response_text = response.text.strip()
                print(response_text)
                sys.stdout.flush()

                # Append model response to conversation history
                conversation_history.append({
                    'role': 'model',
                    'parts': [response_text]
                })

            except Exception as gen_error:
                print(f"Error generating response: {gen_error}", file=sys.stderr)
                sys.stderr.flush()
                continue

        except EOFError:
            # Handle end of input gracefully
            break
        except Exception as e:
            print(f"Unexpected error: {e}", file=sys.stderr)
            sys.stderr.flush()

if __name__ == "__main__":
    main()
