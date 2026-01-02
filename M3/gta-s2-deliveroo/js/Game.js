/**
 * Game - Full implementation
 * Extracted from index.html (lines 1469-2759)
 */
import PlayerCar from './PlayerCar.js';
import { NpcCar } from './NpcCar.js';
import { ObstacleCar } from './ObstacleCar.js';
import { Pillar } from './Pillar.js';
import { ParkingZone } from './ParkingZone.js';
import { Curb } from './Curb.js';
import * as geom from './utils/geom.js';
import * as audio from './utils/audio.js';
import { CONFIG } from './config.js';
import { CAR_CONFIGS } from './carConfigs.js';
import levelFiles from './levels/index.js';
import { ScoreHistory } from './ScoreHistory.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import { GameRenderer } from './GameRenderer.js';
import { AchievementManager } from './achievements/AchievementManager.js';

export default 
class Game {
    constructor(canvas, ctx, input) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.input = input;
        
        // Initialize GameRenderer (owns specialized renderers)
        this.renderer = new GameRenderer(canvas, ctx);
        
        this.shakeTimer = 0;
        this.collisionCooldown = 0; // Prevents retriggering collision immediately
        this.levelCount = levelFiles.length;
        this.currentLevelIdx = 0;
        this.state = 'TITLE_SCREEN'; 
        this.bonkPos = {x:0, y:0};
        this.player = new PlayerCar(0,0,0, null, 'COMPACT');
        this.currentCars = [];
        this.currentObstacles = [];
        this.currentCurbs = [];
        this.currentParkingZones = [];
        this.isMusicOn = true;
        this.parkingScore = 0; // 0-100% parking accuracy score
        this.shouldRelockTruck = false; // Track if TRUCK needs to be re-locked
        this.requireManualBrakeToPark = false; // Manual parking brake requirement (default: OFF)
        this.showParkingHint = false; // Show hint when player is in zone but brake not applied

        // Lightweight per-level tracking for achievements
        this.levelStartTimeMs = 0;
        
        // Score history tracking
        this.scoreHistory = new ScoreHistory();
        this.levelAttempts = 0; // Counter for current level attempts
        this.isNewPersonalBest = false; // Flag for level complete screen
        this.previousBestScore = null; // For comparison display
        
        // Achievement system
        this.achievementManager = new AchievementManager();
        this.initializeAchievementSystem();
        
        // Car selection state
        this.selectedCarType = 'COMPACT'; // Default to COMPACT to prevent null scores
        this.carColor = null; // {r, g, b} for rendering
        
        // Button hover states (used by ScreenRenderer)
        this.titleButtonHover = false;
        this.historyButtonHover = false; // For "VIEW HISTORY" button on title screen
        this.achievementsButtonHover = false; // For "ACHIEVEMENTS" button on title screen
        this.historyBackButtonHover = false; // For "BACK" button on history screen
        this.achievementsBackButtonHover = false; // For "BACK" button on achievements screen
        this.levelCompleteButtonHover = false; // For "NASTĘPNY POZIOM" button
        
        // History screen state
        this.historyScrollOffset = 0;
        
        // Achievements screen state
        this.achievementsScrollOffset = 0;
        
        // UI collapse state (null = use per-screen defaults, true/false = explicit user choice)
        this.uiCollapsed = null;
        
