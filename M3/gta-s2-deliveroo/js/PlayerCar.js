/**
 * PlayerCar - Full implementation
 * Extracted from index.html (lines 844-1468)
 */
import { CONFIG } from './config.js';
import * as geom from './utils/geom.js';
import * as audio from './utils/audio.js';

export default class PlayerCar {
    constructor(x, y, angleDeg, color = null, carType = 'COMPACT') {
        this.color = color || { r: 52, g: 152, b: 219 }; // Default blue
        this.carType = carType;
        this.reset(x, y, angleDeg);
    }

    reset(x, y, angleDeg) {
        this.x = x;
        this.y = y;
        this.angle = angleDeg * (Math.PI / 180);
        this.speed = 0;

        // Wektor prędkości dla zaawansowanej fizyki
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0; // Prędkość rotacji

        this.steeringAngle = 0;
        this.w = CONFIG.carWidth;
        this.l = CONFIG.carLength;
        this.engineOn = true;
        this.enterKeyProcessed = false;
        this.steeringMode = 'DRIVING';

        // Tryb zimowy - domyślnie wyłączony (bezpieczna jazda)
        if (this.winterMode === undefined) {
            this.winterMode = false;
        }

        // Stan poślizgu
        this.isDrifting = false;
        this.driftAngle = 0; // Kąt poślizgu
        this.skidMarks = []; // Ślady opon

        // Hamulec ręczny - startowanie
        this.handbrakeBoost = 0; // Zgromadzona moc (0-1)
        this.previousSpaceKey = false; // Czy w poprzedniej klatce trzymał SPACE
        
        // Stan wejścia dla rysowania świateł
        this.isBraking = false;
    }

    toggleSteeringMode() {
        if (this.steeringMode === 'DRIVING') {
            this.steeringMode = 'PARKING';
            document.getElementById('toggle-steering-mode').innerText = 'Asystent Kierownicy: WYŁ';
        } else {
            this.steeringMode = 'DRIVING';
            document.getElementById('toggle-steering-mode').innerText = 'Asystent Kierownicy: WŁ';
        }
    }

    toggleWinterMode() {
        this.winterMode = !this.winterMode;
        const btn = document.getElementById('toggle-winter-mode');
        if (this.winterMode) {
            btn.innerText = 'Poślizgi Zimowe: WŁ';
        } else {
            btn.innerText = 'Poślizgi Zimowe: WYŁ';
            // Wyczyść ślady opon przy wyłączeniu trybu zimowego
            this.skidMarks = [];
            this.isDrifting = false;
            // Zatrzymaj dźwięk poślizgu
            if (audio.driftOscillator) {
                audio.stopDriftSound();
            }
        }
    }

    /**
     * Set the car color
     * @param {Object} color - Color object with r, g, b properties
     */
    setColor(color) {
        this.color = color;
    }

    update(input) {
        // Engine toggle
        if (input.keys.Enter) {
            if (!this.enterKeyProcessed) {
                this.engineOn = !this.engineOn;
                this.enterKeyProcessed = true;
            }
        } else {
            this.enterKeyProcessed = false;
        }

        // Wybierz fizykę w zależności od trybu
        if (this.winterMode) {
            this.updateWinterPhysics(input);
        } else {
            this.updateSimplePhysics(input);
        }
    }

