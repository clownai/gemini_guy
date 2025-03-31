# generate_once.py
import google.generativeai as genai
import os
import sys
from dotenv import load_dotenv

def generate_content(prompt):
    """Generates content using the configured Gemini model."""
    try:
        # --- Configuration (Repeated here for standalone execution) ---
        load_dotenv() # Load .env from the current directory
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found. Check .env file.")
        genai.configure(api_key=api_key)

        # --- Model Selection ---
        # Using Pro here for potentially better generation for files
        model_name = "gemini-1.5-pro-latest"
        model = genai.GenerativeModel(model_name)

        # --- Generation (Non-streaming) ---
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        # Print errors to stderr so main.js can potentially capture them
        print(f"Error in generate_once.py: {e}", file=sys.stderr, flush=True)
        sys.exit(1) # Indicate failure

if __name__ == "__main__":
    # Read the prompt from standard input
    full_prompt = sys.stdin.read()
    if full_prompt:
        generated_text = generate_content(full_prompt)
        if generated_text:
            # Print the full generated text to standard output
            print(generated_text, flush=True)
    else:
        print("Error: No prompt received via stdin.", file=sys.stderr, flush=True)
        sys.exit(1)
