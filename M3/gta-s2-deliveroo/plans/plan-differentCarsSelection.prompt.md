# Plan: Car Selection Feature Implementation

## Overview
Implement a car selection system allowing players to choose between multiple vehicle types (Compact, Sport, SUV, Truck) from the title screen. Each car type will have unique visual and performance characteristics. The SUV and Truck will have a custom visual appearance.

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
  - Playable vehicle.
  - Dark gray color: RGB(46, 48, 52)
  - Heavier, more powerful but less agile than Sport.
  - Custom rendering: Features a darker rear section and unique window styling instead of a separate roof.

- **Truck**
  - Not playable - shows alert: "Not implemented now, please buy DLC: Wide and fuel-hungry"
  - Orange color for button preview: RGB(255, 102, 0)
  - Custom rendering: Features a separate front cab and a large, darker rear storage area.

### 2. UI Integration
- Car selection buttons appear in side panel
- Visible only on TITLE_SCREEN state
- Four button group styled consistently with existing UI
- Selection persists across all levels in the game session
- Cannot change car mid-game

### 3. Behavior
- User selects car once at game start
- Selection remains active between level transitions
- Winter mode & steering mode toggles work identically for all cars
- Sport car defaults to sport acceleration but can toggle to normal mode
- Text color on the car's roof/back dynamically changes for better visibility against dark or light backgrounds.

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
        color: { r: 52, g: 152, b: 219 }, // Blue-ish
        dimensions: {
            carWidth: 44,
            carLength: 90,
            wheelBase: 60
        },
        performance: {
            maxSpeed: 18.0,
            maxReverseSpeed: -5.0,
            carMode: 'normal',
            accelerationNormal: 0.021,
            accelerationSport: 0.15,
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
            carWidth: 40,
            carLength: 95,
            wheelBase: 65
        },
        performance: {
            maxSpeed: 28.0,
            maxReverseSpeed: -8.0, // Faster reverse
            carMode: 'sport',
            accelerationNormal: 0.08, // Normal mode for sport car
            accelerationSport: 0.18, // Higher sport acceleration
            friction: 0.04, // Less friction = more responsive
            brakingForce: 0.65, // Better brakes
            maxSteerAngle: 0.45, // Sharper steering
            steerSpeed: 0.05, // Faster steering response
            tireGrip: 1.1, // Better grip
            angularDamping: 0.96,
            lateralForceMultiplier: 3.0
        }
    },
    SUV: {
        id: 'suv',
        name: 'SUV',
        displayName: 'SUV',
        color: { r: 46, g: 48, b: 52 }, // Dark gray
        dimensions: {
            carWidth: 50,
            carLength: 110,
            wheelBase: 75
        },
        performance: {
            maxSpeed: 16.0,
            maxReverseSpeed: -4.5,
            carMode: 'normal',
            accelerationNormal: 0.018,
            accelerationSport: 0.025,
            friction: 0.04,
            brakingForce: 0.65,
            maxSteerAngle: 0.55,
            steerSpeed: 0.025,
            tireGrip: 0.75,
            angularDamping: 0.90,
            lateralForceMultiplier: 1.5
        }
    },
    TRUCK: {
        id: 'truck',
        name: 'Truck',
        displayName: 'Truck',
        color: { r: 255, g: 102, b: 0 }, // Orange
        dimensions: {
            carWidth: 55,
            carLength: 180,
            wheelBase: 130
        },
        performance: {
            maxSpeed: 10.0,
            maxReverseSpeed: -3.0,
            carMode: 'normal',
            accelerationNormal: 0.008,
            accelerationSport: 0.008,
            friction: 0.04,
            brakingForce: 0.65,
            maxSteerAngle: 0.35,
            steerSpeed: 0.015,
            tireGrip: 0.60,
            angularDamping: 0.85,
            lateralForceMultiplier: 1.0
        },
        locked: true,
        lockMessage: 'Not implemented now, please buy DLC: Wide and fuel-hungry'
    }
};

export const DEFAULT_CAR = 'COMPACT';
```

**Notes:**
- SUV is now playable with its own physics.
- TRUCK is added but marked as `locked`.
- Performance parameters for all cars have been tuned.

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
    angularDamping: 0.94,
    lateralForceMultiplier: 2.0,
    
    get acceleration() { 
        return this.carMode === 'sport' ? this.accelerationSport : this.accelerationNormal; 
    },
    
    applyCarConfig(carConfig) {
        // Apply dimensions
        Object.assign(this, carConfig.dimensions);
        
        // Apply performance
        Object.assign(this, carConfig.performance);
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
    this.selectedCarType = null; // 'COMPACT', 'SPORT', 'SUV', or 'TRUCK'
    this.carColor = null; // {r, g, b} for rendering
    
    // ... rest of constructor ...
    this.player = new PlayerCar(0,0,0, null, 'COMPACT');
}
```

**Add methods:**

