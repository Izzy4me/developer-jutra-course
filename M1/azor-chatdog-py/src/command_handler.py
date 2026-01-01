from session import get_session_manager
from cli import console
from commands.session_list import list_sessions_command
from commands.session_display import display_full_session
from commands.session_to_pdf import export_session_to_pdf
from commands.session_remove import remove_session_command
from commands.assistant_list import list_assistants_command
from commands.audio import generate_audio_for_last, generate_audio_for_all

VALID_SLASH_COMMANDS = ['/exit', '/quit', '/switch', '/help', '/session', '/pdf', '/assistant', '/audio']

def handle_command(user_input: str) -> bool:
    """
    Handles slash commands. Returns True if the program should exit.
    """
    parts = user_input.split()
    command = parts[0].lower()

    manager = get_session_manager()

    # Check if the main command is valid
    if command not in VALID_SLASH_COMMANDS:
        console.print_error(f"Błąd: Nieznana komenda: {command}. Użyj /help.")
        current = manager.get_current_session()
        console.display_help(current.session_id, current.assistant_name)
        return False
    
    # Help command
    elif command == '/help':
        current = manager.get_current_session()
        console.display_help(current.session_id, current.assistant_name)
    
    # Exit commands
    if command in ['/exit', '/quit']:
        console.print_info("\nZakończenie czatu. Uruchamianie procedury finalnego zapisu...")
        return True
    
    # Switch command
    elif command == '/switch':
        if len(parts) == 2:
            new_id = parts[1]
            current = manager.get_current_session()
            if new_id == current.session_id:
                console.print_info("Jesteś już w tej sesji.")
            else:
                new_session, save_attempted, previous_session_id, load_successful, load_error, has_history = manager.switch_to_session(new_id)
                
                # Handle console output for save attempt
                if save_attempted:
                    console.print_info(f"\nZapisuję bieżącą sesję: {previous_session_id}...")
                
                # Handle load result
                if not load_successful:
                    console.print_error(f"Nie można wczytać sesji o ID: {new_id}. {load_error}")
                else:
                    # Successfully switched
                    console.print_info(f"\n--- Przełączono na sesję: {new_session.session_id} ---")
                    console.display_help(new_session.session_id, new_session.assistant_name)
                    
                    # Display history summary if session has content
                    if has_history:
                        from commands.session_summary import display_history_summary
                        display_history_summary(new_session.get_history(), new_session.assistant_name, new_session.get_title())
        else:
            console.print_error("Błąd: Użycie: /switch <SESSION-ID>")
            
    # Session subcommands
    elif command == '/session':
        if len(parts) < 2:
            console.print_error("Błąd: Komenda /session wymaga podkomendy (list, display, pop, clear, new).")
        else:
            handle_session_subcommand(parts[1].lower(), manager, parts)

    elif command == '/pdf':
        current = manager.get_current_session()
        export_session_to_pdf(current.get_history(), current.session_id, current.assistant_name)
    
    elif command == '/audio':
        if len(parts) < 2:
            console.print_error("Błąd: Użycie: /audio <last|all> [--pause MS] [--no-play] [--mode MODE] [--voice-sample PATH]")
        else:
            handle_audio_subcommand(parts, manager)
    
    elif command == '/assistant':
        if len(parts) < 2:
            console.print_error("Błąd: Użycie: /assistant <list|switch>")
        elif parts[1].lower() == 'list':
            list_assistants_command()
        elif parts[1].lower() == 'switch':
            if len(parts) == 3:
                assistant_id = parts[2].lower().strip()
                
                # Attempt to switch assistant through SessionManager
                success, error = manager.switch_assistant(assistant_id)
                
                if not success:
                    console.print_error(f"Nie można przełączyć na asystenta '{assistant_id}'. {error}")
                else:
                    current = manager.get_current_session()
                    console.print_info(f"\n--- Przełączono na asystenta: {current.assistant.name} ---")
                    console.print_info(f"Nowy asystent będzie używany w tej sesji.")
            else:
                console.print_error("Błąd: Użycie: /assistant switch <assistant-id>")
        else:
            console.print_error(f"Błąd: Nieznana podkomenda: {parts[1]}. Użyj 'list' lub 'switch'.")

    return False