        this.updateUI();
        this.populateLevelButtons();
    }

    updateUI() {
        const btn = document.getElementById('toggle-music-btn');
        btn.innerText = `Dźwięk: ${this.isMusicOn ? 'WŁ' : 'WYŁ'}`;
        
        // TODO: (msmet) Think if we would like to remove this feature for all cars and work just with custom accelerations
        // Initialize sport mode button based on current player's carMode
        const sportBtn = document.getElementById('toggle-sport-mode');
        if (sportBtn) {
            // If driving a truck, disable the sport toggle
            if (this.selectedCarType === 'TRUCK') {
                sportBtn.innerText = 'Tryb Sportowy: N/D';
                sportBtn.disabled = true;
                sportBtn.setAttribute('aria-disabled', 'true');
                sportBtn.classList.add('locked');
            } else {
                sportBtn.disabled = false;
                sportBtn.removeAttribute('aria-disabled');
                sportBtn.classList.remove('locked');
                const mode = (this.player && this.player.carMode === 'sport') ? 'WŁ' : 'WYŁ';
                sportBtn.innerText = `Tryb Sportowy: ${mode}`;
            }
        }
    }

    setUiCollapsed(collapsed) {
        this.uiCollapsed = collapsed;
        const uiContainer = document.getElementById('ui-container');
        if (uiContainer) {
            // Mark that user has taken control (so renderer respects this choice and not load defaults)
            uiContainer.setAttribute('data-user-controlled', 'true');
        }
    }

    populateLevelButtons() {
        const container = document.getElementById('levels-container');
        container.innerHTML = ''; // Clear old buttons
        for (let i = 0; i < this.levelCount; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            
            // Check if this level has a best score
            const bestScore = this.scoreHistory.getBestScore(i + 1);
            
            if (bestScore) {
                // Level completed - show badge with score and medal
                const scorePercent = bestScore.score.toFixed(1);
                const carTypeShort = this.getCarTypeShortName(bestScore.carType);
                const medal = this.getMedalForScore(bestScore.score);
                
                btn.innerHTML = `
                    <span class="level-number">Poziom ${i + 1}</span>
                    <span class="level-badge">${medal} ${scorePercent}% (${carTypeShort})</span>
                `;
                btn.classList.add('completed'); // Add CSS class for styling
                
                // Add medal-specific class for optional styling
                if (bestScore.score >= 85) {
                    btn.classList.add('gold');
                } else if (bestScore.score > 67) {
                    btn.classList.add('silver');
                } else if (bestScore.score >= 50) {
                    btn.classList.add('bronze');
                }
            } else {
                // Not completed yet - just level number
                btn.innerHTML = `<span class="level-number">Poziom ${i + 1}</span>`;
            }
            
            // Highlight current level
            if (i === this.currentLevelIdx) {
                btn.classList.add('active');
            }
            
            btn.onclick = () => this.loadLevel(i);
            container.appendChild(btn);
        }
    }

    toggleBackgroundMusic() {
        const music = document.getElementById('background-music');
        const btn = document.getElementById('toggle-music-btn');
        this.isMusicOn = !this.isMusicOn;
        if (this.isMusicOn) {
            music.play();
            btn.innerText = 'Dźwięk: WŁ';
        } else {
            music.pause();
            btn.innerText = 'Dźwięk: WYŁ';
        }
    }

    toggleManualBrakeRequirement() {
        this.requireManualBrakeToPark = !this.requireManualBrakeToPark;
        const btn = document.getElementById('toggle-manual-brake');
        if (btn) {
            btn.innerText = `Hamulec Ręczny Wymagany: ${this.requireManualBrakeToPark ? 'WŁ' : 'WYŁ'}`;
        }
    }

    toggleSportMode() {
        const sportBtn = document.getElementById('toggle-sport-mode');
        // Prevent toggling if truck is selected
        if (this.selectedCarType === 'TRUCK') {
            if (sportBtn) {
                sportBtn.innerText = 'Tryb Sportowy: N/D'; // No change here, just for context
                sportBtn.setAttribute('aria-disabled', 'true');
                sportBtn.classList.add('locked');
            }
            return;
        }

        // Toggle player's carMode and apply to CONFIG
        if (!this.player.carMode || this.player.carMode === 'normal') {
            this.player.carMode = 'sport';
            CONFIG.carMode = 'sport';
        } else {
            this.player.carMode = 'normal';
            CONFIG.carMode = 'normal';
        }

        if (sportBtn) {
            sportBtn.innerText = `Tryb Sportowy: ${this.player.carMode === 'sport' ? 'WŁ' : 'WYŁ'}`;
        }
    }

    /**
     * Get short name for car type (for badge display)
     * @param {string} carType - 'COMPACT', 'SPORT', 'SUV', 'TRUCK'
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

    /**
     * Get medal emoji based on score
     * @param {number} score - Parking score (0-100)
     * @returns {string} Medal emoji
     */
    getMedalForScore(score) {
        return ScoreCalculator.getMedalForScore(score);
    }

    /**
     * Select a car type and apply its configuration
     * @param {string} carType - 'COMPACT', 'SPORT', or 'SUV'
     * @returns {boolean} - true if selection successful, false if locked
     */
    selectCar(carType) {
        console.log('selectCar called with:', carType);
        const carConfig = CAR_CONFIGS[carType];
        console.log('carConfig:', carConfig);
        
        // Handle locked cars (SUV)
        if (carConfig.locked) {
            alert(carConfig.lockMessage);
            return false;
        }
        
        // Apply configuration
        this.selectedCarType = carType;
        this.carColor = carConfig.color;
        CONFIG.applyCarConfig(carConfig);
        
        // Update player car with new config and color
        this.player.carType = carType;
        this.player.setColor(carConfig.color);
        this.player.reset(this.player.x || 0, this.player.y || 0, this.player.angle || 0);
        // Ensure player's carMode follows selected car's default mode from config
        if (carConfig.performance && carConfig.performance.carMode) {
            this.player.carMode = carConfig.performance.carMode;
            CONFIG.carMode = carConfig.performance.carMode;
        }
        // Update sport-mode UI
        this.updateUI();
        
        console.log('Car selected successfully:', carType);
        return true;
    }

    /**
     * Get the currently selected car configuration
     * @returns {Object|null} - Car config object or null if none selected
     */
    getSelectedCarConfig() {
        return this.selectedCarType ? CAR_CONFIGS[this.selectedCarType] : null;
    }

    async startGame() {
        // Ensure car is selected before starting
        if (!this.selectedCarType) {
            alert('Proszę najpierw wybrać samochód!');
            return;
        }
        
        this.state = 'LOADING';
        await this.loadLevel(this.currentLevelIdx);
    }

    async loadLevel(idx) {
        if (idx >= this.levelCount) {
            alert('Gratulacje! Ukończyłeś wszystkie poziomy!');
            idx = 0;
        }
        
        // If switching to a different level, reset attempts
        if (idx !== this.currentLevelIdx) {
            this.levelAttempts = 0;
        }
        
        // Increment attempts counter for this load
        this.levelAttempts++;
        
        this.currentLevelIdx = idx;

        try {
            const levelFileName = levelFiles[idx];
            const levelModule = await import(`./levels/${levelFileName}`);
            const levelFactory = levelModule.default;
            
            const ld = levelFactory(this.canvas, {
                Pillar,
                ObstacleCar,
                NpcCar,
                ParkingZone,
                Curb
            });

            // Update button with the actual level name (preserve badge if exists)
            const btn = document.querySelector(`#levels-container .level-btn:nth-child(${idx + 1})`);
            if (btn) {
                const bestScore = this.scoreHistory.getBestScore(idx + 1);
                
                if (bestScore) {
                    // Keep the badge, just update the level name in the number span
                    const levelNumberSpan = btn.querySelector('.level-number');
                    if (levelNumberSpan) {
                        levelNumberSpan.textContent = `${idx + 1}. ${ld.name}`;
                    }
                } else {
                    // No badge yet, just set the level name
                    btn.innerHTML = `<span class="level-number">${idx + 1}. ${ld.name}</span>`;
                }
            }

            // Handle vehicle requirements (e.g., TRUCK demo level)
            if (ld.requiresVehicle === 'TRUCK') {
                // Temporarily unlock and auto-select TRUCK for demo level
                const truckConfig = CAR_CONFIGS.TRUCK;
                const wasLocked = truckConfig.locked;
                
                truckConfig.locked = false;
                this.selectCar('TRUCK');
                
                // Store that we need to re-lock after this level
                this.shouldRelockTruck = wasLocked;
            } else if (this.shouldRelockTruck) {
                // Re-lock TRUCK when leaving demo level
                CAR_CONFIGS.TRUCK.locked = true;
                this.shouldRelockTruck = false;
                
                // Auto-select default car if TRUCK was in use
                if (this.selectedCarType === 'TRUCK') {
                    this.selectCar('COMPACT');
                }
            }

            // Zatrzymaj wszystkie klaksony przed załadowaniem nowego poziomu
            if (this.currentCars) {
                this.currentCars.forEach(car => {
                    if (car.hornSound && !car.hornSound.paused) {
                        car.hornSound.pause();
                        car.hornSound.currentTime = 0;
                    }
                });
            }

            this.player.reset(ld.start.x, ld.start.y, ld.start.angle);
            this.player.game = this; // Set game reference for achievement events
            this.currentCars = ld.cars || [];
            this.currentObstacles = ld.obstacles || [];
            this.currentCurbs = ld.curbs || [];
            this.currentParkingZones = ld.parkingZones || [];
            this.level = ld; // Store current level data
            this.parkingScore = 0; // Reset parking score for new level
            
            this.state = 'RUNNING';
            // Start timer for time-based achievements
            this.levelStartTimeMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            this.shakeTimer = 0;
            this.collisionCooldown = 0; // Reset collision cooldown
            this.collisionCooldown = 0; // Reset collision cooldown
            
            document.getElementById('toggle-steering-mode').innerText = `Asystent Kierownicy: ${this.player.steeringMode === 'DRIVING' ? 'WŁ' : 'WYŁ'}`;
            document.getElementById('toggle-winter-mode').innerText = `Poślizgi Zimowe: ${this.player.winterMode ? 'WŁ' : 'WYŁ'}`;
            document.getElementById('toggle-manual-brake').innerText = `Hamulec Ręczny Wymagany: ${this.requireManualBrakeToPark ? 'WŁ' : 'WYŁ'}`;
            const sportBtn = document.getElementById('toggle-sport-mode');
            if (sportBtn) {
                if (this.selectedCarType === 'TRUCK') {
                    sportBtn.innerText = 'Tryb Sportowy: N/D';
                    sportBtn.disabled = true;
                    sportBtn.classList.add('locked');
                } else {
                    sportBtn.disabled = false;
                    sportBtn.classList.remove('locked');
                    sportBtn.innerText = `Tryb Sportowy: ${this.player.carMode === 'sport' ? 'WŁ' : 'WYŁ'}`;
                }
            }

            const levelButtons = document.querySelectorAll('#levels-container .level-btn');
            levelButtons.forEach((btn, i) => btn.classList.toggle('active', i === idx));

            const music = document.getElementById('background-music');
            if (music && this.isMusicOn) {
                music.currentTime = 0;
                const promise = music.play();
                if (promise !== undefined) {
                    promise.catch(error => {
                        console.log("Music autoplay was prevented. Click the screen to play.");
                        document.body.addEventListener('click', () => {
                            if (this.isMusicOn) music.play();
                        }, { once: true });
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to load level ${idx}:`, error);
            alert(`Nie udało się załadować poziomu ${idx + 1}.`);
        }
    }

    update() {
        // Title screen - handled by mouse events
        if (this.state === 'TITLE_SCREEN' || this.state === 'LOADING') {
            return;
        }
        
        if (this.state === 'GAMEOVER' || this.state === 'LEVEL_COMPLETE') return;
        
        if (this.shakeTimer > 0) this.shakeTimer--;
        if (this.collisionCooldown > 0) this.collisionCooldown--;

        this.player.update(this.input);

        this.currentCars.forEach(car => {
            if (typeof car.update === 'function') {
                car.update(this);
            }
        });

        const cars = this.currentCars;
        for (let i = 0; i < cars.length; i++) {
            for (let j = i + 1; j < cars.length; j++) {
                const carA = cars[i];
                const carB = cars[j];

                if (geom.checkRectCollision(carA, carB)) {
                    if (typeof carA.stop === 'function') carA.stop();
                    if (typeof carB.stop === 'function') carB.stop();
                }
            }
        }
        
        // Update UI
        const kmh = Math.abs(this.player.speed * CONFIG.kmhFactor).toFixed(0);
        document.getElementById('ui-speed').innerText = `${kmh} km/h`;
        document.getElementById('ui-steer').innerText = `${(this.player.steeringAngle * 180 / Math.PI).toFixed(0)}°`;
        document.getElementById('ui-engine').innerText = this.player.engineOn ? 'ON' : 'OFF';
        document.getElementById('ui-lights').innerText = this.player.engineOn ? 'ON' : 'OFF';

        // Wskaźnik poślizgu
        const driftIndicator = document.getElementById('ui-drift');
        if (this.player.isDrifting) {
            const driftDegrees = Math.abs(this.player.driftAngle * 180 / Math.PI).toFixed(0);
            driftIndicator.innerText = `TAK (${driftDegrees}°)`;
            driftIndicator.style.color = '#e74c3c';
        } else {
            driftIndicator.innerText = 'NIE';
            driftIndicator.style.color = '#3498db';
        }

        // Wskaźnik boost (hamulec ręczny)
        const boostIndicator = document.getElementById('ui-boost');
        const boostPercent = Math.round(this.player.handbrakeBoost * 100);
        boostIndicator.innerText = `${boostPercent}%`;
        if (boostPercent > 75) {
            boostIndicator.style.color = '#e74c3c'; // Czerwony - gotowy!
        } else if (boostPercent > 30) {
            boostIndicator.style.color = '#f39c12'; // Pomarańczowy - buduje się
        } else {
            boostIndicator.style.color = '#95a5a6'; // Szary - brak
        }

        this.checkCollisions();
        if (this.state === 'RUNNING') this.checkParking();
    }

    checkCollisions() {
        // 1. Static Pillars
        for (let p of this.currentObstacles) {
            if (geom.checkCircleRectCollision(p, this.player)) {
                this.triggerGameOver();
                return;
            }
        }

        // 2. Cars
        for (let c of this.currentCars) {
            if (geom.checkRectCollision(this.player, c)) {
                this.triggerGameOver();
                return;
            }
        }

        // 3. Curbs (Special Physics)
        for (let c of this.currentCurbs) {
            if (geom.checkRectCollision(this.player, c)) {
                if (Math.abs(this.player.speed) > CONFIG.curbSafeSpeed) {
                    // High speed -> Crash
                    this.triggerGameOver();
                } else if (this.collisionCooldown === 0) {
                    this.shakeTimer = 20 * Math.abs(this.player.speed); // Shake screen

                    // Low speed -> Bonk & Stop (only if cooldown expired)
                    this.player.speed = -this.player.speed * 0.5; // Bounce back
                    
                    // Calculate push direction from curb center to car center
                    // This ensures car is always pushed AWAY from curb, not based just on car's orientation
                    const curbCenterX = c.x + c.width / 2;
                    const curbCenterY = c.y + c.height / 2;
                    const dx = this.player.x - curbCenterX;
                    const dy = this.player.y - curbCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Normalize and push car away from curb
                    if (distance > 0) {
                        const pushDistance = 8;
                        const pushDirX = (dx / distance) * pushDistance;
                        const pushDirY = (dy / distance) * pushDistance;
                        this.player.x += pushDirX;
                        this.player.y += pushDirY;
                    }
                    
                    // Emit event for curb bonk (survived collision)
                    this.onCurbBonk?.({
                        speed: this.player.speed,
                        position: { x: this.player.x, y: this.player.y }
                    });
                    
                    this.collisionCooldown = 60; // Set cooldown (60 frames = ~1 second)
                    audio.playCurbSound();
                }
                return;
            }
        }
    }

    /**
     * Calculate parking score based on industry-standard metrics:
     * - Lateral centering (50% weight) - Most critical for door opening
     * - Longitudinal centering (20% weight) - Space efficiency
     * - Angular alignment (20% weight) - Parallel parking accuracy
     * - Margin from edges (10% weight) - Safety buffer
     * @param {Object} zone - The parking zone object
     * @returns {number} - Score from 0-100
     */
    calculateParkingScore(zone) {
        return ScoreCalculator.calculateParkingScore(this.player, zone);
    }

   checkParking() {
        // Car must be moving very slowly to be considered parked.
        if (Math.abs(this.player.speed) > 0.1) {
            this.showParkingHint = false;
            return;
        }

        for (let zone of this.currentParkingZones) {
            const carCorners = geom.getCorners(this.player.x, this.player.y, this.player.w, this.player.l, this.player.angle);
            const allCornersIn = carCorners.every(corner => geom.isPointInRotatedRect(corner, zone));

            if (allCornersIn) {
                // Check if reverse parking is required for this zone
                if (zone.parkingType === 'reverse') {
                    const zoneAngle = zone.angle || 0;
                    // Calculate normalized angle difference in range [-PI, PI]
                    const angleDiff = Math.atan2(Math.sin(this.player.angle - zoneAngle), Math.cos(this.player.angle - zoneAngle));
                    
                    // Check if the car is facing the opposite direction (diff is close to PI or -PI)
                    // Tolerance of ~23 degrees (0.4 radians)
                    if (Math.abs(angleDiff) > Math.PI - 0.4) {
                        // Check if manual brake is required
                        if (this.requireManualBrakeToPark && !this.input.keys['Space']) {
                            this.showParkingHint = true;
                            return;
                        }
                        // Calculate parking score before completing level
                        this.showParkingHint = false;
                        this.parkingScore = this.calculateParkingScore(zone);
                        this.triggerLevelComplete();
                        return;
                    }
                } else {
                    // Normal parking - check brake requirement
                    if (this.requireManualBrakeToPark && !this.input.keys['Space']) {
                        this.showParkingHint = true;
                        return;
                    }
                    // Calculate score before completing
                    this.showParkingHint = false;
                    this.parkingScore = this.calculateParkingScore(zone);
                    this.triggerLevelComplete();
                    return;
                }
            }
        }
        
        // Not in any parking zone
        this.showParkingHint = false;
    }

    triggerGameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.bonkPos = { x: this.player.x, y: this.player.y };
        audio.playBonkSound();

        const levelNumber = this.currentLevelIdx + 1;
        // Emit event for achievement system (we no longer track pre-completion crash counts here)
        this.onCrash?.({
            position: { x: this.player.x, y: this.player.y },
            levelNumber
        });
        
        const music = document.getElementById('background-music');
        if (music) music.pause();

        setTimeout(() => {
            this.loadLevel(this.currentLevelIdx);
        }, 2000);
    }

    triggerLevelComplete() {
        if (this.state !== 'RUNNING') return;
        this.state = 'LEVEL_COMPLETE';
        audio.playLevelCompleteSound();
        
        // Initialize level complete animation
        this.levelCompleteTime = 0;
        this.levelCompleteButtonHover = false;

        // Get previous best score before saving (for comparison)
        const levelNumber = this.currentLevelIdx + 1; // Convert 0-indexed to 1-indexed
        const previousBest = this.scoreHistory.getBestScore(levelNumber);
        const isFirstCompletion = !previousBest;
        
        // Save score to history
        const levelName = this.level?.name || `Poziom ${levelNumber}`;
        const isNewBest = this.scoreHistory.recordScore(
            levelNumber,
            this.parkingScore,
            this.selectedCarType,
            this.levelAttempts,
            levelName
        );
        
        // Store flags and data for display in level complete screen
        this.isNewPersonalBest = isNewBest;
        this.previousBestScore = previousBest ? previousBest.score : null;
        
        // Emit event for achievement system
        const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const elapsedSeconds = this.levelStartTimeMs ? (nowMs - this.levelStartTimeMs) / 1000 : null;
        this.onLevelComplete?.({
            levelNumber,
            levelName,
            levelType: this.level?.type || null,
            score: this.parkingScore,
            carType: this.selectedCarType,
            attempts: this.levelAttempts,
            isNewBest,
            isFirstCompletion,
            elapsedSeconds,
            handbrakeHeldAtCompletion: !!this.input.keys['Space']
        });
        
        // Reset attempts counter for next level
        this.levelAttempts = 0;
        
        // Refresh level buttons to show new best score
        this.populateLevelButtons();

        const music = document.getElementById('background-music');
        if (music) music.pause();
    }

    /**
     * Main draw method - delegates to GameRenderer
     */
    draw() {
        // Create game state snapshot for rendering
        const gameState = {
            state: this.state,
            screenShake: this.shakeTimer,
            environmentType: this.level?.type,
            entities: {
                parkingZones: this.currentParkingZones,
                curbs: this.currentCurbs,
                obstacles: this.currentObstacles,
                npcCars: this.currentCars,
                player: this.player
            },
            effects: {
                showParkingHint: this.showParkingHint && this.requireManualBrakeToPark,
                bonkPosition: this.bonkPos,
                time: Date.now()
            },
            ui: {
                title: {
                    hoverPlay: this.titleButtonHover,
                    hoverHistory: this.historyButtonHover,
                    hoverAchievements: this.achievementsButtonHover
                },
                levelComplete: {
                    score: this.parkingScore,
                    medal: this.getMedalForScore(this.parkingScore),
                    personalBest: this.previousBestScore,
                    isNewBest: this.isNewPersonalBest,
                    hoverNext: this.levelCompleteButtonHover
                },
                history: {
                    levels: this.getLevelsForHistory(),
                    completionRate: this.calculateCompletionRate(),
                    completionCount: this.getCompletionCount(),
                    avgScore: this.calculateAverageScore(),
                    scrollOffset: this.historyScrollOffset,
                    hoverBack: this.historyBackButtonHover
                },
                achievements: {
                    achievements: this.achievementManager.getAllAchievements(),
                    achievementStats: this.achievementManager.getStats(),
                    achievementsScrollOffset: this.achievementsScrollOffset,
                    hoverAchievementsBack: this.achievementsBackButtonHover
                }
            },
            uiCollapsed: this.uiCollapsed
        };

        // Delegate to renderer
        this.renderer.draw(gameState);
        
        // Update button bounds from renderer (for click detection)
        this.updateButtonBounds();
    }

    /**
     * Update button bounds from renderer for click detection
     */
    updateButtonBounds() {
        if (this.state === 'TITLE_SCREEN') {
            const bounds = this.renderer.getTitleButtonBounds();
            this.titleButtonBounds = bounds.playButton;
            this.historyButtonBounds = bounds.historyButton;
            this.achievementsButtonBounds = bounds.achievementsButton;
        } else if (this.state === 'LEVEL_COMPLETE') {
            const bounds = this.renderer.getLevelCompleteButtonBounds();
            this.levelCompleteButtonBounds = bounds.nextButton;
        } else if (this.state === 'HISTORY_SCREEN') {
            const bounds = this.renderer.getHistoryButtonBounds();
            this.historyBackButtonBounds = bounds.backButton;
        } else if (this.state === 'ACHIEVEMENTS_SCREEN') {
            const bounds = this.renderer.getAchievementsButtonBounds();
            this.achievementsBackButtonBounds = bounds.backButton;
        }
    }

    /**
     * Get levels data for history screen
     */
    getLevelsForHistory() {
        return levelFiles.map((levelFile, index) => {
            const levelNumber = index + 1;
            const bestScore = this.scoreHistory.getBestScore(levelNumber);
            return {
                levelNumber: levelNumber,
                name: levelFile.name || `Poziom ${levelNumber}`,
                bestScore: bestScore ? {
                    score: bestScore.score,
                    medal: this.getMedalForScore(bestScore.score),
                    carType: bestScore.carType,
                    attempts: bestScore.attempts
                } : null
            };
        });
    }

    /**
     * Calculate completion rate (levels with any score)
     */
    calculateCompletionRate() {
        let completed = 0;
        for (let i = 1; i <= this.levelCount; i++) {
            if (this.scoreHistory.getBestScore(i)) {
                completed++;
            }
        }
        return Math.round((completed / this.levelCount) * 100);
    }

    /**
     * Get completion count (completed/total)
     */
    getCompletionCount() {
        let completed = 0;
        for (let i = 1; i <= this.levelCount; i++) {
            if (this.scoreHistory.getBestScore(i)) {
                completed++;
            }
        }
        return { completed, total: this.levelCount };
    }

    /**
     * Calculate average score across all completed levels
     */
    calculateAverageScore() {
        let totalScore = 0;
        let count = 0;
        for (let i = 1; i <= this.levelCount; i++) {
            const best = this.scoreHistory.getBestScore(i);
            if (best) {
                totalScore += best.score;
                count++;
            }
        }
        return count > 0 ? totalScore / count : 0;
    }

    /**
     * Initialize achievement system and wire event callbacks
     */
    initializeAchievementSystem() {
        // Subscribe to achievement unlock events
        this.achievementManager.subscribe((achievement) => {
            // Show toast notification when achievement is unlocked
            this.renderer.toastRenderer.show(achievement);
            
            if (window.DEBUG_ACHIEVEMENTS) {
                console.log('🏆 Achievement unlocked:', achievement.title);
            }
        });

        // Populate completed levels from score history
        const completedLevels = [];
        for (let i = 1; i <= this.levelCount; i++) {
            if (this.scoreHistory.getBestScore(i)) {
                completedLevels.push(i);
            }
        }
        this.achievementManager.setCompletedLevels(completedLevels);

        // Wire event callbacks
        this.onLevelComplete = (data) => {
            this.achievementManager.onLevelComplete(data);
        };

        this.onCrash = (data) => {
            this.achievementManager.onCrash(data);
        };

        this.onCurbBonk = (data) => {
            this.achievementManager.onCurbBonk(data);
        };

        this.onSpeedRecord = (data) => {
            this.achievementManager.onSpeedRecord(data);
        };

        this.onBoostFull = (data) => {
            this.achievementManager.onBoostFull(data);
        };
    }

    // Note: All drawing methods (drawLotEnvironment, drawStreetEnvironment, etc.)
    // have been extracted to EnvironmentRenderer, ScreenRenderer, EffectsRenderer
    // and are now accessed via GameRenderer
}
