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

export default 
class Game {
    constructor(canvas, ctx, input) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.input = input;
        
        this.shakeTimer = 0;
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
        
        // Car selection state
        this.selectedCarType = null; // 'COMPACT', 'SPORT', 'SUV', 'TRUCK
        this.carColor = null; // {r, g, b} for rendering
        
        // Title screen animation
        this.titleTime = 0;
        this.titlePressVisible = true;
        this.titleBlinkTimer = 0;
        this.titleButtonHover = false;
        
        this.updateUI();
        this.populateLevelButtons();
    }

    updateUI() {
        const btn = document.getElementById('toggle-music-btn');
        btn.innerText = `Dźwięk: ${this.isMusicOn ? 'WŁ' : 'WYŁ'}`;
    }

    populateLevelButtons() {
        const container = document.getElementById('levels-container');
        container.innerHTML = ''; // Clear old buttons
        for (let i = 0; i < this.levelCount; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.innerText = `Poziom ${i + 1}`; // Levels now will be hidden until loaded
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

            // Update button text with the actual level name
            const btn = document.querySelector(`#levels-container .level-btn:nth-child(${idx + 1})`);
            if (btn) {
                btn.innerText = `${idx + 1}. ${ld.name}`;
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
            this.currentCars = ld.cars || [];
            this.currentObstacles = ld.obstacles || [];
            this.currentCurbs = ld.curbs || [];
            this.currentParkingZones = ld.parkingZones || [];
            this.level = ld; // Store current level data
            
            this.state = 'RUNNING';
            this.shakeTimer = 0;
            
            document.getElementById('toggle-steering-mode').innerText = `Asystent Kierownicy: ${this.player.steeringMode === 'DRIVING' ? 'WŁ' : 'WYŁ'}`;
            document.getElementById('toggle-winter-mode').innerText = `Poślizgi Zimowe: ${this.player.winterMode ? 'WŁ' : 'WYŁ'}`;

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
                } else {
                    // Low speed -> Bonk & Stop
                    this.player.speed = -this.player.speed * 0.5; // Bounce back
                    this.shakeTimer = 10; // Shake screen
                    audio.playCurbSound();
                }
                return;
            }
        }
    }

    checkParking() {
        // Car must be moving very slowly to be considered parked.
        if (Math.abs(this.player.speed) > 0.1) return;

        for (let zone of this.currentParkingZones) {
            // 1. Check if all 4 corners of the car are inside the parking zone
            const carCorners = geom.getCorners(this.player.x, this.player.y, this.player.w, this.player.l, this.player.angle);
            let allCornersIn = true;
            for (const corner of carCorners) {
                if (!geom.isPointInRotatedRect(corner, zone)) {
                    allCornersIn = false;
                    break;
                }
            }

            if (allCornersIn) {
                this.triggerLevelComplete();
                return;
            }
        }
    }

    triggerGameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.bonkPos = { x: this.player.x, y: this.player.y };
        audio.playBonkSound();
        
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

        const music = document.getElementById('background-music');
        if (music) music.pause();
    }

    draw() {
        this.ctx.save();
        
        // Screen Shake Effect
        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * 10;
            const dy = (Math.random() - 0.5) * 10;
            this.ctx.translate(dx, dy);
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Title Screen
        if (this.state === 'TITLE_SCREEN') {
            this.drawTitleScreen();
            this.ctx.restore();
            return;
        }

        // Loading overlay: don't attempt to read this.level while it's being fetched
        if (this.state === 'LOADING') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '22px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Ładowanie poziomu...', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.restore();
            return;
        }

        // Level Complete Screen
        if (this.state === 'LEVEL_COMPLETE') {
            this.drawLevelCompleteScreen();
            this.ctx.restore();
            return;
        }

        // Hide car selection panel during gameplay
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'none';

        // Environment - guard against missing this.level
        const levelType = (this.level && this.level.type) ? this.level.type : 'street';
        if (levelType === 'lot') {
            this.drawLotEnvironment();
        } else if (levelType === 'street_crossing') {
            this.drawStreetCrossingEnvironment();
        } else if (levelType === 'highway') {
            this.drawHighwayEnvironment();
        } else {
            this.drawStreetEnvironment();
        }

        // Parking Zones
        this.currentParkingZones.forEach(z => z.draw(this.ctx));

        // Curbs
        this.currentCurbs.forEach(c => c.draw(this.ctx));

        // Entities
        this.currentObstacles.forEach(o => o.draw(this.ctx));
        this.currentCars.forEach(c => c.draw(this.ctx));

        // Rysuj ślady opon przed samochodem gracza
        this.player.drawSkidMarks(this.ctx);
        this.player.draw(this.ctx);

        // Bonk
        if (this.state === 'GAMEOVER') {
            this.drawBonk();
        }
        
        this.ctx.restore();
    }

    
    // V1 Style Drawing
    drawLotEnvironment() {
        const spotWidth = 70;
        const spotDepth = 120;
        const startX = 220;
        const startY = 200; // Top row

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 4;
        
        // Top Row
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(startX + spotWidth * 6, startY);
        for(let i=0; i<=6; i++) {
            this.ctx.moveTo(startX + i * spotWidth, startY);
            this.ctx.lineTo(startX + i * spotWidth, startY + spotDepth);
        }
        this.ctx.stroke();

        // Bottom Row
        const startY2 = 400;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY2 + spotDepth);
        this.ctx.lineTo(startX + spotWidth * 6, startY2 + spotDepth);
        for(let i=0; i<=6; i++) {
            this.ctx.moveTo(startX + i * spotWidth, startY2);
            this.ctx.lineTo(startX + i * spotWidth, startY2 + spotDepth);
        }
        this.ctx.stroke();
        
        // "PARKING" Text
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.ctx.font = "bold 80px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("PARKING", this.canvas.width/2, 130);
        this.ctx.restore();
    }

    drawStreetEnvironment() {
        const roadY = this.canvas.height/2;
        // Asphalt
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // Full asphalt base
        
        // Center Line
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([20, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, roadY);
        this.ctx.lineTo(this.canvas.width, roadY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
    }

    drawStreetCrossingEnvironment() {
        const roadY = this.canvas.height / 2;
        const roadX = this.canvas.width / 2;
        const intersectionHalfSize = 120;

        // Asphalt
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Center Lines
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([20, 20]);

        // Horizontal
        this.ctx.beginPath();
        this.ctx.moveTo(0, roadY);
        this.ctx.lineTo(roadX - intersectionHalfSize, roadY);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(roadX + intersectionHalfSize, roadY);
        this.ctx.lineTo(this.canvas.width, roadY);
        this.ctx.stroke();

        // Vertical
        this.ctx.beginPath();
        this.ctx.moveTo(roadX, 0);
        this.ctx.lineTo(roadX, roadY - intersectionHalfSize);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(roadX, roadY + intersectionHalfSize);
        this.ctx.lineTo(roadX, this.canvas.height);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
    }

    drawHighwayEnvironment() {
        const laneHeight = 85; // Wysokość jednego pasa
        const grassHeight = 160; // Wysokość pasa zieleni
        const topLanesY = this.canvas.height / 2 - grassHeight / 2 - laneHeight * 2;

        // Asphalt - full background
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // === GÓRNE 2 PASY (→→→) ===
        const lane1Y = topLanesY + laneHeight * 0.5;
        const lane2Y = topLanesY + laneHeight * 1.5;

        // Linia oddzielająca pasy (przerywana biała)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([30, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, topLanesY + laneHeight);
        this.ctx.lineTo(this.canvas.width, topLanesY + laneHeight);
        this.ctx.stroke();

        // === PAS ZIELENI (środek) ===
        const grassY = topLanesY + laneHeight * 2;

        // Rysuj trawę (użyj tekstury lub kolor zielony)
        this.ctx.fillStyle = '#4a7c3a'; // Ciemnozielony base
        this.ctx.fillRect(0, grassY, this.canvas.width, grassHeight);

        // Dodaj teksturę trawy (jeśli załadowana)
        const grassImg = new Image();
        grassImg.src = 'grass-textures.jpg';
        if (grassImg.complete) {
            const pattern = this.ctx.createPattern(grassImg, 'repeat');
            if (pattern) {
                this.ctx.fillStyle = pattern;
                this.ctx.fillRect(0, grassY, this.canvas.width, grassHeight);
            }
        }

        // === DOLNE 2 PASY (←←←) ===
        const bottomLanesY = grassY + grassHeight;
        const lane3Y = bottomLanesY + laneHeight * 0.5;
        const lane4Y = bottomLanesY + laneHeight * 1.5;

        // Linia oddzielająca pasy (przerywana biała)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([30, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, bottomLanesY + laneHeight);
        this.ctx.lineTo(this.canvas.width, bottomLanesY + laneHeight);
        this.ctx.stroke();

        // === LINIE KRAWĘDZIOWE (ciągłe białe) ===
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;

        // Górna krawędź autostrady
        this.ctx.beginPath();
        this.ctx.moveTo(0, topLanesY);
        this.ctx.lineTo(this.canvas.width, topLanesY);
        this.ctx.stroke();

        // Dolna krawędź autostrady
        this.ctx.beginPath();
        this.ctx.moveTo(0, bottomLanesY + laneHeight * 2);
        this.ctx.lineTo(this.canvas.width, bottomLanesY + laneHeight * 2);
        this.ctx.stroke();

        // Krawędzie pasa zieleni
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, grassY);
        this.ctx.lineTo(this.canvas.width, grassY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, grassY + grassHeight);
        this.ctx.lineTo(this.canvas.width, grassY + grassHeight);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
        this.ctx.font = "bold 60px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("S2 (OBWODNICA WARSZAFKI)", this.canvas.width/2, 50);
        this.ctx.restore();
    }

    drawTitleScreen() {
        // 90s Style Title Screen
        this.titleTime += 0.016; // ~60fps
        
        // Animated gradient background (cyan-magenta-blue)
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const offset1 = Math.sin(this.titleTime * 0.5) * 0.5 + 0.5;
        const offset2 = Math.cos(this.titleTime * 0.3) * 0.5 + 0.5;
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
            const x = ((i * 137.5 + this.titleTime * 50) % this.canvas.width);
            const y = (i * 47.3) % this.canvas.height;
            const size = Math.sin(this.titleTime + i) * 2 + 3;
            this.ctx.fillStyle = `rgba(255, 255, 0, ${Math.sin(this.titleTime * 2 + i) * 0.3 + 0.7})`;
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
        const buttonY = this.canvas.height - 150;
        
        // Store button bounds for click detection
        this.titleButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Animated button (pulsing effect)
        const pulse = Math.sin(this.titleTime * 3) * 0.1 + 1;
        
        // Button shadow (3D effect)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(buttonX + 5, buttonY + 5, buttonWidth, buttonHeight);
        
        // Button background with gradient
        const btnGrad = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        if (this.titleButtonHover) {
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
        this.ctx.fillStyle = this.titleButtonHover ? '#000' : '#fff';
        this.ctx.fillText('PLAY THE GAME', 0, 0);
        
        this.ctx.restore();
        
        // Copyright/credits
        this.ctx.font = '12px Arial, sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillText('© 1993 WARSZAFKA STUDIOS', this.canvas.width / 2, this.canvas.height - 30);
        
        // Show car selection panel on title screen
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'block';
    }

    drawLevelCompleteScreen() {
        // Hide car selection panel during level complete
        const carPanel = document.getElementById('car-selection-panel');
        if (carPanel) carPanel.style.display = 'none';
        
        // 90s Style Level Complete Screen
        this.levelCompleteTime += 0.016;
        
        // Animated gradient background (different colors - celebration!)
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const offset1 = Math.sin(this.levelCompleteTime * 0.7) * 0.5 + 0.5;
        const offset2 = Math.cos(this.levelCompleteTime * 0.5) * 0.5 + 0.5;
        grad.addColorStop(0, `rgb(${Math.floor(offset1 * 200 + 55)}, ${Math.floor(offset2 * 100)}, ${Math.floor(offset1 * 100 + 100)})`);
        grad.addColorStop(0.5, `rgb(${Math.floor(offset2 * 100 + 150)}, ${Math.floor(offset1 * 200)}, 100)`);
        grad.addColorStop(1, `rgb(100, ${Math.floor(offset2 * 100 + 150)}, ${Math.floor(offset1 * 200 + 55)})`);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Celebratory stars everywhere!
        for (let i = 0; i < 50; i++) {
            const x = ((i * 137.5 + this.levelCompleteTime * 80) % this.canvas.width);
            const y = ((i * 83.7 + this.levelCompleteTime * 60) % this.canvas.height);
            const size = Math.sin(this.levelCompleteTime * 3 + i) * 2 + 3;
            const colors = ['#ffff00', '#ff00ff', '#00ffff', '#ff0000', '#00ff00'];
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Star shape for some
            if (i % 3 === 0) {
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(this.levelCompleteTime + i);
                this.ctx.fillStyle = '#ffffff';
                for (let j = 0; j < 5; j++) {
                    this.ctx.rotate(Math.PI * 2 / 5);
                    this.ctx.lineTo(0, -size * 2);
                    this.ctx.rotate(Math.PI / 5);
                    this.ctx.lineTo(0, -size);
                }
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        
        // "GRATULACJE!" title with bouncing effect
        const centerY = this.canvas.height / 2 - 100;
        const bounce = Math.sin(this.levelCompleteTime * 4) * 10;
        
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
        
        // "Poziom ukończony!" subtitle
        this.ctx.font = 'bold 32px Arial, sans-serif';
        const subtitleY = centerY + 70;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillText('Poziom ukończony!', this.canvas.width / 2 + 2, subtitleY + 2);
        
        // Subtitle with pulsing color
        const pulseColor = Math.sin(this.levelCompleteTime * 5) * 127 + 128;
        this.ctx.fillStyle = `rgb(${pulseColor}, 255, ${255 - pulseColor})`;
        this.ctx.fillText('Poziom ukończony!', this.canvas.width / 2, subtitleY);
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('Poziom ukończony!', this.canvas.width / 2, subtitleY);
        
        // "NASTĘPNY POZIOM" Button (90s style)
        const buttonWidth = 320;
        const buttonHeight = 70;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height - 150;
        
        // Store button bounds for click detection
        this.levelCompleteButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Animated button (pulsing effect)
        const pulse = Math.sin(this.levelCompleteTime * 3) * 0.1 + 1;
        
        // Button shadow (3D effect)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(buttonX + 6, buttonY + 6, buttonWidth, buttonHeight);
        
        // Button background with gradient
        const btnGrad = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        if (this.levelCompleteButtonHover) {
            btnGrad.addColorStop(0, '#00ff00');
            btnGrad.addColorStop(1, '#ffff00');
        } else {
            btnGrad.addColorStop(0, '#ffff00');
            btnGrad.addColorStop(1, '#ff00ff');
        }
        this.ctx.fillStyle = btnGrad;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Inner border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(buttonX + 5, buttonY + 5, buttonWidth - 10, buttonHeight - 10);
        
        // Button text
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, buttonY + buttonHeight / 2);
        this.ctx.scale(pulse, pulse);
        
        // Text shadow
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 28px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('NASTĘPNY POZIOM', 2, 2);
        
        // Text
        this.ctx.fillStyle = this.levelCompleteButtonHover ? '#000' : '#fff';
        this.ctx.fillText('NASTĘPNY POZIOM', 0, 0);
        
        this.ctx.restore();
    }

    drawBonk() {
        this.ctx.save();
        this.ctx.translate(this.bonkPos.x, this.bonkPos.y);
        
        // Comic Flash (Star)
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        for(let i=0; i<16; i++) {
            const angle = (Math.PI*2/16) * i;
            const r = (i%2===0) ? 70 : 45; 
            this.ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Text "BONK!"
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 4;
        this.ctx.font = "bold 28px Verdana";
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.strokeText("BONK!", 0, 0);
        this.ctx.fillText("BONK!", 0, 0);
        
        this.ctx.restore();
    }
}
