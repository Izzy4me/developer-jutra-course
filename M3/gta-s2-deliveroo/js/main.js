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

// Sport mode toggle - delegate to game to handle truck exclusion
document.getElementById('toggle-sport-mode').addEventListener('click', () => {
  game.toggleSportMode();
});

document.getElementById('toggle-music-btn').addEventListener('click', () => {
  game.toggleBackgroundMusic();
});


document.getElementById('toggle-manual-brake').addEventListener('click', () => {
  game.toggleManualBrakeRequirement();
});


// Car selection buttons
const carButtons = document.querySelectorAll('.car-btn');
console.log('Found car buttons:', carButtons.length);
carButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    console.log('Car button clicked:', btn.getAttribute('data-car-type'));
    const carType = btn.getAttribute('data-car-type');
    const success = game.selectCar(carType);
    
    console.log('Selection success:', success);
    if (success) {
      // Update visual selection state
      document.querySelectorAll('.car-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      
      // Update info text
      const carConfig = game.getSelectedCarConfig();
      document.getElementById('car-selection-info').innerText = 
        `Wybrany pojazd: ${carConfig.displayName}`;
    }
  });
});

// Handle mouse events for title screen button
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  // Scale mouse coordinates to match internal canvas coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  if (game.state === 'TITLE_SCREEN') {
    // Check PLAY button
    if (game.titleButtonBounds) {
      const bounds = game.titleButtonBounds;
      game.titleButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                              mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
    }
    // Check VIEW HISTORY button
    if (game.historyButtonBounds) {
      const bounds = game.historyButtonBounds;
      game.historyButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                                mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
    }
    // Check ACHIEVEMENTS button
    if (game.achievementsButtonBounds) {
      const bounds = game.achievementsButtonBounds;
      game.achievementsButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                                     mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
    }
  }
  
  if (game.state === 'HISTORY_SCREEN' && game.historyBackButtonBounds) {
    const bounds = game.historyBackButtonBounds;
    game.historyBackButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                                  mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
  }
  
  if (game.state === 'ACHIEVEMENTS_SCREEN' && game.achievementsBackButtonBounds) {
    const bounds = game.achievementsBackButtonBounds;
    game.achievementsBackButtonHover = mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
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
  // Scale mouse coordinates to match internal canvas coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  if (game.state === 'TITLE_SCREEN') {
    // Check PLAY button
    if (game.titleButtonBounds) {
      const bounds = game.titleButtonBounds;
      if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
          mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
        game.startGame();
        return;
      }
    }
    // Check HISTORY button
    if (game.historyButtonBounds) {
      const bounds = game.historyButtonBounds;
      if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
          mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
        game.state = 'HISTORY_SCREEN';
        game.historyScrollOffset = 0;
        game.historyTime = 0;
        return;
      }
    }
    // Check ACHIEVEMENTS button
    if (game.achievementsButtonBounds) {
      const bounds = game.achievementsButtonBounds;
      if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
          mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
        game.state = 'ACHIEVEMENTS_SCREEN';
        game.achievementsScrollOffset = 0;
        return;
      }
    }
  }
  
  if (game.state === 'HISTORY_SCREEN' && game.historyBackButtonBounds) {
    const bounds = game.historyBackButtonBounds;
    if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
        mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
      game.state = 'TITLE_SCREEN';
      game.historyBackButtonHover = false;
      return;
    }
  }
  
  if (game.state === 'ACHIEVEMENTS_SCREEN' && game.achievementsBackButtonBounds) {
    const bounds = game.achievementsBackButtonBounds;
    if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
        mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
      game.state = 'TITLE_SCREEN';
      game.achievementsBackButtonHover = false;
      return;
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

// Mouse wheel scrolling for history screen
canvas.addEventListener('wheel', (e) => {
  if (game.state === 'HISTORY_SCREEN') {
    e.preventDefault();
    
    // Scroll speed
    const scrollSpeed = 30;
    game.historyScrollOffset += e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    
    // Get scroll bounds from renderer for consistency
    const levels = game.getLevelsForHistory();
    const { maxScroll } = game.renderer.screenRenderer.getHistoryScrollBounds(levels);
    
    // Clamp scroll offset (0 = top, maxScroll = bottom)
    game.historyScrollOffset = Math.max(0, Math.min(maxScroll, game.historyScrollOffset));
  }
  
  if (game.state === 'ACHIEVEMENTS_SCREEN') {
    e.preventDefault();
    
    // Scroll speed
    const scrollSpeed = 30;
    game.achievementsScrollOffset += e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    
    // Calculate max scroll (total content height - visible height)
    const achievementHeight = 110; // 100 + 10 padding
    const achievements = game.achievementManager.getAllAchievements();
    const totalContentHeight = achievements.length * achievementHeight;
    const visibleHeight = canvas.height - 220; // Approx visible area
    const maxScroll = Math.max(0, totalContentHeight - visibleHeight);
    
    // Clamp scroll offset
    game.achievementsScrollOffset = Math.max(0, Math.min(maxScroll, game.achievementsScrollOffset));
  }
}, { passive: false });

function loadNextLevel() {
  const nextLevel = game.currentLevelIdx + 1;
  if (nextLevel < game.levelCount) {
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
