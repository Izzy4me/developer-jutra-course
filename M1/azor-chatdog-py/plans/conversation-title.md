# Plan: Add Conversation Title Feature

**Date**: 15 December 2025  
**Status**: ✅ Implementation Complete

## Overview

This feature adds AI-generated or user-defined titles to chat sessions, making them easier to identify and manage. Titles are generated from the first user message (max 80 chars) using LLM summarization with immediate fallback to truncation, stored in session JSON files, and exposed through new commands.

## Requirements

### Main Requirement
- Title of the session must be created by LLM tool call (if successful) which takes first user prompt and summarizes it (max 80 characters)
- If LLM call fails, use max 80 first characters of prompt as title
- Single attempt only - no retries, immediate fallback to truncation

### Additional Requirements
- Title is saved into `.json` file with the ID and entire conversation
- Title can be changed manually for open session via `/session rename "NEW_SESSION_TITLE"`
- Title can be checked via `/session title` subcommand
- `/session list` command shows title (truncated to 50 chars if longer)
- Existing sessions without titles display "Unknown content"
- Title validation: no newlines allowed, max 80 characters

## Implementation Steps

### 1. ✅ Extend Session Data Model
**File**: [src/session/chat_session.py](src/session/chat_session.py)

Added to `ChatSession` class:
- `_title: Optional[str]` attribute (initialized from constructor parameter)
- `get_title() -> Optional[str]` method
- `set_title(new_title: str)` method with validation:
  - Strip newlines: `.replace('\n', ' ').replace('\r', '')`
  - Enforce 80 char limit
  - Strip surrounding quotes from input
  - Remove extra whitespace

### 2. ✅ Update Persistence Layer
**File**: [src/files/session_files.py](src/files/session_files.py)

Modified:
- `load_session_history()`: Now returns `(history, assistant_id, title, error)` tuple with title field
- `save_session_history()`: Added optional `title` parameter and saves it to JSON
- `list_sessions()`: Includes `title` field in returned session data
- Maintains backward compatibility with existing sessions (no title field)

### 3. ✅ Create Title Generation Utility
**File**: `src/commands/title_generator_helper.py` (NEW)

Implemented:
- `generate_title_for_message(user_message: str, assistant: Assistant) -> str` function
- LLM call with prompt: "Summarize this message in max 80 characters: {user_message}"
- Single try-catch block - any exception triggers immediate truncation fallback
- Fallback: `user_message[:80]`
- Returns sanitized title (no newlines, max 80 chars)

### 4. ✅ Hook Title Generation into Chat Flow
**File**: [src/chat.py](src/chat.py)

After user message is received:
- Check if `session.get_title()` is `None`
- If yes, call title generator before sending message to LLM
- Set title via `session.set_title()`
- Title is saved automatically when session is saved

### 5. ✅ Implement `/session title` Command
**File**: `src/commands/session_title.py` (NEW)

Created:
- `display_session_title(session)` function
- Displays current session's title or "Unknown content" for legacy sessions

### 6. ✅ Implement `/session rename` Command
**File**: `src/commands/session_title.py`

Added:
- `rename_session_title(session, new_title: str, manager)` function
- Validates title (no newlines, max 80 chars, strip quotes)
- Updates via `session.set_title(new_title)`
- Immediately persists changes via `session.save_to_file()`

### 7. ✅ Update `/session list` Display
**File**: [src/commands/session_list.py](src/commands/session_list.py)

Modified display to show:
- Title as primary identifier (not ID)
- Truncate to 50 chars with "..." if longer
- Show "Unknown content" for sessions without titles
- ID, message count, and last activity on second line

### 8. ✅ Wire New Subcommands
**File**: [src/command_handler.py](src/command_handler.py)

In `handle_session_subcommand()`, added:
```python
elif subcommand == 'title':
    from commands.session_title import display_session_title
    display_session_title(current)

elif subcommand == 'rename':
    if parts and len(parts) >= 3:
        new_title = ' '.join(parts[2:])
        from commands.session_title import rename_session_title
        rename_session_title(current, new_title, manager)
    else:
        console.print_error("Błąd: Użycie: /session rename \"NEW_TITLE\"")
```

