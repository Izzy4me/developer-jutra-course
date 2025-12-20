/**
 * ScreenRenderer - Handles UI screen rendering
 * 
 * Renders three main screens:
 * - Title screen with animated background and buttons
 * - Level complete screen with celebration effects
 * - History screen with statistics and level list
 * 
 * Owns animation timers for each screen
 */

export class ScreenRenderer {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        
        // Animation timers (owned by ScreenRenderer)
        this.titleAnimTime = 0;
        this.completeAnimTime = 0;
        this.historyAnimTime = 0;
        
        // Button bounds (returned to Game for click detection)
        this.titleButtonBounds = null;
        this.historyButtonBounds = null;
        this.levelCompleteButtonBounds = null;
        this.historyBackButtonBounds = null;
    }

    /**
     * Render title screen with 90s style animations
     * @param {Object} state - { hoverPlay, hoverHistory }
     * @returns {Object} Button bounds for click detection
     */
    drawTitleScreen(state) {
        // Increment animation timer
        this.titleAnimTime += 0.016; // ~60fps
        
        // Animated gradient background (cyan-magenta-blue)
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const offset1 = Math.sin(this.titleAnimTime * 0.5) * 0.5 + 0.5;
        const offset2 = Math.cos(this.titleAnimTime * 0.3) * 0.5 + 0.5;
        grad.addColorStop(0, `rgb(${Math.floor(offset1 * 100)}, ${Math.floor(offset2 * 150 + 100)}, 200)`);
        grad.addColorStop(0.5, `rgb(${Math.floor(offset2 * 150)}, 50, ${Math.floor(offset1 * 200 + 55)})`);
        grad.addColorStop(1, `rgb(100, ${Math.floor(offset1 * 100)}, ${Math.floor(offset2 * 150 + 100)})`);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid effect (very 90s!)
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Animated stars/particles
        for (let i = 0; i < 30; i++) {
            const x = ((i * 137.5 + this.titleAnimTime * 50) % this.canvas.width);
            const y = (i * 47.3) % this.canvas.height;
            const size = Math.sin(this.titleAnimTime + i) * 2 + 3;
            this.ctx.fillStyle = `rgba(255, 255, 0, ${Math.sin(this.titleAnimTime * 2 + i) * 0.3 + 0.7})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Main title with shadow/3D effect
        const centerY = this.canvas.height / 2 - 80;
        
        // Shadow layers (90s 3D effect)
        for (let i = 8; i > 0; i--) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.1})`;
            this.ctx.font = 'bold 48px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('GTA: S2 Deliveroo', this.canvas.width / 2 + i, centerY + i);
        }
        
        // Main title with gradient
        const titleGrad = this.ctx.createLinearGradient(0, centerY - 30, 0, centerY + 30);
        titleGrad.addColorStop(0, '#ffff00');
        titleGrad.addColorStop(0.5, '#ff00ff');
        titleGrad.addColorStop(1, '#00ffff');
        this.ctx.fillStyle = titleGrad;
        this.ctx.font = 'bold 48px Arial, sans-serif';
        this.ctx.fillText('GTA: S2 Deliveroo', this.canvas.width / 2, centerY);
        
        // Outline
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('GTA: S2 Deliveroo', this.canvas.width / 2, centerY);
        
        // Subtitle
        this.ctx.font = 'bold 48px Arial, sans-serif';
        const subtitleY = centerY + 50;
        
        // Subtitle shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillText('(obwodnica Warszafki)', this.canvas.width / 2 + 2, subtitleY + 2);
        
        // Subtitle with cyan color
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillText('(obwodnica Warszafki)', this.canvas.width / 2, subtitleY);
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText('(obwodnica Warszafki)', this.canvas.width / 2, subtitleY);
        
        // "PLAY THE GAME" Button (90s style)
        const buttonWidth = 280;
        const buttonHeight = 60;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height - 250; // Moved up by 100px
        
        // Store button bounds for click detection
        this.titleButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Animated button (pulsing effect)
        const pulse = Math.sin(this.titleAnimTime * 3) * 0.1 + 1;
        
        // Button shadow (3D effect)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(buttonX + 5, buttonY + 5, buttonWidth, buttonHeight);
        
        // Button background with gradient
        const btnGrad = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        if (state.hoverPlay) {
            btnGrad.addColorStop(0, '#ffff00');
            btnGrad.addColorStop(1, '#ff00ff');
        } else {
            btnGrad.addColorStop(0, '#ff00ff');
            btnGrad.addColorStop(1, '#00ffff');
        }
        this.ctx.fillStyle = btnGrad;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Inner border for more 90s look
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(buttonX + 4, buttonY + 4, buttonWidth - 8, buttonHeight - 8);
        
        // Button text
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, buttonY + buttonHeight / 2);
        this.ctx.scale(pulse, pulse);
        
        // Text shadow
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 24px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PLAY THE GAME', 2, 2);
        
        // Text
        this.ctx.fillStyle = state.hoverPlay ? '#000' : '#fff';
        this.ctx.fillText('PLAY THE GAME', 0, 0);
        
        this.ctx.restore();
        
        // "VIEW HISTORY" Button (90s style)
        const historyButtonWidth = 280;
        const historyButtonHeight = 50;
        const historyButtonX = this.canvas.width / 2 - historyButtonWidth / 2;
        const historyButtonY = buttonY + buttonHeight + 15;
        
        // Store history button bounds for click detection
        this.historyButtonBounds = {
            x: historyButtonX,
            y: historyButtonY,
            width: historyButtonWidth,
            height: historyButtonHeight
        };
        
        // History button shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(historyButtonX + 4, historyButtonY + 4, historyButtonWidth, historyButtonHeight);
        
        // History button background with gradient
        const historyBtnGrad = this.ctx.createLinearGradient(historyButtonX, historyButtonY, historyButtonX, historyButtonY + historyButtonHeight);
        if (state.hoverHistory) {
            historyBtnGrad.addColorStop(0, '#00ffff');
            historyBtnGrad.addColorStop(1, '#00ff00');
        } else {
            historyBtnGrad.addColorStop(0, '#00ff00');
            historyBtnGrad.addColorStop(1, '#00ffff');
        }
        this.ctx.fillStyle = historyBtnGrad;
        this.ctx.fillRect(historyButtonX, historyButtonY, historyButtonWidth, historyButtonHeight);
        
        // History button border
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(historyButtonX, historyButtonY, historyButtonWidth, historyButtonHeight);
        
        // History button inner border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(historyButtonX + 3, historyButtonY + 3, historyButtonWidth - 6, historyButtonHeight - 6);
        
        // History button text
        this.ctx.font = 'bold 20px Arial, sans-serif';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('📊 VIEW HISTORY', this.canvas.width / 2 + 1, historyButtonY + historyButtonHeight / 2 + 1);
        this.ctx.fillStyle = state.hoverHistory ? '#000' : '#fff';
        this.ctx.fillText('📊 VIEW HISTORY', this.canvas.width / 2, historyButtonY + historyButtonHeight / 2);
        
        // "ACHIEVEMENTS" Button (90s style)
        const achievementsButtonWidth = 280;
        const achievementsButtonHeight = 50;
        const achievementsButtonX = this.canvas.width / 2 - achievementsButtonWidth / 2;
        const achievementsButtonY = historyButtonY + historyButtonHeight + 15;
        
        // Store achievements button bounds for click detection
        this.achievementsButtonBounds = {
            x: achievementsButtonX,
            y: achievementsButtonY,
            width: achievementsButtonWidth,
            height: achievementsButtonHeight
        };
        
        // Achievements button shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(achievementsButtonX + 4, achievementsButtonY + 4, achievementsButtonWidth, achievementsButtonHeight);
        
        // Achievements button background with gradient
        const achievementsBtnGrad = this.ctx.createLinearGradient(achievementsButtonX, achievementsButtonY, achievementsButtonX, achievementsButtonY + achievementsButtonHeight);
        if (state.hoverAchievements) {
            achievementsBtnGrad.addColorStop(0, '#FFD700');
            achievementsBtnGrad.addColorStop(1, '#FFA500');
        } else {
            achievementsBtnGrad.addColorStop(0, '#FFA500');
            achievementsBtnGrad.addColorStop(1, '#FFD700');
        }
        this.ctx.fillStyle = achievementsBtnGrad;
        this.ctx.fillRect(achievementsButtonX, achievementsButtonY, achievementsButtonWidth, achievementsButtonHeight);
        
        // Achievements button border
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(achievementsButtonX, achievementsButtonY, achievementsButtonWidth, achievementsButtonHeight);
        
        // Achievements button inner border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(achievementsButtonX + 3, achievementsButtonY + 3, achievementsButtonWidth - 6, achievementsButtonHeight - 6);
        
        // Achievements button text
        this.ctx.font = 'bold 20px Arial, sans-serif';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('🏆 ACHIEVEMENTS', this.canvas.width / 2 + 1, achievementsButtonY + achievementsButtonHeight / 2 + 1);
        this.ctx.fillStyle = state.hoverAchievements ? '#000' : '#fff';
        this.ctx.fillText('🏆 ACHIEVEMENTS', this.canvas.width / 2, achievementsButtonY + achievementsButtonHeight / 2);
        
        // Copyright/credits
        this.ctx.font = '12px Arial, sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillText('© 1993 WARSZAFKA STUDIOS & © 2025 KRAKUF REMAKES', this.canvas.width / 2, this.canvas.height - 30);
        
        // Show car selection panel on title screen
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'block';
        
        return {
            playButton: this.titleButtonBounds,
            historyButton: this.historyButtonBounds,
            achievementsButton: this.achievementsButtonBounds
        };
    }

    /**
     * Render level complete screen with celebration
     * NOTE: This is a placeholder - full implementation needs completion data from Game.js
     * @param {Object} state - { score, medal, personalBest, isNewBest, hoverNext }
     * @returns {Object} Button bounds
     */
    drawLevelCompleteScreen(state) {
        // Hide car selection panel during level complete
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'none';
        
        // Increment animation timer
        this.completeAnimTime += 0.016;
        
        // Animated gradient background (celebration colors!)
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const offset1 = Math.sin(this.completeAnimTime * 0.7) * 0.5 + 0.5;
        const offset2 = Math.cos(this.completeAnimTime * 0.5) * 0.5 + 0.5;
        grad.addColorStop(0, `rgb(${Math.floor(offset1 * 200 + 55)}, ${Math.floor(offset2 * 100)}, ${Math.floor(offset1 * 100 + 100)})`);
        grad.addColorStop(0.5, `rgb(${Math.floor(offset2 * 100 + 150)}, ${Math.floor(offset1 * 200)}, 100)`);
        grad.addColorStop(1, `rgb(100, ${Math.floor(offset2 * 100 + 150)}, ${Math.floor(offset1 * 200 + 55)})`);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Celebratory stars everywhere!
        for (let i = 0; i < 50; i++) {
            const x = ((i * 137.5 + this.completeAnimTime * 80) % this.canvas.width);
            const y = ((i * 83.7 + this.completeAnimTime * 60) % this.canvas.height);
            const size = Math.sin(this.completeAnimTime * 3 + i) * 2 + 3;
            const colors = ['#ffff00', '#ff00ff', '#00ffff', '#ff0000', '#00ff00'];
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // "GRATULACJE!" title with bouncing effect
        const centerY = this.canvas.height / 2 - 100;
        const bounce = Math.sin(this.completeAnimTime * 4) * 10;
        
        // Shadow layers
        for (let i = 8; i > 0; i--) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.1})`;
            this.ctx.font = 'bold 56px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('GRATULACJE!', this.canvas.width / 2 + i, centerY + bounce + i);
        }
        
        // Main title with rainbow gradient
        const titleGrad = this.ctx.createLinearGradient(0, centerY - 30, 0, centerY + 30);
        titleGrad.addColorStop(0, '#ff0000');
        titleGrad.addColorStop(0.33, '#ffff00');
        titleGrad.addColorStop(0.66, '#00ff00');
        titleGrad.addColorStop(1, '#00ffff');
        this.ctx.fillStyle = titleGrad;
        this.ctx.font = 'bold 56px Arial, sans-serif';
        this.ctx.fillText('GRATULACJE!', this.canvas.width / 2, centerY + bounce);
        
        // Outline
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText('GRATULACJE!', this.canvas.width / 2, centerY + bounce);
        
        // Score display - show "Poziom ukończony" for first completion, "Wynik:" for subsequent
        const scoreY = centerY + 80;
        this.ctx.font = 'bold 36px Arial, sans-serif';
        this.ctx.fillStyle = '#fff';
        const isFirstCompletion = state.personalBest === null;
        if (isFirstCompletion) {
            this.ctx.fillText('Poziom ukończony', this.canvas.width / 2, scoreY);
        } else {
            this.ctx.fillText(`Wynik: ${state.score.toFixed(1)}%`, this.canvas.width / 2, scoreY);
        }
        
        // Medal display
        if (state.medal) {
            this.ctx.font = '48px Arial, sans-serif';
            this.ctx.fillText(state.medal, this.canvas.width / 2, scoreY + 50);
        }
        
        // Personal best indicator - show "NOWY REKORD" only when beating existing record
        if (state.isNewBest && !isFirstCompletion) {
            this.ctx.font = 'bold 24px Arial, sans-serif';
            this.ctx.fillStyle = '#ffff00';
            const pulseText = Math.sin(this.completeAnimTime * 5) * 0.2 + 1;
            this.ctx.save();
            this.ctx.translate(this.canvas.width / 2, scoreY + 100);
            this.ctx.scale(pulseText, pulseText);
            this.ctx.fillText('🏆 NOWY REKORD! 🏆', 0, 0);
            this.ctx.restore();
        } else if (state.personalBest !== null && !state.isNewBest) {
            this.ctx.font = '18px Arial, sans-serif';
            this.ctx.fillStyle = '#ccc';
            this.ctx.fillText(`Najlepszy wynik: ${state.personalBest.toFixed(1)}%`, this.canvas.width / 2, scoreY + 100);
        }
        
        // "NASTĘPNY POZIOM" Button
        const buttonWidth = 300;
        const buttonHeight = 60;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height - 120;
        
        this.levelCompleteButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Button shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(buttonX + 5, buttonY + 5, buttonWidth, buttonHeight);
        
        // Button background
        const btnGrad = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        if (state.hoverNext) {
            btnGrad.addColorStop(0, '#00ff00');
            btnGrad.addColorStop(1, '#00ffff');
        } else {
            btnGrad.addColorStop(0, '#00ffff');
            btnGrad.addColorStop(1, '#00ff00');
        }
        this.ctx.fillStyle = btnGrad;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button text
        this.ctx.font = 'bold 24px Arial, sans-serif';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('NASTĘPNY POZIOM', this.canvas.width / 2 + 2, buttonY + buttonHeight / 2 + 2);
        this.ctx.fillStyle = state.hoverNext ? '#000' : '#fff';
        this.ctx.fillText('NASTĘPNY POZIOM', this.canvas.width / 2, buttonY + buttonHeight / 2);
        
        return {
            nextButton: this.levelCompleteButtonBounds
        };
    }

    /**
     * Render history screen with statistics
     * NOTE: This is a placeholder - full implementation needs history data from Game.js
     * @param {Object} state - { levels, completionRate, avgScore, scrollOffset, hoverBack }
     * @returns {Object} Button bounds
     */
    drawHistoryScreen(state) {
        // Hide car selection panel
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'none';

        // Increment animation timer
        this.historyAnimTime += 0.016;

        // Clamp scroll offset
        const { maxScroll } = this.getHistoryScrollBounds(state.levels);
        const scrollOffset = Math.max(0, Math.min(state.scrollOffset, maxScroll));

        // Animated gradient background
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const offset1 = Math.sin(this.historyAnimTime * 0.4) * 0.5 + 0.5;
        const offset2 = Math.cos(this.historyAnimTime * 0.3) * 0.5 + 0.5;
        grad.addColorStop(0, `rgb(${Math.floor(offset1 * 100 + 50)}, ${Math.floor(offset2 * 100 + 50)}, 150)`);
        grad.addColorStop(1, `rgb(50, ${Math.floor(offset1 * 100 + 50)}, ${Math.floor(offset2 * 100 + 100)})`);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Title
        this.ctx.font = 'bold 36px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('📊 HISTORIA WYNIKÓW', this.canvas.width / 2, 50);

        // Statistics
        const statsY = 100;
        this.ctx.font = '20px Arial, sans-serif';
        const completionCount = state.completionCount || { completed: 0, total: state.levels.length };
        this.ctx.fillText(`Ukończono: ${state.completionRate}% (${completionCount.completed}/${completionCount.total})`, this.canvas.width / 2, statsY);
        this.ctx.fillText(`Średni wynik: ${state.avgScore.toFixed(1)}%`, this.canvas.width / 2, statsY + 30);

        // Level list (scrollable)
        let yOffset = statsY + 80;
        this.ctx.font = '18px Arial, sans-serif';
        this.ctx.textAlign = 'left';

        // Draw all levels
        if (state.levels && state.levels.length > 0) {
            for (let i = 0; i < state.levels.length; i++) {
                const level = state.levels[i];
                const displayY = yOffset + i * 40 - scrollOffset;

                if (displayY > 150 && displayY < this.canvas.height - 100) {
                    this.ctx.fillStyle = '#fff';

                    // Format: "Poziom X 🥇 85.5% (SUV) - Attempts: Y" or "Poziom X - Nie ukończono"
                    if (level.bestScore) {
                        const scoreText = `Poziom ${level.levelNumber} ${level.bestScore.medal} ${level.bestScore.score.toFixed(1)}% (${this.getCarTypeShortName(level.bestScore.carType)}) - Attempts: ${level.bestScore.attempts}`;
                        this.ctx.fillText(scoreText, 100, displayY);
                    } else {
                        this.ctx.fillStyle = '#b9b5b5ff';
                        this.ctx.fillText(`Poziom ${level.levelNumber} - Nie ukończono`, 100, displayY);
                    }
                }
            }
        }
        
        // "BACK" Button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height - 80;
        
        this.historyBackButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Button shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(buttonX + 4, buttonY + 4, buttonWidth, buttonHeight);
        
        // Button background
        const btnGrad = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        if (state.hoverBack) {
            btnGrad.addColorStop(0, '#ff00ff');
            btnGrad.addColorStop(1, '#00ffff');
        } else {
            btnGrad.addColorStop(0, '#00ffff');
            btnGrad.addColorStop(1, '#ff00ff');
        }
        this.ctx.fillStyle = btnGrad;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button text
        this.ctx.font = 'bold 20px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('BACK', this.canvas.width / 2 + 1, buttonY + buttonHeight / 2 + 1);
        this.ctx.fillStyle = state.hoverBack ? '#000' : '#fff';
        this.ctx.fillText('BACK', this.canvas.width / 2, buttonY + buttonHeight / 2);
        
        return {
            backButton: this.historyBackButtonBounds
        };
    }

    /**
     * Calculate scroll boundaries for the history screen
     * @param {Array} levels - The array of level history data
     * @returns {Object} - { maxScroll }
     */
    getHistoryScrollBounds(levels) {
        if (!levels || levels.length === 0) {
            return { maxScroll: 0 };
        }

        const statsY = 100;
        const listStartY = statsY + 80;
        const itemHeight = 40;
        const listHeight = levels.length * itemHeight;
        const visibleHeight = this.canvas.height - listStartY - 100; // Height of the visible list area

        const maxScroll = Math.max(0, listHeight - visibleHeight + 50); // +50 for some padding
        return { maxScroll };
    }

    /**
     * Draw achievements screen with scrollable achievement list
     * @param {Object} state - State containing achievement data and scroll offset
     */
    drawAchievementsScreen(state) {
        // Dark background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.font = 'bold 36px Arial, sans-serif';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏆 ACHIEVEMENTS', this.canvas.width / 2, 40);
        
        // Stats summary
        const stats = state.achievementStats || { unlocked: 0, total: 0, completionRate: 0 };
        this.ctx.font = 'bold 18px Arial, sans-serif';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(
            `Unlocked: ${stats.unlocked}/${stats.total} (${stats.completionRate}%)`,
            this.canvas.width / 2,
            80
        );
        
        // Scrollable achievement list
        const achievements = state.achievements || [];
        const startY = 120;
        const achievementHeight = 100;
        const padding = 10;
        const scrollOffset = state.achievementsScrollOffset || 0;
        
        // Enable scrolling
        const visibleHeight = this.canvas.height - startY - 100;
        const totalHeight = achievements.length * (achievementHeight + padding);
        
        // Clip region for scrolling
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(50, startY, this.canvas.width - 100, visibleHeight);
        this.ctx.clip();
        
        // Draw each achievement
        achievements.forEach((achievement, index) => {
            const y = startY + index * (achievementHeight + padding) - scrollOffset;
            
            // Only draw if visible
            if (y + achievementHeight < startY || y > startY + visibleHeight) {
                return;
            }
            
            const x = 70;
            const width = this.canvas.width - 140;
            
            // Achievement card background
            if (achievement.isUnlocked) {
                // Unlocked - green gradient
                const grad = this.ctx.createLinearGradient(x, y, x, y + achievementHeight);
                grad.addColorStop(0, 'rgba(46, 204, 113, 0.3)');
                grad.addColorStop(1, 'rgba(39, 174, 96, 0.3)');
                this.ctx.fillStyle = grad;
            } else {
                // Locked - dark gray
                this.ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
            }
            this.ctx.fillRect(x, y, width, achievementHeight);
            
            // Border
            this.ctx.strokeStyle = achievement.isUnlocked ? '#2ecc71' : '#555';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, achievementHeight);
            
            // Trophy icon or lock
            this.ctx.font = '32px Arial, sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(achievement.isUnlocked ? '🏆' : '🔒', x + 15, y + 15);
            
            // Achievement title
            this.ctx.font = 'bold 18px Arial, sans-serif';
            this.ctx.fillStyle = achievement.isUnlocked ? '#FFD700' : '#888';
            this.ctx.fillText(achievement.title, x + 65, y + 15);
            
            // Achievement description
            this.ctx.font = '14px Arial, sans-serif';
            this.ctx.fillStyle = achievement.isUnlocked ? '#fff' : '#666';
            this.ctx.fillText(achievement.description, x + 65, y + 40);
            
            // Category badge (top right)
            this.ctx.font = 'bold 10px Arial, sans-serif';
            this.ctx.fillStyle = achievement.isUnlocked ? 'rgba(255, 255, 255, 0.7)' : 'rgba(150, 150, 150, 0.5)';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(achievement.category || 'OTHER', x + width - 10, y + 15);
            
            // Progress bar (if applicable)
            if (achievement.progressMax && achievement.progressMax > 1) {
                const progress = achievement.progress || 0;
                const progressPercent = Math.min((progress / achievement.progressMax) * 100, 100);
                
                // Progress bar background
                const barY = y + 70;
                const barHeight = 15;
                const barWidth = width - 80;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(x + 65, barY, barWidth, barHeight);
                
                // Progress bar fill
                const fillWidth = (barWidth * progressPercent) / 100;
                const progressGrad = this.ctx.createLinearGradient(x + 65, barY, x + 65 + fillWidth, barY);
                progressGrad.addColorStop(0, '#3498db');
                progressGrad.addColorStop(1, '#2980b9');
                this.ctx.fillStyle = progressGrad;
                this.ctx.fillRect(x + 65, barY, fillWidth, barHeight);
                
                // Progress text - vertically center the text inside the bar
                this.ctx.font = '10px Arial, sans-serif';
                this.ctx.fillStyle = '#fff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(`${progress}/${achievement.progressMax}`, x + 65 + barWidth / 2, barY + barHeight / 2);
                // Restore baseline for subsequent text drawing
                this.ctx.textBaseline = 'top';
            }
            
            // Unlocked date (if available)
            if (achievement.unlockedDate) {
                const date = new Date(achievement.unlockedDate);
                const dateStr = date.toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                this.ctx.font = '10px Arial, sans-serif';
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`Odblokowany: ${dateStr}`, x + width - 10, y + 85);
            }
        });
        
        this.ctx.restore();
        
        // Scroll indicators
        if (scrollOffset > 0) {
            // Up arrow
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '24px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('▲', this.canvas.width / 2, startY - 10);
        }
        if (scrollOffset < totalHeight - visibleHeight && totalHeight > visibleHeight) {
            // Down arrow
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '24px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('▼', this.canvas.width / 2, startY + visibleHeight + 10);
        }
        
        // "BACK" Button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height - 70;
        
        this.achievementsBackButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Button shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(buttonX + 3, buttonY + 3, buttonWidth, buttonHeight);
        
        // Button background
        const btnGrad = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        if (state.hoverAchievementsBack) {
            btnGrad.addColorStop(0, '#e74c3c');
            btnGrad.addColorStop(1, '#c0392b');
        } else {
            btnGrad.addColorStop(0, '#c0392b');
            btnGrad.addColorStop(1, '#e74c3c');
        }
        this.ctx.fillStyle = btnGrad;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button text
        this.ctx.font = 'bold 20px Arial, sans-serif';
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⬅ BACK', buttonX + buttonWidth / 2 + 1, buttonY + buttonHeight / 2 + 1);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('⬅ BACK', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
        
        return {
            backButton: this.achievementsBackButtonBounds
        };
    }

    /**
     * Get short name for car type (for badge and history display)
     * @param {string} carType - Full car type name
     * @returns {string} Short car type name
     */
    getCarTypeShortName(carType) {
        const names = {
            'COMPACT': 'CMP',
            'SPORT': 'SPT',
            'SUV': 'SUV',
            'TRUCK': 'TRK'
        };
        return names[carType] || carType;
    }
}
