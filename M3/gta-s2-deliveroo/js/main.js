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
window.game = game; // expose for debugging/console access

// Wire up UI button event listeners
document.getElementById('toggle-steering-mode').addEventListener('click', () => {
  game.player.toggleSteeringMode();
});

document.getElementById('toggle-winter-mode').addEventListener('click', () => {
  game.player.toggleWinterMode();
});

document.getElementById('toggle-music-btn').addEventListener('click', () => {
  game.toggleBackgroundMusic();
});

// Handle mouse events for title screen button
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  if (game.state === 'TITLE_SCREEN' && game.titleButtonBounds) {
    const bounds = game.titleButtonBounds;
    game.titleButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                            mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
  }
  
  if (game.state === 'LEVEL_COMPLETE' && game.levelCompleteButtonBounds) {
    const bounds = game.levelCompleteButtonBounds;
    game.levelCompleteButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                                     mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
  }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  if (game.state === 'TITLE_SCREEN' && game.titleButtonBounds) {
    const bounds = game.titleButtonBounds;
    if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
        mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
      game.startGame();
    }
  }
  
  if (game.state === 'LEVEL_COMPLETE' && game.levelCompleteButtonBounds) {
    const bounds = game.levelCompleteButtonBounds;
    if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
        mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
      loadNextLevel();
    }
  }
});

function loadNextLevel() {
  const nextLevel = game.currentLevelIdx + 1;
  if (nextLevel < game.levels.length) {
    game.loadLevel(nextLevel);
  } else {
    alert('Gratulacje! Ukończyłeś wszystkie poziomy!');
    game.loadLevel(0);
  }
}

function loop() {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

function resize() {
  resizeCanvas();
  if (game.state === 'RUNNING') {
    game.loadLevel(game.currentLevelIdx);
  }
}

window.addEventListener('resize', resize);
