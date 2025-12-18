# Plan: Car Selection Feature Implementation

## Overview
Implement a car selection system allowing players to choose between three vehicle types (Compact, Sport, SUV) from the title screen. Each car type will have unique visual and performance characteristics.

## Requirements Summary

### 1. Car Types
- **Compact** (Current default)
  - Existing parameters from CONFIG
  - Blue-ish color (current)
  - Balanced performance

- **Sport**
  - Smaller dimensions: `carWidth = 38`, `carLength = 75`
  - Faster: `maxSpeed = 30`
  - Better handling: improved steering, reduced friction
  - Starts in sport mode: `carMode = 'sport'`
  - Vibrant red color: RGB(255, 40, 0)
  - More agile physics parameters

- **SUV**
  - Not playable - shows alert: "Not implemented now, please buy DLC: Wide and fuel-hungry"
  - Dark gray color for button preview: RGB(46, 48, 52)

### 2. UI Integration
- Car selection buttons appear in side panel
- Visible only on TITLE_SCREEN state
- Three button group styled consistently with existing UI
- Selection persists across all levels in the game session
- Cannot change car mid-game

### 3. Behavior
- User selects car once at game start
- Selection remains active between level transitions
- Winter mode & steering mode toggles work identically for all cars
- Sport car defaults to sport acceleration but can toggle to normal mode

---

## Implementation Plan

### Phase 1: Data Model & Configuration

#### 1.1 Create Car Configuration Module (`js/carConfigs.js`)
Create a new module defining car type specifications:

```javascript
export const CAR_CONFIGS = {
    COMPACT: {
        id: 'compact',
        name: 'Compact',
        displayName: 'Compact',
        color: { r: 52, g: 152, b: 219 }, // Current blue-ish
        dimensions: {
            carWidth: 44,
            carLength: 90,
            wheelBase: 60
        },
        performance: {
            maxSpeed: 18.0,
            maxReverseSpeed: -5.0,
            carMode: 'normal',
            acceleration: 0.021,
            friction: 0.06,
            brakingForce: 0.5,
            maxSteerAngle: 0.65,
            steerSpeed: 0.03,
            tireGrip: 0.85
        }
    },
    SPORT: {
        id: 'sport',
        name: 'Sport',
        displayName: 'Sport',
        color: { r: 255, g: 40, b: 0 }, // Vibrant red
        dimensions: {
            carWidth: 38,
            carLength: 75,
            wheelBase: 50 // Proportionally smaller
        },
        performance: {
            maxSpeed: 30.0,
            maxReverseSpeed: -8.0, // Faster reverse too
            carMode: 'sport',
            acceleration: 0.15, // Use sport acceleration
            friction: 0.04, // Less friction = more responsive
            brakingForce: 0.65, // Better brakes
            maxSteerAngle: 0.75, // Sharper steering
            steerSpeed: 0.045, // Faster steering response
            tireGrip: 0.90 // Better grip
        }
    },
    SUV: {
        id: 'suv',
        name: 'SUV',
        displayName: 'SUV',
        color: { r: 46, g: 48, b: 52 }, // Dark gray
        locked: true,
        lockMessage: 'Not implemented now, please buy DLC: Wide and fuel-hungry'
    }
};

export const DEFAULT_CAR = 'COMPACT';
```

**Notes:**
- Sport car has proportionally reduced wheelBase (75/90 ≈ 50/60)
- Sport performance tuned for agility: better steering angles, faster response, higher grip
- SUV marked as locked with custom message

#### 1.2 Modify CONFIG (`js/config.js`)
Refactor CONFIG to support dynamic car configuration:

**Changes needed:**
- Remove hardcoded car dimensions and performance values
- Add method to apply car configuration: `applyCarConfig(carConfig)`
- Keep shared parameters (wheelWidth, wheelLength, kmhFactor, etc.)
- Maintain backward compatibility

