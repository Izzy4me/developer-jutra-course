/**
 * PlayerCar - Simplified placeholder
 * TODO: Replace with full implementation from index.html (lines 844-1468)
 * This is a minimal working version for module testing
 */
import { CONFIG } from './config.js';
import * as geom from './utils/geom.js';
import * as audio from './utils/audio.js';

export default class PlayerCar {
  constructor(x = 100, y = 100, angleDeg = 0, color = '#0a84ff') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angleDeg * (Math.PI / 180);
    this.w = CONFIG.carWidth || 44;
    this.l = CONFIG.carLength || 90;
    this.color = color;
    this.steeringMode = 'DRIVING';
    this.winterMode = false;
    this.speed = 0;
    this.engineOn = true;
  }

  reset(x = 100, y = 100, angleDeg = 0) {
    this.x = x;
    this.y = y;
    this.angle = angleDeg * (Math.PI / 180);
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
  }

  update(input, dt = 1) {
    if (!this.engineOn) return;
    
    // Use correct input interface: input.keys.ArrowUp instead of input.isDown('ArrowUp')
    const forward = input.keys.ArrowUp;
    const back = input.keys.ArrowDown;
    const left = input.keys.ArrowLeft;
    const right = input.keys.ArrowRight;

    let accel = 0;
    if (forward) accel = 0.1;
    if (back) accel = -0.05;

    const thrust = accel;
    this.vx += Math.cos(this.angle) * thrust;
    this.vy += Math.sin(this.angle) * thrust;

    if (left) this.angle -= 0.03 * dt;
    if (right) this.angle += 0.03 * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // simplistic damping
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.l / 2, -this.w / 2, this.l, this.w);
    
    // Simple headlights
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(this.l / 2 - 4, -this.w / 2 + 4, 4, 8);
    ctx.fillRect(this.l / 2 - 4, this.w / 2 - 12, 4, 8);
    
    ctx.restore();
  }

  toggleSteeringMode() {
    this.steeringMode = this.steeringMode === 'DRIVING' ? 'PARKING' : 'DRIVING';
    const btn = document.getElementById('toggle-steering-mode');
    if (btn) btn.innerText = `Asystent Kierownicy: ${this.steeringMode === 'DRIVING' ? 'WŁ' : 'WYŁ'}`;
  }

  toggleWinterMode() {
    this.winterMode = !this.winterMode;
    const btn = document.getElementById('toggle-winter-mode');
    if (btn) btn.innerText = `Poślizgi Zimowe: ${this.winterMode ? 'WŁ' : 'WYŁ'}`;
  }
}
