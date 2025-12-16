"""
Title generation utility for chat sessions.
Generates concise titles from user messages using LLM with fallback to truncation.
"""

from assistant import Assistant
from llm.gemini_client import GeminiLLMClient
from llm.llama_client import LlamaClient
from llm.ollama_rest_client import OllamaRestClient
from llm.ollama_python_client import OllamaPythonClient
import os


# Engine to Client Class mapping (same as in chat_session.py), could be refactored to a common module in the future
ENGINE_MAPPING = {
    'LLAMA_CPP': LlamaClient,
    'GEMINI': GeminiLLMClient,
    'OLLAMA_REST': OllamaRestClient,
    'OLLAMA_PYTHON': OllamaPythonClient,
}


def generate_title_for_message(user_message: str, assistant: Assistant) -> str:
    """
    Generates a title for a session based on the first user message.
    Uses LLM to summarize with immediate fallback to truncation on any error.
    
    Args:
        user_message: The first message from the user
        assistant: Assistant instance to use for title generation
        
    Returns:
        str: A title (max 80 characters, no newlines)
    """
    # Sanitization function for title
    def sanitize_title(text: str) -> str:
        """Clean and validate title text."""
        # Strip quotes and whitespace
        cleaned = text.strip().strip('"').strip("'")
        # Remove newlines and carriage returns
        cleaned = cleaned.replace('\n', ' ').replace('\r', '')
        # Remove extra whitespace
        cleaned = ' '.join(cleaned.split())
        # Enforce 80 character limit
        if len(cleaned) > 80:
            cleaned = cleaned[:80]
        return cleaned
    
    # Try LLM generation with immediate fallback
    try:
        # Get engine from environment
        engine = os.getenv('ENGINE', 'GEMINI').upper()
        
        # Validate engine
        if engine not in ENGINE_MAPPING:
            raise ValueError(f"Invalid ENGINE: {engine}")
        
        # Create client
        SelectedClientClass = ENGINE_MAPPING.get(engine, GeminiLLMClient)
        client = SelectedClientClass.from_environment()
        
        # Create a one-off chat session for title generation
        # Use a simple system instruction optimized for title generation
        title_system_prompt = "You are a title generator. Create a concise, descriptive title (no more than 5 words) that summarizes the user's message. Respond with ONLY the title, no quotes, no explanation, no greetings."
        
        chat_session = client.create_chat_session(
            system_instruction=title_system_prompt,
            history=[],
            thinking_budget=0
        )
        
        # Generate title with LLM
        prompt = f"Summarize this message in max 80 characters:\n\n{user_message}"
        response = chat_session.send_message(prompt)
        
        # Extract and sanitize the response
        title = sanitize_title(response.text)
        
        # Validate that we got something useful
        if not title or len(title) < 3:
            raise ValueError("Generated title too short")
        
        return title
        
    except Exception:
        # Immediate fallback to truncation on ANY error
        # No retry, no delay, no logging
        fallback_title = sanitize_title(user_message[:80])
        return fallback_title if fallback_title else "Untitled session"