Updated function signature to accept `parts` parameter for rename functionality.

### 9. ✅ Update Help Text
**File**: [src/cli/console.py](src/cli/console.py)

In `display_help()`, added:
```python
print_help("  /session title    - Wyświetla tytuł bieżącej sesji.")
print_help("  /session rename \"NEW_TITLE\" - Zmienia tytuł bieżącej sesji.")
```

## Technical Details

### Title Validation Rules
1. Strip all newlines: `.replace('\n', ' ').replace('\r', '')`
2. Enforce max 80 characters
3. Strip surrounding quotes (e.g., `"My Title"` → `My Title`)
4. Remove extra whitespace: `' '.join(cleaned_title.split())`
5. Empty titles not allowed (minimum 1 character)

### LLM Fallback Strategy
- **Single attempt**: One LLM call, no retries
- **Immediate fallback**: Any error/timeout → truncation
- **Fallback logic**: `user_message[:80]`
- **No user notification**: Transparent fallback (user doesn't know source)
- **System prompt**: Optimized for title generation with explicit instructions

### Backward Compatibility
- Existing session JSON files without `title` field continue to work
- `load_session_history()` uses `.get('title', None)` pattern
- Display "Unknown content" for sessions without titles
- No migration needed - titles are added organically on first user message

### Display Format
- **Full title**: In `/session title` command output
- **Truncated (50 chars)**: In `/session list` with "..." suffix
- **Fallback text**: "Unknown content" for missing titles

## Files Modified

| File | Type | Changes |
|------|------|---------|
| `src/session/chat_session.py` | Modified | Add title attribute and get/set methods |
| `src/files/session_files.py` | Modified | Save/load title field, include in list |
| `src/chat.py` | Modified | Hook title generation after first message |
| `src/commands/title_generator_helper.py` | **NEW** | LLM title generation utility |
| `src/commands/session_title.py` | **NEW** | Title display and rename commands |
| `src/commands/session_list.py` | Modified | Display titles in session list |
| `src/command_handler.py` | Modified | Wire title/rename subcommands |
| `src/cli/console.py` | Modified | Add help text for new commands |

## Usage Examples

### View current session title
```bash
/session title
```

### Rename current session
```bash
/session rename "New project discussion"
/session rename Planning Q1 2025 goals
```

### List all sessions with titles
```bash
/session list
```

Example output:
```
--- Dostępne zapisane sesje ---
- Planning Q1 2025 goals
  ID: abc123 | Wiadomości: 15 | Ost. aktywność: 2025-12-15 14:30
- Discussion about Python async patterns and best...
  ID: def456 | Wiadomości: 8 | Ost. aktywność: 2025-12-14 10:15
- Unknown content
  ID: ghi789 | Wiadomości: 3 | Ost. aktywność: 2025-12-10 09:00
--------------------------------
```

## Testing Checklist

- [x] New session gets auto-generated title from first message
- [x] `/session title` displays current title
- [x] `/session rename "New Title"` updates title
- [x] `/session list` shows truncated titles (50 chars max)
- [x] Existing sessions without titles show "Unknown content"
- [x] Title validation rejects newlines (converts to spaces)
- [x] Title validation enforces 80 char limit
- [x] LLM failure triggers immediate truncation fallback
- [x] Session files save and load title correctly
- [x] Backward compatibility with sessions without title field

## Implementation Notes

1. **Title generation timing**: Title is generated BEFORE the first message is sent to the LLM, ensuring the title is available immediately after the first exchange.

2. **Error handling**: The title generation process is wrapped in a try-except to ensure any failure doesn't break the chat flow.

3. **Session list display**: Changed from ID-centric to title-centric display, making sessions more human-readable while keeping ID accessible.

4. **Command parsing**: The rename command accepts multi-word titles without requiring quotes, though quotes are supported and will be stripped.

5. **Validation consistency**: Title validation is centralized in `ChatSession.set_title()` method, ensuring consistency across all title-setting operations.
