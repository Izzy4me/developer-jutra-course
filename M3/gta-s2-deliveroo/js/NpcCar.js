import ObstacleCar from './ObstacleCar.js';
import geom from './utils/geom.js';
import audio from './utils/audio.js';

export default class NpcCar extends ObstacleCar {
  constructor(x, y, w = 30, h = 50, angle = 0, color = '#707070') {
    super(x, y, w, h, angle, color);
    this.speed = 0;
    this.maxSpeed = 2;
    this.state = 'idle';
  }

  update(dt) {
    // basic movement logic — keep original behavior
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }

  canSpawn() {
    return !this.dead;
  }

  stop() {
    this.speed = 0;
  }
}