    // === PROSTA FIZYKA (bezpieczna, przewidywalna) ===
    updateSimplePhysics(input) {
        // === HAMULEC RĘCZNY - STARTOWANIE ===
        const isHandbraking = input.keys.Space;
        const isThrottling = input.keys.ArrowUp || input.keys.ArrowDown;
        
        // Zapisz stan hamowania dla rysowania
        const isReversing = this.speed < -0.1;
        this.isBraking = input.keys.Space || (this.speed > 0 && input.keys.ArrowDown) || (this.speed < 0 && input.keys.ArrowUp) || isReversing;

        // Budowanie boost gdy trzyma hamulec + gaz
        if (isHandbraking && isThrottling && this.engineOn) {
            this.handbrakeBoost = Math.min(CONFIG.handbrakeBoostMax, this.handbrakeBoost + CONFIG.handbrakeBoostRate);

            // Hamuj auto podczas budowania boost
            this.speed *= 0.8; // Mocne hamowanie
            if (Math.abs(this.speed) < 0.5) this.speed = 0;

            // Dźwięk silnika na wysokich obrotach
            if (!audio.engineRevOscillator) {
                audio.startEngineRevSound(this.handbrakeBoost);
            } else {
                audio.updateEngineRevSound(this.handbrakeBoost);
            }
        }
        // Jeśli puścił hamulec (ale dalej trzyma gaz) - LAUNCH!
        else if (!isHandbraking && this.previousSpaceKey && isThrottling && this.handbrakeBoost > 0.1) {
            // MOCNY START!
            const boostDirection = input.keys.ArrowUp ? 1 : -1;
            this.speed += boostDirection * this.handbrakeBoost * CONFIG.handbrakeBoostMultiplier;
            this.handbrakeBoost = 0; // Zużyte!

            // Zatrzymaj dźwięk silnika
            if (audio.engineRevOscillator) {
                audio.stopEngineRevSound();
            }
        }
        // Normalne zmniejszanie boost gdy nie używany
        else if (this.handbrakeBoost > 0) {
            this.handbrakeBoost = Math.max(0, this.handbrakeBoost - CONFIG.handbrakeBoostDecay);

            // Zatrzymaj dźwięk gdy boost spada
            if (this.handbrakeBoost < 0.1 && audio.engineRevOscillator) {
                audio.stopEngineRevSound();
            }
        }

        this.previousSpaceKey = isHandbraking;

        // === NORMALNA FIZYKA ===
        if (this.engineOn) {
            // 1. Acceleration (tylko jeśli NIE buduje boost)
            if (!(isHandbraking && isThrottling)) {
                if (input.keys.ArrowUp) this.speed += CONFIG.acceleration;
                else if (input.keys.ArrowDown) this.speed -= CONFIG.acceleration;
            }

            // 2. Braking (tylko jeśli NIE trzyma gazu równocześnie)
            if (input.keys.Space && !isThrottling) {
                if (this.speed > 0) this.speed -= CONFIG.brakingForce;
                else if (this.speed < 0) this.speed += CONFIG.brakingForce;
                if (Math.abs(this.speed) < 0.5) this.speed = 0;
            }
        }

        // 3. Friction
        if (!input.keys.ArrowUp && !input.keys.ArrowDown && !input.keys.Space) {
            this.speed *= (1 - CONFIG.friction);
            if (Math.abs(this.speed) < 0.05) this.speed = 0;
        }
        if (!this.engineOn) {
            this.speed *= (1 - CONFIG.friction);
            if (Math.abs(this.speed) < 0.05) this.speed = 0;
        }

        // Limits
        if (this.speed > CONFIG.maxSpeed) this.speed = CONFIG.maxSpeed;
        if (this.speed < CONFIG.maxReverseSpeed) this.speed = CONFIG.maxReverseSpeed;

        // 4. Steering
        if (this.engineOn) {
            if (input.keys.ArrowLeft) {
                this.steeringAngle -= CONFIG.steerSpeed;
            } else if (input.keys.ArrowRight) {
                this.steeringAngle += CONFIG.steerSpeed;
            } else {
                if (this.steeringMode === 'DRIVING') {
                    // Auto-straighten in Driving Mode
                    if (this.steeringAngle > 0) {
                        this.steeringAngle -= CONFIG.steerRestoringDriving;
                        if (this.steeringAngle < 0) this.steeringAngle = 0;
                    } else if (this.steeringAngle < 0) {
                        this.steeringAngle += CONFIG.steerRestoringDriving;
                        if (this.steeringAngle > 0) this.steeringAngle = 0;
                    }
                }
            }
        }

        // Clamp steer
        if (this.steeringAngle > CONFIG.maxSteerAngle) this.steeringAngle = CONFIG.maxSteerAngle;
        if (this.steeringAngle < -CONFIG.maxSteerAngle) this.steeringAngle = -CONFIG.maxSteerAngle;

        // 5. Movement - prosty model kinematyczny
        if (Math.abs(this.speed) > 0.05) {
            const L = CONFIG.wheelBase;
            const oldAngle = this.angle;

            this.angle += (this.speed / L) * Math.tan(this.steeringAngle);

            const rearAxleX = this.x - (L / 2) * Math.cos(oldAngle);
            const rearAxleY = this.y - (L / 2) * Math.sin(oldAngle);

            const newRearAxleX = rearAxleX + this.speed * Math.cos(oldAngle);
            const newRearAxleY = rearAxleY + this.speed * Math.sin(oldAngle);

            this.x = newRearAxleX + (L / 2) * Math.cos(this.angle);
            this.y = newRearAxleY + (L / 2) * Math.sin(this.angle);
        } else {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }

        // Synchronizuj velocityX/Y dla kompatybilności
        this.velocityX = Math.cos(this.angle) * this.speed;
        this.velocityY = Math.sin(this.angle) * this.speed;
        this.angularVelocity = 0;
        this.isDrifting = false;
        this.driftAngle = 0;
    }

