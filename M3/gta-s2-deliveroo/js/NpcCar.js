/**
 * NpcCar - Moving non-player car with AI
 * Handles autonomous vehicle behavior, collision avoidance, and spawn management
 */
import { ObstacleCar } from './ObstacleCar.js';
import { checkRectCollision } from './utils/geom.js';

export class NpcCar extends ObstacleCar {
    constructor(props) {
        super(props);
        this.originalSpeed = props.speed || -2;
        this.speed = this.originalSpeed;
        this.isStopped = false;
        this.kind = props.kind;

        // Dźwięk klaksonu dla tego samochodu
        this.hornSound = new Audio('horn.wav');
        this.hornSound.loop = true;
        this.hornSound.volume = 0.4;

        // Deadlock prevention
        this.stuckTimer = 0;
        this.stuckThreshold = 60; // ~1 sekunda przy 60 FPS - agresywniejsze!

        // Spawn queue system
        this.isWaitingToSpawn = false;
        this.spawnX = 0; // Pozycja gdzie samochód czeka na spawn
        this.minSpawnDistance = 200; // Minimalna odległość do najbliższego samochodu
        
        // Canvas reference will be passed during update
        this.canvas = null;
    }

    stop() {
        this.speed = 0;
        this.isStopped = true;

        // Zatrzymaj klakson gdy samochód się zatrzymuje
        if (this.hornSound && !this.hornSound.paused) {
            this.hornSound.pause();
            this.hornSound.currentTime = 0;
        }
    }

    update(game) {
        // Store canvas reference from game for wraparound logic
        this.canvas = game.canvas || (typeof canvas !== 'undefined' ? canvas : null);
        
        // === SPAWN QUEUE SYSTEM ===
        if (this.isWaitingToSpawn) {
            // Sprawdź czy jest wolna przestrzeń do spawnu
            if (this.canSpawn(game)) {
                // Spawn samochód
                this.x = this.spawnX;
                this.isWaitingToSpawn = false;
                this.speed = this.originalSpeed;
            } else {
                // Czekaj na wolne miejsce
                return;
            }
        }

        // === DEADLOCK PREVENTION - Sprawdź czy stuck nawet gdy isStopped ===
        if (this.isStopped) {
            this.stuckTimer++;

            // Jeśli stuck zbyt długo - ODBLOKUJ!
            if (this.stuckTimer > this.stuckThreshold) {
                // console.log(`🔓 NPC UNLOCKING: was stuck for ${this.stuckTimer} frames`);

                // Odblokuj samochód
                this.isStopped = false;

                // Przywróć prędkość
                this.speed = this.originalSpeed;

                // Resetuj timer
                this.stuckTimer = 0;

                // Zatrzymaj klakson
                if (this.hornSound && !this.hornSound.paused) {
                    this.hornSound.pause();
                    this.hornSound.currentTime = 0;
                }
            }
            return;
        }

        // === Normalny update fizyki ===
        const oldX = this.x;
        const oldY = this.y;

        const isAggressive = this.kind === 'aggressive';
        const sensorLength = isAggressive ? 80 : 150;
        const acceleration = isAggressive ? 0.3 : 0.1;
        const brakingFactor = isAggressive ? 0.90 : 0.95;

        const sensorX = this.x + Math.cos(this.angle) * (this.l / 2 + sensorLength / 2);
        const sensorY = this.y + Math.sin(this.angle) * (this.l / 2 + sensorLength / 2);

        const sensor = {
            x: sensorX,
            y: sensorY,
            w: this.w - 10,
            l: sensorLength,
            angle: this.angle
        };

        let obstacleAhead = false;
        let playerAhead = false;

        if (checkRectCollision(sensor, game.player)) {
            obstacleAhead = true;
            playerAhead = true;
        } else {
            for (const otherCar of game.currentCars) {
                if (this === otherCar) continue;
                if (checkRectCollision(sensor, otherCar)) {
                    obstacleAhead = true;
                    break;
                }
            }
        }

        // Kontroluj odtwarzanie klaksonu - graj tak długo jak gracz blokuje
        if (playerAhead) {
            if (this.hornSound.paused) {
                this.hornSound.play().catch(e => console.log('Horn play prevented:', e));
            }
        } else {
            if (!this.hornSound.paused) {
                this.hornSound.pause();
                this.hornSound.currentTime = 0;
            }
        }

        if (obstacleAhead) {
            this.speed *= brakingFactor;
            if (Math.abs(this.speed) < 0.1) this.speed = 0;
        } else {
            if (Math.abs(this.speed) < Math.abs(this.originalSpeed)) {
                this.speed += Math.sign(this.originalSpeed) * acceleration;
            } else {
                this.speed = this.originalSpeed;
            }
        }

        this.x += this.speed;

        // === WRAPAROUND Z KOLEJKOWANIEM ===
        if (this.canvas) {
            if (this.speed > 0 && this.x > this.canvas.width + this.l) {
                // Jadący w prawo wychodzi za prawą krawędź - czeka na lewo
                this.isWaitingToSpawn = true;
                this.spawnX = -this.l;
                this.x = -this.l - 500; // Ukryj poza ekranem
                this.speed = 0;
            } else if (this.speed < 0 && this.x < -this.l) {
                // Jadący w lewo wychodzi za lewą krawędź - czeka na prawo
                this.isWaitingToSpawn = true;
                this.spawnX = this.canvas.width + this.l;
                this.x = this.canvas.width + this.l + 500; // Ukryj poza ekranem
                this.speed = 0;
            }
        }

        // Resetuj stuck timer gdy samochód się normalnie porusza
        this.stuckTimer = 0;
    }

