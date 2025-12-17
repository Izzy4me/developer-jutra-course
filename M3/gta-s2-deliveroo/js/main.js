import Game from './Game.js';
import { InputHandler } from './InputHandler.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = Math.max(800, window.innerWidth - 40);
  canvas.height = Math.max(600, window.innerHeight - 160);
}

resizeCanvas();

const input = new InputHandler();
const game = new Game(canvas, ctx, input);
window.game = game; // expose for existing inline handlers

game.loadLevel(0);

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 16.6667; // roughly frames
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener('resize', () => {
  resizeCanvas();
  game.loadLevel(0);
});