    // === ZAAWANSOWANA FIZYKA Z POŚLIZGAMI (tryb zimowy) ===
    updateWinterPhysics(input) {
        // === HAMULEC RĘCZNY - STARTOWANIE ===
        const isHandbraking = input.keys.Space;
        const isThrottling = input.keys.ArrowUp || input.keys.ArrowDown;
        
        // Zapisz stan hamowania dla rysowania
        const isReversing = this.speed < -0.1;
        this.isBraking = input.keys.Space || (this.speed > 0 && input.keys.ArrowDown) || (this.speed < 0 && input.keys.ArrowUp) || isReversing;

        // Budowanie boost gdy trzyma hamulec + gaz
        if (isHandbraking && isThrottling && this.engineOn) {
            this.handbrakeBoost = Math.min(CONFIG.handbrakeBoostMax, this.handbrakeBoost + CONFIG.handbrakeBoostRate);

            // Hamuj auto podczas budowania boost
            this.velocityX *= 0.75;
            this.velocityY *= 0.75;
            const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            if (currentSpeed < 0.5) {
                this.velocityX = 0;
                this.velocityY = 0;
            }

            // Dźwięk silnika na wysokich obrotach
            if (!audio.engineRevOscillator) {
                audio.startEngineRevSound(this.handbrakeBoost);
            } else {
                audio.updateEngineRevSound(this.handbrakeBoost);
            }
        }
        // Jeśli puścił hamulec (ale dalej trzyma gaz) - LAUNCH!
        else if (!isHandbraking && this.previousSpaceKey && isThrottling && this.handbrakeBoost > 0.1) {
            // MOCNY START!
            const boostDirection = input.keys.ArrowUp ? 1 : -1;
            const boostPower = boostDirection * this.handbrakeBoost * CONFIG.handbrakeBoostMultiplier;

            // Dodaj boost w kierunku samochodu
            this.velocityX += Math.cos(this.angle) * boostPower;
            this.velocityY += Math.sin(this.angle) * boostPower;

            this.handbrakeBoost = 0; // Zużyte!

            // Zatrzymaj dźwięk silnika
            if (audio.engineRevOscillator) {
                audio.stopEngineRevSound();
            }
        }
        // Normalne zmniejszanie boost gdy nie używany
        else if (this.handbrakeBoost > 0) {
            this.handbrakeBoost = Math.max(0, this.handbrakeBoost - CONFIG.handbrakeBoostDecay);

            // Zatrzymaj dźwięk gdy boost spada
            if (this.handbrakeBoost < 0.1 && audio.engineRevOscillator) {
                audio.stopEngineRevSound();
            }
        }

        this.previousSpaceKey = isHandbraking;

        // 1. Sterowanie - kąt skrętu
        if (this.engineOn) {
            if (input.keys.ArrowLeft) {
                this.steeringAngle -= CONFIG.steerSpeed;
            } else if (input.keys.ArrowRight) {
                this.steeringAngle += CONFIG.steerSpeed;
            } else {
                if (this.steeringMode === 'DRIVING') {
                    // Auto-prostowanie w trybie jazdy
                    if (this.steeringAngle > 0) {
                        this.steeringAngle -= CONFIG.steerRestoringDriving;
                        if (this.steeringAngle < 0) this.steeringAngle = 0;
                    } else if (this.steeringAngle < 0) {
                        this.steeringAngle += CONFIG.steerRestoringDriving;
                        if (this.steeringAngle > 0) this.steeringAngle = 0;
                    }
                }
            }
        }

        // Ogranicz kąt skrętu - zawsze maksymalny, niezależnie od prędkości
        // Fizyka zadba o poślizg przy dużych prędkościach!
        this.steeringAngle = Math.max(-CONFIG.maxSteerAngle, Math.min(CONFIG.maxSteerAngle, this.steeringAngle));

        // 2. Akceleracja i hamowanie
        const isBraking = input.keys.Space && !isThrottling; // Hamowanie tylko bez gazu
        let throttle = 0;

        // Akceleracja tylko jeśli NIE buduje boost (hamulec + gaz)
        if (this.engineOn && !(isHandbraking && isThrottling)) {
            if (input.keys.ArrowUp) throttle = CONFIG.acceleration;
            else if (input.keys.ArrowDown) throttle = -CONFIG.acceleration;
        }

        // 3. Oblicz prędkość w lokalnym układzie samochodu (forward/lateral)
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        // Prędkość w kierunku "do przodu" i "na boki" względem auta
        const forwardVelocity = this.velocityX * cos + this.velocityY * sin;
        const lateralVelocity = -this.velocityX * sin + this.velocityY * cos;

        // 4. Zastosuj akcelerację do przodu
        let newForwardVelocity = forwardVelocity + throttle;

        // 5. Oblicz siłę boczną z powodu skrętu kół
        // FIZYKA: Siła odśrodkowa F = m*v²/r, więc rośnie KWADRATOWO z prędkością!
        const baseLateralVelocity = newForwardVelocity * Math.tan(this.steeringAngle);

        // Dodatkowy mnożnik dla dużych prędkości (symuluje v² efekt)
        const speedMagnitude = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const speedSquaredFactor = 1.0 + (speedMagnitude / CONFIG.maxSpeed) * CONFIG.lateralForceMultiplier;

        const desiredLateralVelocity = baseLateralVelocity * speedSquaredFactor;

        // 6. Określ przyczepność opon (grip)
        let currentGrip = isBraking ? CONFIG.tireGripBraking : CONFIG.tireGrip;

        // 7. Sprawdź warunek poślizgu
        const lateralChange = desiredLateralVelocity - lateralVelocity;

        // Jeśli zmiana prędkości bocznej jest zbyt duża = poślizg!
        const lateralAcceleration = Math.abs(lateralChange);

        // Przyczepność rośnie tylko liniowo z prędkością (nie kwadratowo!)
        // To sprawia że przy dużych prędkościach łatwo przekroczyć limit
        const maxGrip = currentGrip * Math.abs(newForwardVelocity);

        if (lateralAcceleration > maxGrip && speedMagnitude > CONFIG.driftThreshold) {
            // POŚLIZG!
            this.isDrifting = true;

            // Ograniczona zmiana prędkości bocznej - opony nie nadążają
            const actualLateralChange = Math.sign(lateralChange) * maxGrip;
            const newLateralVelocity = lateralVelocity + actualLateralChange;

            // Kąt poślizgu
            this.driftAngle = Math.atan2(newLateralVelocity, newForwardVelocity);

            // Podczas poślizgu - wolniejsza rotacja
            this.angularVelocity = (newForwardVelocity / CONFIG.wheelBase) * Math.tan(this.steeringAngle) * currentGrip;

            // Zastosuj tarcie podczas poślizgu
            newForwardVelocity *= CONFIG.driftFriction;

            // Konwersja z powrotem do współrzędnych globalnych
            this.velocityX = newForwardVelocity * cos - newLateralVelocity * sin;
            this.velocityY = newForwardVelocity * sin + newLateralVelocity * cos;

            // Dodaj ślad opon podczas poślizgu
            if (Math.abs(this.driftAngle) > 0.15) { // Minimum kąt dla śladów
                this.addSkidMark();
            }

            // Dźwięk piszczących opon - intensywność zależy od kąta poślizgu
            const driftIntensity = Math.min(1.0, Math.abs(this.driftAngle) / 0.5);
            if (!audio.driftOscillator) {
                audio.startDriftSound(driftIntensity);
            } else {
                audio.updateDriftSound(driftIntensity);
            }
        } else {
            // Normalna jazda - pełna przyczepność
            this.isDrifting = false;
            this.driftAngle = 0;

            const newLateralVelocity = desiredLateralVelocity;

            // Normalna rotacja
            this.angularVelocity = (newForwardVelocity / CONFIG.wheelBase) * Math.tan(this.steeringAngle);

            // Konwersja z powrotem do współrzędnych globalnych
            this.velocityX = newForwardVelocity * cos - newLateralVelocity * sin;
            this.velocityY = newForwardVelocity * sin + newLateralVelocity * cos;

            // Zatrzymaj dźwięk poślizgu
            if (audio.driftOscillator) {
                audio.stopDriftSound();
            }
        }

        // 8. Hamowanie
        if (isBraking) {
            const brakingDeceleration = CONFIG.brakingForce;
            const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);

            if (currentSpeed > 0.1) {
                const brakeMultiplier = Math.max(0, (currentSpeed - brakingDeceleration) / currentSpeed);
                this.velocityX *= brakeMultiplier;
                this.velocityY *= brakeMultiplier;
            } else {
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }

        // 9. Tarcie naturalne
        if (!input.keys.ArrowUp && !input.keys.ArrowDown && !isBraking) {
            this.velocityX *= (1 - CONFIG.friction);
            this.velocityY *= (1 - CONFIG.friction);
        }

        if (!this.engineOn) {
            this.velocityX *= (1 - CONFIG.friction);
            this.velocityY *= (1 - CONFIG.friction);
        }

        // Zatrzymaj jeśli bardzo wolno
        const finalSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (finalSpeed < 0.05) {
            this.velocityX = 0;
            this.velocityY = 0;
            this.angularVelocity = 0;
        }

        // 10. Ogranicz maksymalną prędkość
        if (finalSpeed > CONFIG.maxSpeed) {
            const ratio = CONFIG.maxSpeed / finalSpeed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }

        // 11. Aktualizuj rotację
        this.angle += this.angularVelocity;
        this.angularVelocity *= CONFIG.angularDamping;

        // 12. Aktualizuj pozycję
        this.x += this.velocityX;
        this.y += this.velocityY;

        // 13. Aktualizuj zmienną speed dla kompatybilności
        this.speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY) *
                     Math.sign(Math.cos(this.angle) * this.velocityX + Math.sin(this.angle) * this.velocityY);