    canSpawn(game) {
        // Sprawdź czy jest wystarczająco dużo miejsca do spawnu
        const spawnThreshold = this.minSpawnDistance;

        for (const otherCar of game.currentCars) {
            if (this === otherCar) continue;
            
            // Sprawdź tylko samochody w tym samym pasie (podobna pozycja Y)
            const sameY = Math.abs(otherCar.y - this.y) < 50;
            if (!sameY) continue;

            // Sprawdź czy samochód nie jest w trakcie spawnu
            if (otherCar instanceof NpcCar && otherCar.isWaitingToSpawn) continue;

            // Oblicz odległość w kierunku ruchu
            let distance;
            if (this.originalSpeed > 0) {
                // Spawnimy po lewej (-this.l), sprawdź odległość do samochodów przed nami
                distance = otherCar.x - this.spawnX;
            } else {
                // Spawnimy po prawej (canvas.width + this.l), sprawdź odległość do samochodów przed nami
                distance = this.spawnX - otherCar.x;
            }

            // Jeśli jakiś samochód jest zbyt blisko, nie spawnuj
            if (distance >= 0 && distance < spawnThreshold) {
                return false;
            }
        }

        return true;
    }

    draw(ctx) {
        // Nie rysuj samochodów czekających na spawn
        if (this.isWaitingToSpawn) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-this.l/2 + 5, -this.w/2 + 5, this.l, this.w);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.l/2, -this.w/2, this.l, this.w, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'rgba(180, 200, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(this.l/2 - 10, -this.w/2 + 5);
        ctx.lineTo(this.l/2 - 10, this.w/2 - 5);
        ctx.lineTo(this.l/2 - 25, this.w/2 - 8);
        ctx.lineTo(this.l/2 - 25, -this.w/2 + 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-this.l/2 + 10, -this.w/2 + 5);
        ctx.lineTo(-this.l/2 + 10, this.w/2 - 5);
        ctx.lineTo(-this.l/2 + 20, this.w/2 - 8);
        ctx.lineTo(-this.l/2 + 20, -this.w/2 + 8);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
        const beamLength = 150;
        const beamSpread = 60;
        const headlightHeight = 8;
        const headlightY1 = -this.w/2 + 4 + headlightHeight/2;
        const headlightY2 = this.w/2 - 12 + headlightHeight/2;

        ctx.beginPath();
        ctx.moveTo(this.l/2, headlightY1);
        ctx.lineTo(this.l/2 + beamLength, headlightY1 - beamSpread);
        ctx.lineTo(this.l/2 + beamLength, headlightY2 + beamSpread);
        ctx.lineTo(this.l/2, headlightY2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = '#ff0';
        ctx.shadowBlur = 15;
        ctx.fillRect(this.l/2 - 4, -this.w/2 + 4, 4, 8);
        ctx.fillRect(this.l/2 - 4, this.w/2 - 12, 4, 8);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-this.l/2, -this.w/2 + 4, 2, 8);
        ctx.fillRect(-this.l/2, this.w/2 - 12, 2, 8);

        ctx.restore();
    }
}
