"""
Session title commands - display and rename functionality.
"""

from cli import console


def display_session_title(session):
    """
    Displays the current session's title.
    
    Args:
        session: ChatSession instance
    """
    title = session.get_title()
    
    if not title:
        console.print_info("\nTytuł sesji: Unknown content")
    else:
        console.print_info(f"\nTytuł sesji: {title}")


def rename_session_title(session, new_title: str, manager):
    """
    Renames the current session's title and saves it.
    
    Args:
        session: ChatSession instance
        new_title: New title for the session
        manager: SessionManager instance for saving
    """
    try:
        session.set_title(new_title)
        
        # Save immediately to persist the change
        success, error = session.save_to_file()
        
        if not success and error:
            console.print_error(f"Błąd podczas zapisu nowego tytułu: {error}")
        else:
            console.print_info(f"\nTytuł sesji zmieniony na: {session.get_title()}")
            
    except ValueError as e:
        console.print_error(f"Błąd: Nieprawidłowy tytuł. {str(e)}")