```javascript
selectCar(carType) {
    const carConfig = CAR_CONFIGS[carType];
    
    // Handle locked cars
    if (carConfig.locked) {
        alert(carConfig.lockMessage);
        return false;
    }
    
    // Apply configuration
    this.selectedCarType = carType;
    this.carColor = carConfig.color;
    CONFIG.applyCarConfig(carConfig);
    
    // Update player car with new config, type, and color
    this.player.carType = carType;
    this.player.setColor(carConfig.color);
    this.player.reset(this.player.x, this.player.y, this.player.angle);
    
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

**Update constructor to accept color and carType:**
```javascript
constructor(x, y, angleDeg, color = null, carType = 'COMPACT') {
    this.color = color || { r: 52, g: 152, b: 219 }; // Default blue
    this.carType = carType;
    this.reset(x, y, angleDeg);
}

setColor(color) {
    this.color = color;
}
```

**Update draw methods:**
Replace hardcoded color values with `this.color` and add conditional rendering based on `this.carType`.

---

### Phase 3: UI Implementation

#### 3.1 Update HTML (`index.html`)

Add car selection panel to `#ui-container`:

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
        <button class="car-btn" data-car-type="TRUCK">
            <div class="car-preview" style="background-color: rgb(255, 102, 0);"></div>
            <span>Truck</span>
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
    pointer-events: auto;
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
    if (carPanel) carPanel.style.display = 'block';
    
    // ... rest of title screen logic ...
}
```

**Update other game states:**
Ensure car selection panel is hidden during gameplay:
```javascript
// In draw(), for states other than TITLE_SCREEN
const carPanel = document.getElementById('car-selection-panel');
if (carPanel) carPanel.style.display = 'none';
```

---

### Phase 4: Rendering Updates

#### 4.1 Update PlayerCar Rendering (`js/PlayerCar.js`)

**Modify `draw()` method:**
- Add conditional logic based on `this.carType` to handle custom drawing for 'SUV' and 'TRUCK'.
- For 'SUV', draw a darker rear section.
- For 'TRUCK', draw a separate cab and a darker, larger storage area.
- For standard cars, draw the lighter roof.
- Dynamically calculate the text color ('DELIVEROO') based on the brightness of the surface it's drawn on (roof or truck bed) to ensure contrast.

**Example conditional rendering:**
```javascript
// In draw() method of PlayerCar.js

// --- ROOF & SPECIAL FEATURES ---
let roofColor = { r: 0, g: 0, b: 0 };
if (this.carType === 'SUV') {
    // ... custom SUV drawing logic ...
} else if (this.carType === 'TRUCK') {
    // ... custom TRUCK drawing logic ...
} else {
    // ... standard car roof drawing logic ...
}

// Calculate text color based on roof brightness
const luminance = (0.299 * roofColor.r + 0.587 * roofColor.g + 0.114 * roofColor.b) / 255;
const textColor = luminance < 0.5 ? '#FFFFFF' : '#000000';

// ... later in draw() ...
// --- DELIVEROO TEXT ON ROOF ---
ctx.fillStyle = textColor;
ctx.fillText('DELIVEROO', 0, 0);
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
2. Car selection panel visible with 4 buttons
3. User clicks car button → selectCar() called
4. If locked (TRUCK) → alert shown, no selection
5. If valid → CONFIG updated, player car reset with new config
6. User clicks "Start Game" → game begins with selected car
7. Car persists through all levels until page reload

#### 5.2 State Management Checklist

- [x] Car selection only visible on TITLE_SCREEN
- [x] Selected car persists across level transitions
- [x] loadLevel() does not reset car selection
- [x] Player car color matches selected car
- [x] Player car dimensions match selected car
- [x] Performance characteristics apply correctly
- [x] Sport car starts with carMode='sport'
- [x] Winter/steering toggles work for all cars
- [x] Custom rendering for SUV and Truck is applied.
- [x] Text color on roof is dynamic.

#### 5.3 Testing Scenarios

**Test Case 1: Compact Selection**
- Select Compact → verify blue color, standard look
- Start game → verify standard performance

**Test Case 2: Sport Selection**
- Select Sport → verify red color, standard look
- Start game → verify faster speed (max 28)
- Check dimensions: 40x95

**Test Case 3: SUV Selection**
- Select SUV -> verify dark gray color, custom SUV look
- Start game -> verify heavier performance
- Check text on back is white.

**Test Case 4: TRUCK Attempt**
- Click TRUCK button → verify alert appears
- Alert text: "Not implemented now, please buy DLC: Wide and fuel-hungry"
- Verify no car selection occurs

**Test Case 5: Level Persistence**
- Select Sport car
- Complete Level 1
- Load Level 2 → verify still Sport car

**Test Case 6: No Selection Protection**
- Load game, don't select car
- Try to start game → verify alert "Please select a car first!"

---

## Future Enhancements (Out of Scope)

- [ ] TRUCK implementation with realistic physics (heavier, slower, worse handling)
- [ ] Car unlock system (earn TRUCK through achievements)
- [ ] More car types (Motorcycle, Van)
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
- ✅ Applies custom visual styles for specific car types (SUV, Truck)
- ✅ Dynamically adjusts text color for readability
- ✅ Handles locked content gracefully (TRUCK)
- ✅ Scales for future car types

The modular approach ensures easy addition of new cars and maintains code quality while providing meaningful gameplay variety.