**Implementation approach:**
```javascript
export const CONFIG = {
    // Shared parameters (not car-specific)
    wheelWidth: 10,
    wheelLength: 20,
    kmhFactor: 8,
    handbrakeBoostRate: 0.018,
    handbrakeBoostMax: 1.0,
    handbrakeBoostMultiplier: 6.0,
    handbrakeBoostDecay: 0.05,
    tireGripBraking: 0.65,
    driftThreshold: 2.0,
    driftFriction: 0.98,
    angularDamping: 0.94,
    lateralForceMultiplier: 2.0,
    curbSafeSpeed: 1.5,
    steerRestoringDriving: 0.02,
    
    // Car-specific (will be overridden by selected car)
    carWidth: 44,
    carLength: 90,
    wheelBase: 60,
    maxSpeed: 18.0,
    maxReverseSpeed: -5.0,
    carMode: 'normal',
    accelerationNormal: 0.021,
    accelerationSport: 0.15,
    friction: 0.06,
    brakingForce: 0.5,
    maxSteerAngle: 0.65,
    steerSpeed: 0.03,
    tireGrip: 0.85,
    
    get acceleration() { 
        return this.carMode === 'sport' ? this.accelerationSport : this.accelerationNormal; 
    },
    
    applyCarConfig(carConfig) {
        // Apply dimensions
        Object.assign(this, carConfig.dimensions);
        
        // Apply performance
        Object.assign(this, carConfig.performance);
        
        // Update acceleration values based on carMode
        if (carConfig.performance.carMode === 'sport') {
            this.accelerationSport = carConfig.performance.acceleration;
            this.accelerationNormal = carConfig.performance.acceleration * 0.14; // ~normal ratio
        } else {
            this.accelerationNormal = carConfig.performance.acceleration;
            this.accelerationSport = carConfig.performance.acceleration * 7.14; // Keep sport multiplier
        }
    }
};
```

---

### Phase 2: Game State Management

#### 2.1 Extend Game Class (`js/Game.js`)

**Add properties:**
```javascript
constructor(canvas, ctx, input) {
    // ... existing properties ...
    
    // Car selection state
    this.selectedCarType = null; // 'COMPACT', 'SPORT', or 'SUV'
    this.carColor = null; // {r, g, b} for rendering
    
    // ... rest of constructor ...
}
```

**Add methods:**

```javascript
selectCar(carType) {
    const carConfig = CAR_CONFIGS[carType];
    
    // Handle locked cars (SUV)
    if (carConfig.locked) {
        alert(carConfig.lockMessage);
        return false;
    }
    
    // Apply configuration
    this.selectedCarType = carType;
    this.carColor = carConfig.color;
    CONFIG.applyCarConfig(carConfig);
    
    // Reset player car with new config
    this.player.reset(0, 0, 0);
    
    return true;
}

getSelectedCarConfig() {
    return this.selectedCarType ? CAR_CONFIGS[this.selectedCarType] : null;
}
```

**Modify startGame():**
```javascript
async startGame() {
    // Ensure car is selected before starting
    if (!this.selectedCarType) {
        alert('Please select a car first!');
        return;
    }
    
    this.state = 'LOADING';
    await this.loadLevel(this.currentLevelIdx);
}
```

#### 2.2 Modify PlayerCar Class (`js/PlayerCar.js`)

**Update constructor to accept color:**
```javascript
constructor(x, y, angleDeg, color = null) {
    this.color = color || { r: 52, g: 152, b: 219 }; // Default blue
    this.reset(x, y, angleDeg);
}

setColor(color) {
    this.color = color;
}
```

**Update draw methods:**
Replace hardcoded color values with `this.color`:
- In `drawCar()`: Use `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`
- Adjust highlight/shadow colors proportionally to maintain visual quality

---

### Phase 3: UI Implementation

#### 3.1 Update HTML (`index.html`)

Add car selection panel to `#ui-container` (after controls panel, before levels panel):

```html
<div class="panel" id="car-selection-panel" style="display: none;">
    <h3>Wybierz Samochód</h3>
    <div id="car-buttons-container">
        <button class="car-btn" data-car-type="COMPACT">
            <div class="car-preview" style="background-color: rgb(52, 152, 219);"></div>
            <span>Compact</span>
        </button>
        <button class="car-btn" data-car-type="SPORT">
            <div class="car-preview" style="background-color: rgb(255, 40, 0);"></div>
            <span>Sport</span>
        </button>
        <button class="car-btn" data-car-type="SUV">
            <div class="car-preview" style="background-color: rgb(46, 48, 52);"></div>
            <span>SUV</span>
        </button>
    </div>
    <div id="car-selection-info" style="margin-top: 10px; font-size: 12px; color: #95a5a6;">
        Wybierz pojazd przed rozpoczęciem gry
    </div>
</div>
```

