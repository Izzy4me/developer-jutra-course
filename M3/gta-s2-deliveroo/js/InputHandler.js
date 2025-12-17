/**
 * InputHandler - Keyboard state manager
 * Handles keydown/keyup events for game controls
 */
export class InputHandler {
    constructor() {
        this.keys = { 
            ArrowUp: false, 
            ArrowDown: false, 
            ArrowLeft: false, 
            ArrowRight: false, 
            Space: false, 
            Enter: false 
        };
        
        window.addEventListener('keydown', (e) => {
            const code = e.code === 'Space' ? 'Space' : e.code;
            if (this.keys.hasOwnProperty(code)) { 
                this.keys[code] = true; 
                e.preventDefault(); 
            }
            if (e.code === 'Enter') { 
                this.keys.Enter = true; 
                e.preventDefault(); 
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const code = e.code === 'Space' ? 'Space' : e.code;
            if (this.keys.hasOwnProperty(code)) { 
                this.keys[code] = false; 
            }
            if (e.code === 'Enter') { 
                this.keys.Enter = false; 
            }
        });
    }
}