def handle_session_subcommand(subcommand: str, manager, parts: list = None):
    """Handles /session subcommands.
    
    Args:
        subcommand: The subcommand to execute
        manager: SessionManager instance
        parts: Full command parts list (for rename command)
    """
    current = manager.get_current_session()
    
    if subcommand == 'list':
        list_sessions_command()
        
    elif subcommand == 'display':
        display_full_session(current.get_history(), current.session_id, current.assistant_name)
        
    elif subcommand == 'pop':
        success = current.pop_last_exchange()
        if success:
            from commands.session_summary import display_history_summary
            console.print_info(f"Usunięto ostatnią parę wpisów (TY i {current.assistant_name}).")
            display_history_summary(current.get_history(), current.assistant_name, current.get_title())
        else:
            console.print_error("Błąd: Historia jest pusta lub niekompletna (wymaga co najmniej jednej pary).")
            
    elif subcommand == 'clear':
        current.clear_history()
        console.print_info("Historia bieżącej sesji została wyczyszczona.")
        
    elif subcommand == 'new':
        new_session, save_attempted, previous_session_id, save_error = manager.create_new_session(save_current=True)
        
        # Handle console output for save attempt
        if save_attempted:
            console.print_info(f"\nZapisuję bieżącą sesję: {previous_session_id} przed rozpoczęciem nowej...")
            if save_error:
                console.print_error(f"Błąd podczas zapisu: {save_error}")
        
        # Display new session info
        console.print_info(f"\n--- Rozpoczęto nową sesję: {new_session.session_id} ---")
        console.display_help(new_session.session_id, new_session.assistant_name)

    elif subcommand == 'remove':
        remove_session_command(manager)
    
    elif subcommand == 'title':
        from commands.session_title import display_session_title
        display_session_title(current)
    
    elif subcommand == 'rename':
        # Extract everything after 'rename' as the new title
        if parts and len(parts) >= 3:
            # Join all parts after /session rename
            new_title = ' '.join(parts[2:])
            
            # Handle quoted strings properly - strip outer quotes only
            # This handles both "quoted text" and unquoted text with spaces
            if (new_title.startswith('"') and new_title.endswith('"')) or \
               (new_title.startswith("'") and new_title.endswith("'")):
                new_title = new_title[1:-1]
            
            from commands.session_title import rename_session_title
            rename_session_title(current, new_title, manager)
        else:
            console.print_error("Błąd: Użycie: /session rename \"NEW_TITLE\" lub /session rename NEW TITLE")
        
    else:
        console.print_error(f"Błąd: Nieznana podkomenda dla /session: {subcommand}. Użyj /help.")


def handle_audio_subcommand(parts: list, manager):
    """Handles /audio subcommands."""
    current = manager.get_current_session()
    subcommand = parts[1].lower()
    
    # Parse optional flags
    pause_ms = 500  # default
    play = True  # default
    mode = 'balanced'  # default: fast, good quality, needs Internet
    voice_sample = None  # default: no custom voice sample
    
    for i, part in enumerate(parts[2:]):
        if part.startswith('--pause'):
            if '=' in part:
                pause_ms = int(part.split('=')[1])
            elif i + 1 < len(parts[2:]):
                try:
                    pause_ms = int(parts[3 + i])
                except ValueError:
                    pass
        elif part == '--no-play':
            play = False
        elif part.startswith('--mode'):
            if '=' in part:
                mode = part.split('=')[1]
            elif i + 1 < len(parts[2:]):
                mode = parts[3 + i]
        elif part.startswith('--voice-sample'):
            if '=' in part:
                voice_sample = part.split('=')[1]
            elif i + 1 < len(parts[2:]):
                voice_sample = parts[3 + i]
    
    if subcommand == 'last':
        # --pause is not applicable for 'last' (single message). Warn if user provided it.
        if any(part.startswith('--pause') for part in parts[2:]):
            console.print_warning("Uwaga: `--pause` jest ignorowane dla `/audio last`, dotyczy tylko `/audio all`.")

        generate_audio_for_last(
            session_id=current.session_id,
            history=current.get_history(),
            play=play,
            mode=mode,
            voice_sample=voice_sample
        )
    
    elif subcommand == 'all':
        generate_audio_for_all(
            session_id=current.session_id,
            history=current.get_history(),
            pause_ms=pause_ms,
            play=play,
            mode=mode,
            voice_sample=voice_sample
        )
    
    else:
        console.print_error(f"Błąd: Nieznana podkomenda dla /audio: {subcommand}. Użyj 'last' lub 'all'.")