#### 3.2 Add CSS Styles

```css
.car-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px;
    margin-bottom: 8px;
    background: #2c3e50;
    border: 2px solid transparent;
    color: white;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    text-align: left;
    gap: 12px;
}

.car-btn:hover {
    background: #34495e;
    border-color: #3498db;
}

.car-btn.selected {
    background: #27ae60;
    border-color: #2ecc71;
    font-weight: bold;
}

.car-btn.locked {
    opacity: 0.5;
    cursor: not-allowed;
}

.car-preview {
    width: 40px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
```

#### 3.3 Update main.js

Add car selection event handlers:

```javascript
// Car selection buttons
document.querySelectorAll('.car-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const carType = btn.getAttribute('data-car-type');
        const success = game.selectCar(carType);
        
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
```

#### 3.4 Modify Game.js Draw Methods

**Update drawTitleScreen():**
```javascript
drawTitleScreen() {
    // ... existing title screen rendering ...
    
    // Show/hide car selection panel
    const carPanel = document.getElementById('car-selection-panel');
    carPanel.style.display = 'block';
    
    // ... rest of title screen logic ...
}
```

**Update other game states:**
Ensure car selection panel is hidden during gameplay:
```javascript
// In drawPlaying(), drawLevelComplete(), etc.
document.getElementById('car-selection-panel').style.display = 'none';
```

---

### Phase 4: Rendering Updates

#### 4.1 Update PlayerCar Rendering (`js/PlayerCar.js`)

**Modify `drawCar()` method:**
- Replace hardcoded color `rgb(52, 152, 219)` with dynamic `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`
- Update body color
- Adjust hood/roof highlights to work with any base color
- Ensure shadows/outlines remain visible on all colors

**Example color application:**
```javascript
// Body - use dynamic color
ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
ctx.fill(bodyPath);

// Highlights - lighter version
const highlightColor = `rgb(${Math.min(255, this.color.r + 40)}, ${Math.min(255, this.color.g + 40)}, ${Math.min(255, this.color.b + 40)})`;
ctx.fillStyle = highlightColor;
// ... apply to hood/roof ...

// Shadows - darker version
const shadowColor = `rgb(${Math.max(0, this.color.r - 30)}, ${Math.max(0, this.color.g - 30)}, ${Math.max(0, this.color.b - 30)})`;
ctx.strokeStyle = shadowColor;
// ... apply to outlines ...
```

#### 4.2 Ensure Car Dimensions Update

Verify that all car rendering uses CONFIG values:
- Width: `CONFIG.carWidth`
- Length: `CONFIG.carLength`
- Wheel positions based on `CONFIG.wheelBase`

---

### Phase 5: Integration & Testing

#### 5.1 Initialization Flow

**Updated game start sequence:**
1. User loads game → Title screen appears
2. Car selection panel visible with 3 buttons
3. User clicks car button → selectCar() called
4. If locked (SUV) → alert shown, no selection
5. If valid → CONFIG updated, player car reset with new config
6. User clicks "Start Game" → game begins with selected car
7. Car persists through all levels until page reload

#### 5.2 State Management Checklist

- [ ] Car selection only visible on TITLE_SCREEN
- [ ] Selected car persists across level transitions
- [ ] loadLevel() does not reset car selection
- [ ] Player car color matches selected car
- [ ] Player car dimensions match selected car
- [ ] Performance characteristics apply correctly
- [ ] Sport car starts with carMode='sport'
- [ ] Winter/steering toggles work for all cars

#### 5.3 Testing Scenarios

**Test Case 1: Compact Selection**
- Select Compact → verify blue color
- Start game → verify standard performance
- Complete level → verify car stays Compact
- Check dimensions: 44x90

