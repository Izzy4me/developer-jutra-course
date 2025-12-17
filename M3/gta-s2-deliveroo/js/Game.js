import PlayerCar from './PlayerCar.js';
import { NpcCar } from './NpcCar.js';
import { ObstacleCar } from './ObstacleCar.js';
import { Pillar } from './Pillar.js';
import { ParkingZone } from './ParkingZone.js';
import { Curb } from './Curb.js';
import * as geom from './utils/geom.js';
import { CONFIG } from './config.js';

export default class Game {
  constructor(canvas, ctx, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.player = new PlayerCar(200, 200);
    this.currentCars = [];
    this.curbs = [];
    this.parkingZones = [];
    this.pillars = [];
    this.lastTime = performance.now();
  }

  loadLevel(levelIndex = 0) {
    // create sample obstacles to preserve original behavior
    this.currentCars = [
      new ObstacleCar({ x: 300, y: 200, angle: 0 }),
      new NpcCar({ x: 400, y: 300, angle: 0, speed: -2 })
    ];
    this.curbs = [new Curb(0, this.canvas.height - 50, this.canvas.width, 50)];
    this.parkingZones = [new ParkingZone({ x: 150, y: 150, w: 80, l: 160, angle: 0 })];
    this.pillars = [new Pillar(500, 200)];
  }

  update(dt) {
    this.player.update(this.input, dt);
    for (const c of this.currentCars) {
      if (typeof c.update === 'function') c.update(this);
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const curb of this.curbs) curb.draw(ctx);
    for (const p of this.parkingZones) p.draw(ctx);
    for (const pillar of this.pillars) pillar.draw(ctx);
    for (const c of this.currentCars) c.draw(ctx);
    this.player.draw(ctx);
  }
}
