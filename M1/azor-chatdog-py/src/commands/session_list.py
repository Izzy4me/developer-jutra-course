from files import session_files
from cli import console

def list_sessions_command():
    """Displays a formatted list of available sessions."""
    sessions = session_files.list_sessions()
    if sessions:
        console.print_help("\n--- Dostępne zapisane sesje ---")
        for session in sessions:
            if session.get('error'):
                console.print_error(f"- ID: {session['id']} ({session['error']})")
            else:
                display_title = _prepare_display_session_title(session.get('title'))
                
                console.print_help(f"-{display_title} | Wiadomości: {session['messages_count']} | Ost. aktywność: {session['last_activity']} | ID: {session['id']}")
        console.print_help("--------------------------------")
    else:
        console.print_help("\nBrak zapisanych sesji.")

def _prepare_display_session_title(title: str | None) -> str:
    if not title:
        display_title = "Unknown content"
    elif len(title) > 60:
        display_title = title[:60] + "..."
    else:
        display_title = title

    return display_title