        // 14. Zarządzaj śladami opon (max 200 punktów)
        if (this.skidMarks.length > 200) {
            this.skidMarks.shift();
        }
    }

    addSkidMark() {
        // Dodaj ślad pod tylnymi kołami
        const rearAxleOffset = -CONFIG.wheelBase / 2;
        const wheelOffset = CONFIG.carWidth / 3;

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        // Lewe tylne koło
        const leftX = this.x + (rearAxleOffset * cos - wheelOffset * sin);
        const leftY = this.y + (rearAxleOffset * sin + wheelOffset * cos);

        // Prawe tylne koło
        const rightX = this.x + (rearAxleOffset * cos + wheelOffset * sin);
        const rightY = this.y + (rearAxleOffset * sin - wheelOffset * cos);

        this.skidMarks.push({ x: leftX, y: leftY, angle: this.angle, alpha: 1.0 });
        this.skidMarks.push({ x: rightX, y: rightY, angle: this.angle, alpha: 1.0 });
    }

    drawSkidMarks(ctx) {
        // Rysuj ślady opon
        ctx.save();
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.7)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (let i = 1; i < this.skidMarks.length; i++) {
            const prev = this.skidMarks[i - 1];
            const curr = this.skidMarks[i];

            // Zanikaj starsze ślady
            const fadeIndex = Math.max(0, this.skidMarks.length - 150);
            const alpha = i < fadeIndex ? 0.3 : 0.7;

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Symmetrical positions for wheels and lights
        const wheelCenterY = 15;
        const wheelTopY_L = -wheelCenterY - CONFIG.wheelWidth / 2;
        const wheelTopY_R = wheelCenterY - CONFIG.wheelWidth / 2;

        const headlightCenterY = 12;
        const headlightHeight = 10;
        const headlightTopY_L = -headlightCenterY - headlightHeight / 2;
        const headlightTopY_R = headlightCenterY - headlightHeight / 2;


        // Draw Projection (Trajectory)
        // Draw faintly where the car is going
        if (this.engineOn && Math.abs(this.steeringAngle) > 0.05) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            
            const steer = this.steeringAngle;
            const wx = CONFIG.wheelBase/2;
            
            // Left Wheel projection
            let wy_L = -wheelCenterY;
            ctx.moveTo(wx, wy_L);
            ctx.lineTo(wx + Math.cos(steer)*100, wy_L + Math.sin(steer)*100);
            
            // Right Wheel projection
            let wy_R = wheelCenterY;
            ctx.moveTo(wx, wy_R);
            ctx.lineTo(wx + Math.cos(steer)*100, wy_R + Math.sin(steer)*100);
            
            ctx.stroke();
            ctx.restore();
        }

        // --- WHEELS ---
        ctx.fillStyle = '#222';
        // Rear
        this.drawWheel(ctx, -CONFIG.wheelBase/2, wheelTopY_L, 0);
        this.drawWheel(ctx, -CONFIG.wheelBase/2, wheelTopY_R, 0);
        // Front
        this.drawWheel(ctx, CONFIG.wheelBase/2, wheelTopY_L, this.steeringAngle);
        this.drawWheel(ctx, CONFIG.wheelBase/2, wheelTopY_R, this.steeringAngle);

        // --- BODY ---
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.beginPath();
        ctx.roundRect(-CONFIG.carLength/2, -CONFIG.carWidth/2, CONFIG.carLength, CONFIG.carWidth, 6);
        ctx.fill();
        // Darker outline
        const outlineR = Math.max(0, this.color.r - 30);
        const outlineG = Math.max(0, this.color.g - 30);
        const outlineB = Math.max(0, this.color.b - 30);
        ctx.strokeStyle = `rgb(${outlineR}, ${outlineG}, ${outlineB})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- ROOF & SPECIAL FEATURES ---
        let roofColor = { r: 0, g: 0, b: 0 };
        if (this.carType === 'SUV') {
            // SUV: Darker back part, no separate roof
            const backR = Math.max(0, this.color.r - 50);
            const backG = Math.max(0, this.color.g - 50);
            const backB = Math.max(0, this.color.b - 50);
            roofColor = { r: backR, g: backG, b: backB };
            ctx.fillStyle = `rgb(${backR}, ${backG}, ${backB})`;
            ctx.beginPath();
            ctx.roundRect(-CONFIG.carLength/2, -CONFIG.carWidth/2, CONFIG.carLength/2.5, CONFIG.carWidth, [0, 6, 6, 0]);
            ctx.fill();

            // Windows for SUV
            ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
            ctx.fillRect(-CONFIG.carLength/2 + 8, -CONFIG.carWidth/2 + 6, CONFIG.carLength - 16, CONFIG.carWidth - 12);

        } else if (this.carType === 'TRUCK') {
            // TRUCK: Separate cab (front) and storage box (back)
            // Cab - smaller front section
            const cabLength = CONFIG.carLength / 3;
            ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
            ctx.beginPath();
            ctx.roundRect(CONFIG.carLength/2 - cabLength, -CONFIG.carWidth/2, cabLength, CONFIG.carWidth, [6, 0, 0, 6]);
            ctx.fill();

            // Storage box - larger back section
            const storageR = Math.max(0, this.color.r - 80); // Darker than cab
            const storageG = Math.max(0, this.color.g - 80);
            const storageB = Math.max(0, this.color.b - 80);
            roofColor = { r: storageR, g: storageG, b: storageB };
            ctx.fillStyle = `rgb(${storageR}, ${storageG}, ${storageB})`;
            ctx.beginPath();
            ctx.roundRect(-CONFIG.carLength/2, -CONFIG.carWidth/2, CONFIG.carLength - cabLength, CONFIG.carWidth, [0, 6, 6, 0]);
            ctx.fill();

            // Windows for truck cab
            ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
            ctx.fillRect(CONFIG.carLength/2 - cabLength + 4, -CONFIG.carWidth/2 + 6, cabLength - 8, CONFIG.carWidth - 12);

        } else {
            // Standard Car: Lighter roof
            const roofR = Math.min(255, this.color.r + 80);
            const roofG = Math.min(255, this.color.g + 80);
            const roofB = Math.min(255, this.color.b + 80);
            roofColor = { r: roofR, g: roofG, b: roofB };
            ctx.fillStyle = `rgb(${roofR}, ${roofG}, ${roofB})`;
            ctx.beginPath();
            ctx.roundRect(-CONFIG.carLength/4, -CONFIG.carWidth/2 + 6, CONFIG.carLength/2, CONFIG.carWidth - 12, 3);
            ctx.fill();
        }

        // Calculate text color based on roof brightness
        const luminance = (0.299 * roofColor.r + 0.587 * roofColor.g + 0.114 * roofColor.b) / 255;
        const textColor = luminance < 0.5 ? '#FFFFFF' : '#000000';
        
        // Windshield indication (Front)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(CONFIG.carLength/4, -CONFIG.carWidth/2 + 7, 5, CONFIG.carWidth - 14);

        if (this.engineOn) {
            // Lights
            // Use stored braking state from update
            
            // Brake Lights (also light up when reversing)
            ctx.fillStyle = this.isBraking ? '#ff0000' : '#8b0000';
            if(this.isBraking) { ctx.shadowColor = '#f00'; ctx.shadowBlur = 15; }
            ctx.beginPath();
            ctx.rect(-CONFIG.carLength/2, headlightTopY_L, 3, headlightHeight);
            ctx.rect(-CONFIG.carLength/2, headlightTopY_R, 3, headlightHeight);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Headlights (Beams always on if engine is on)
            ctx.fillStyle = '#f1c40f';
            { // Removed if (this.speed > 0.5)
                 ctx.save();
                 ctx.globalCompositeOperation = 'screen';
                 ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
                 const beamLength = 150;
                 const beamSpread = 60;
                 ctx.beginPath();
                 ctx.moveTo(CONFIG.carLength/2, headlightTopY_L + headlightHeight/2);
                 ctx.lineTo(CONFIG.carLength/2 + beamLength, (headlightTopY_L + headlightHeight/2) - beamSpread);
                 ctx.lineTo(CONFIG.carLength/2 + beamLength, (headlightTopY_R + headlightHeight/2) + beamSpread);
                 ctx.lineTo(CONFIG.carLength/2, headlightTopY_R + headlightHeight/2);
                 ctx.fill();
                 ctx.restore();
                 ctx.fillStyle = '#fff'; // Bright core
            }
            ctx.beginPath();
            ctx.rect(CONFIG.carLength/2 - 2, headlightTopY_L, 2, headlightHeight);
            ctx.rect(CONFIG.carLength/2 - 2, headlightTopY_R, 2, headlightHeight);
            ctx.fill();
        }

        // --- DELIVEROO TEXT ON ROOF ---
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw text along the roof (from back to front)
        ctx.fillText('DELIVEROO', 0, 0);
        ctx.restore();

        ctx.restore();
    }

    drawWheel(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        // Tire tread
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-CONFIG.wheelLength/2, 0, CONFIG.wheelLength, CONFIG.wheelWidth);
        // Rim highlight
        ctx.fillStyle = '#555';
        ctx.fillRect(-2, 2, 4, 6);
        ctx.restore();
    }
}
