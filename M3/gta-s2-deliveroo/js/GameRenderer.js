/**
 * GameRenderer - Main rendering coordinator
 * 
 * Orchestrates all specialized renderers:
 * - EnvironmentRenderer: Background/level rendering
 * - ScreenRenderer: UI screens (title, complete, history)
 * - EffectsRenderer: Visual effects (bonk, parking hint, screen shake)
 * 
 * Handles state-based rendering dispatch
 */

import { EnvironmentRenderer } from './EnvironmentRenderer.js';
import { ScreenRenderer } from './ScreenRenderer.js';
import { EffectsRenderer } from './EffectsRenderer.js';
import { ToastRenderer } from './renderers/ToastRenderer.js';

export class GameRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Specialized renderers
        this.environmentRenderer = new EnvironmentRenderer(ctx);
        this.screenRenderer = new ScreenRenderer(ctx, canvas);
        this.effectsRenderer = new EffectsRenderer(ctx);
        this.toastRenderer = new ToastRenderer(ctx);
    }

    /**
     * Main rendering entry point
     * @param {Object} gameState - Complete game state snapshot
     */
    draw(gameState) {
        this.ctx.save();

        // Apply UI collapse state (renderer-driven approach)
        this.applyUiCollapseState(gameState);
        
        // Apply screen shake if active
        if (gameState.screenShake > 0) {
            // Normalize intensity to 0-1 range (shakeTimer max is 10)
            const intensity = Math.min(gameState.screenShake / 10, 1.0);
            this.effectsRenderer.applyScreenShake(
                intensity, 
                this.canvas.width, 
                this.canvas.height
            );
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // State-based rendering
        switch(gameState.state) {
            case 'TITLE_SCREEN':
                this.renderTitleScreen(gameState.ui.title);
                break;
                
            case 'HISTORY_SCREEN':
                this.renderHistoryScreen(gameState.ui.history);
                break;
                
            case 'ACHIEVEMENTS_SCREEN':
                this.renderAchievementsScreen(gameState.ui.achievements);
                break;
                
            case 'LOADING':
                this.renderLoadingScreen();
                break;
                
            case 'LEVEL_COMPLETE':
                this.renderLevelCompleteScreen(gameState.ui.levelComplete);
                break;
                
            case 'RUNNING':
            case 'GAMEOVER':
                this.renderGameplay(gameState);
                break;
        }
        
        // Draw achievement toasts on ALL screens (always on top)
        this.toastRenderer.draw(this.canvas.width, this.canvas.height);
        
        this.ctx.restore();
    }

    /**
     * Render title screen
     */
    renderTitleScreen(uiState) {
        const buttonBounds = this.screenRenderer.drawTitleScreen(uiState);
        // Button bounds are stored in screenRenderer for Game.js to access
        return buttonBounds;
    }

    /**
     * Render history screen
     */
    renderHistoryScreen(uiState) {
        const buttonBounds = this.screenRenderer.drawHistoryScreen(uiState);
        return buttonBounds;
    }

    /**
     * Render achievements screen
     */
    renderAchievementsScreen(uiState) {
        const buttonBounds = this.screenRenderer.drawAchievementsScreen(uiState);
        return buttonBounds;
    }

    /**
     * Render loading screen
     */
    renderLoadingScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '22px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Ładowanie poziomu...', this.canvas.width / 2, this.canvas.height / 2);
    }

    /**
     * Render level complete screen
     */
    renderLevelCompleteScreen(uiState) {
        const buttonBounds = this.screenRenderer.drawLevelCompleteScreen(uiState);
        return buttonBounds;
    }

    /**
     * Render gameplay (RUNNING or GAMEOVER state)
     */
    renderGameplay(gameState) {
        // Hide car selection panel during gameplay
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'none';

        // Draw environment background
        const environmentType = gameState.environmentType || 'street';
        this.environmentRenderer.drawEnvironment(
            environmentType,
            this.canvas.width,
            this.canvas.height
        );

        // Draw entities (delegated to entity.draw())
        const entities = gameState.entities;
        
        if (entities.parkingZones) {
            entities.parkingZones.forEach(z => z.draw(this.ctx));
        }

        if (entities.curbs) {
            entities.curbs.forEach(c => c.draw(this.ctx));
        }

        if (entities.obstacles) {
            entities.obstacles.forEach(o => o.draw(this.ctx));
        }

        if (entities.npcCars) {
            entities.npcCars.forEach(car => car.draw(this.ctx));
        }

        // Draw player car (with skid marks)
        if (entities.player) {
            entities.player.drawSkidMarks(this.ctx);
            entities.player.draw(this.ctx);
        }

        // Draw effects
        const effects = gameState.effects;

        // Parking hint
        if (effects.showParkingHint) {
            this.effectsRenderer.drawParkingHint(
                effects.time,
                this.canvas.width,
                this.canvas.height
            );
        }

        // Bonk effect on game over
        if (gameState.state === 'GAMEOVER' && effects.bonkPosition) {
            this.effectsRenderer.drawBonk(effects.bonkPosition);
        }
    }

    /**
     * Get button bounds from screen renderer (for click detection)
     */
    getTitleButtonBounds() {
        return {
            playButton: this.screenRenderer.titleButtonBounds,
            historyButton: this.screenRenderer.historyButtonBounds,
            achievementsButton: this.screenRenderer.achievementsButtonBounds
        };
    }

    getLevelCompleteButtonBounds() {
        return {
            nextButton: this.screenRenderer.levelCompleteButtonBounds
        };
    }

    getHistoryButtonBounds() {
        return {
            backButton: this.screenRenderer.historyBackButtonBounds
        };
    }

    getAchievementsButtonBounds() {
        return {
            backButton: this.screenRenderer.achievementsBackButtonBounds
        };
    }

    /**
     * Apply UI collapse state from game state (renderer-driven approach)
     */
    applyUiCollapseState(gameState) {
        try {
            const uiContainer = document.getElementById('ui-container');
            if (uiContainer) {
                // Always prefer the game state value when it's explicitly set (not null/undefined)
                let shouldCollapse;
                if (gameState.uiCollapsed !== null && gameState.uiCollapsed !== undefined) {
                    shouldCollapse = gameState.uiCollapsed;
                } else {
                    // No explicit game state - apply per-screen defaults
                    shouldCollapse = (gameState.state === 'ACHIEVEMENTS_SCREEN' || gameState.state === 'HISTORY_SCREEN');
                }
                
                // Update DOM with collapse state
                if (shouldCollapse) {
                    uiContainer.classList.add('ui-collapsed');
                } else {
                    uiContainer.classList.remove('ui-collapsed');
                }
                
                this.updateCollapseButton(shouldCollapse);
            }
        } catch (e) { /* DOM might not be available in some test environment */}
    }

    /**
     * Update collapse button appearance and aria attributes
     */
    updateCollapseButton(shouldCollapse) {
        try {
            const collapseBtn = document.getElementById('toggle-ui-collapse');
            if (collapseBtn) {
                collapseBtn.setAttribute('aria-expanded', shouldCollapse ? 'false' : 'true');
                collapseBtn.innerText = shouldCollapse ? '☰' : '✕';
                collapseBtn.title = shouldCollapse ? 'Pokaż menu (H)' : 'Zwiń menu (H)';
            }
        } catch (e) { /* ignore DOM update errors */ }
    }
}
