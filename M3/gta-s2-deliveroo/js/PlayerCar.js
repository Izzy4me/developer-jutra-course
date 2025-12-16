import { CONFIG } from './config.js';
import geom from './utils/geom.js';
import audio from './utils/audio.js';

export default class PlayerCar {
  constructor(x = 100, y = 100, angle = 0, color = '#0a84ff') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angle;
    this.w = 30;
    this.h = 50;
    this.color = color;
    this.steeringSimple = true;
    this.winterMode = false;
  }

  reset(x = 100, y = 100, angle = 0) {
    this.x = x; this.y = y; this.angle = angle; this.vx = 0; this.vy = 0;
  }

  update(input, dt) {
    // preserve original physics logic; this is a compacted version
    const forward = input.isDown('ArrowUp') || input.isDown('w');
    const back = input.isDown('ArrowDown') || input.isDown('s');
    const left = input.isDown('ArrowLeft') || input.isDown('a');
    const right = input.isDown('ArrowRight') || input.isDown('d');

    let accel = 0;
    if (forward) accel = 0.1;
    if (back) accel = -0.05;

    const thrust = accel;
    this.vx += Math.cos(this.angle) * thrust;
    this.vy += Math.sin(this.angle) * thrust;

    if (left) this.angle -= 0.03;
    if (right) this.angle += 0.03;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // simplistic damping
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }

  toggleSteeringMode() {
    this.steeringSimple = !this.steeringSimple;
  }

  toggleWinterMode() {
    this.winterMode = !this.winterMode;
  }
}