**Test Case 2: Sport Selection**
- Select Sport → verify red color
- Start game → verify faster speed (max 30)
- Test acceleration → should use sport mode by default
- Toggle to normal mode → verify slower acceleration
- Check dimensions: 38x75
- Verify sharper steering response

**Test Case 3: SUV Attempt**
- Click SUV button → verify alert appears
- Alert text: "Not implemented now, please buy DLC: Wide and fuel-hungry"
- Verify no car selection occurs
- Start game button → should still require valid car selection

**Test Case 4: Level Persistence**
- Select Sport car
- Complete Level 1
- Load Level 2 → verify still Sport car
- Verify performance hasn't reset to Compact

**Test Case 5: No Selection Protection**
- Load game, don't select car
- Try to start game → verify alert "Please select a car first!"
- Select car → can now start

---

## Implementation Order

### Step 1: Foundation (No UI changes yet)
1. Create `js/carConfigs.js`
2. Refactor `js/config.js` - add `applyCarConfig()` method
3. Test: Ensure game still works with default config

### Step 2: Game Logic
1. Add car selection properties to `Game.js`
2. Implement `selectCar()` method
3. Add color property to `PlayerCar.js`
4. Test: Call selectCar() from console, verify CONFIG updates

### Step 3: Rendering
1. Update PlayerCar color rendering
2. Verify dynamic dimensions work
3. Test: All three car configs render correctly

### Step 4: UI
1. Add HTML for car selection panel
2. Add CSS styles
3. Wire up event handlers in `main.js`
4. Implement show/hide logic in Game.js states
5. Test: Full user flow from selection to gameplay

### Step 5: Polish & Testing
1. Run all test scenarios
2. Verify alert messages
3. Check visual consistency across all states
4. Test level transitions
5. Validate performance characteristics feel right

---

## Files to Modify

### New Files
- `js/carConfigs.js` - Car configuration data

### Modified Files
- `js/config.js` - Add applyCarConfig() method, refactor structure
- `js/Game.js` - Add car selection state and methods
- `js/PlayerCar.js` - Add color property and dynamic rendering
- `js/main.js` - Add car selection event handlers
- `index.html` - Add car selection panel HTML and CSS

### No Changes Needed
- Level files
- NpcCar, ObstacleCar, other entities
- Input handling
- Audio system
- Utility functions

---

## Potential Issues & Solutions

### Issue 1: Sport car too fast for existing levels
**Solution:** If maxSpeed=30 makes levels too easy, can adjust:
- Reduce to 25
- Increase friction slightly
- Adjust level parking zone tolerances

### Issue 2: Color rendering looks wrong
**Solution:** Test each color with:
- Different lighting conditions (headlights on/off)
- Brake lights active
- Various backgrounds
- Adjust highlight/shadow calculations if needed

### Issue 3: Dimensions cause collision issues
**Solution:** Sport car is smaller, might fit where Compact couldn't:
- This is a feature (reward for choosing Sport)
- If problematic, adjust hitbox separately from visual size

### Issue 4: CarMode toggle confusion
**Solution:** Update UI to show current mode more clearly:
- Add indicator showing "Mode: Sport" or "Mode: Normal"
- Different color for mode button when sport car selected

---

## Future Enhancements (Out of Scope)

- [ ] SUV implementation with realistic physics (heavier, slower, worse handling)
- [ ] Car unlock system (earn SUV through achievements)
- [ ] More car types (Motorcycle, Truck, Van)
- [ ] Custom color picker
- [ ] Performance stats display (0-60, top speed, etc.)
- [ ] Car-specific sound effects
- [ ] Visual customization (decals, rims, etc.)
- [ ] Persist car selection to localStorage
- [ ] Per-level car recommendations

---

## Summary

This implementation adds a clean, integrated car selection system that:
- ✅ Allows choice before gameplay starts
- ✅ Persists across levels
- ✅ Uses proper architecture (config objects, not hardcoded values)
- ✅ Maintains existing game mechanics
- ✅ Provides clear user feedback
- ✅ Handles locked content gracefully (SUV)
- ✅ Scales for future car types

The modular approach ensures easy addition of new cars and maintains code quality while providing meaningful gameplay variety.
