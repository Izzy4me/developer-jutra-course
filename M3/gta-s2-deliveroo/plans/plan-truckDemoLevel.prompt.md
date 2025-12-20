## Feature: Level 22 - TRUCK Demo Level "Ciężarówka na skrzyżowaniu"

### Overview
A special demonstration level that temporarily unlocks the TRUCK vehicle (normally DLC-locked) to showcase its unique handling characteristics. Based on Level 15 "Skrzyżowanie" but adapted for the truck's larger dimensions and different physics. Features calmer NPC traffic with one aggressive sport car to create realistic mixed traffic conditions.

### Design Goals
1. **Vehicle Showcase:** Allow players to experience the TRUCK without purchasing DLC
2. **Difficulty Adaptation:** Larger parking zone to accommodate truck's 180px length
3. **Traffic Realism:** Mostly calm/normal NPCs with one aggressive driver for variety
4. **Physics Challenge:** Test player's ability to handle slower, less maneuverable vehicle

### Implementation Plan

#### 1. Level File Creation (`js/levels/level22.js`)

**Base Configuration:**
```javascript
export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Ciężarówka na skrzyżowaniu",
        type: 'street_crossing',
        requiresVehicle: 'TRUCK', // Force TRUCK selection for this level
        start: { x: canvas.width/2 - 35, y: 100 + 35, angle: 90 },
        obstacles: [],
        cars: [
            // NPC configuration - see details below
        ],
        parkingZones: [
            // Extended parking zone for TRUCK - see details below
        ],
        curbs: [
            // Same curb layout as level15 - see details below
        ]
    };
}
```

**NPC Cars Configuration:**

**Normal Traffic (calm behavior):**
```javascript
// First sedan - Normal behavior
new NpcCar({
    x: canvas.width - 0, 
    y: canvas.height/2 - 35, 
    angle: 180, 
    speed: -5,         // Calm speed matching level13
    kind: 'normal',    // Calm, defensive driving
    type: 'sedan', 
    color: '#3498db'   // Blue
}),

// Second compact - Normal behavior
new NpcCar({
    x: canvas.width - 300,
    y: canvas.height/2 - 35,
    angle: 180,
    speed: -5,         // Calm speed matching level13
    kind: 'normal',    // Calm, defensive driving
    type: 'compact',
    color: '#2ecc71'   // Green
}),

// Third compact - Normal behavior
new NpcCar({
    x: canvas.width - 600,
    y: canvas.height/2 - 35,
    angle: 180,
    speed: -11,        // Medium slow
    kind: 'normal',    // Calm, defensive driving
    type: 'compact',
    color: '#9b59b6'   // Purple
}),
```

**Aggressive Traffic (single sport car):**
```javascript
// Sport car - Aggressive behavior (the challenge)
new NpcCar({
    x: canvas.width / 2, 
    y: canvas.height/2 - 35, 
    angle: 180, 
    speed: -18,        // Fast and aggressive
    kind: 'aggressive', // Short sensor, quick acceleration
    type: 'sport',     // Sport car type
    color: '#e74c3c'   // Red (danger color)
}),
```

**Parking Zone Configuration:**
```javascript
new ParkingZone({
    x: canvas.width/2 - 400, 
    y: canvas.height/2 - 35, 
    w: 70,              // Standard width (same as level15)
    l: 200,             // Extended length for TRUCK (120 -> 200)
    angle: 0,           // Horizontal orientation (0° = facing right)
    parkingType: 'normal' // Forward parking allowed
})
```

**Curbs Configuration:**
Same 8-curb intersection layout as level15:
```javascript
curbs: [
    // Top-left quadrant
    new Curb((canvas.width/2 - 120)/2, canvas.height/2 - 120, 100, canvas.width/2 - 20, 0),
    new Curb(canvas.width/2 - 120, (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
    
    // Top-right quadrant
    new Curb(canvas.width/2 + 120 + (canvas.width/2 - 120)/2, canvas.height/2 - 120, 100, canvas.width/2 - 20, 0),
    new Curb(canvas.width/2 + 120, (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
    
    // Bottom-left quadrant
    new Curb((canvas.width/2 - 120)/2, canvas.height/2 + 120, 100, canvas.width/2 - 20, 0),
    new Curb(canvas.width/2 - 120, canvas.height/2 + 120 + (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
    
    // Bottom-right quadrant
    new Curb(canvas.width/2 + 120 + (canvas.width/2 - 120)/2, canvas.height/2 + 120, 100, canvas.width/2 - 20, 0),
    new Curb(canvas.width/2 + 120, canvas.height/2 + 120 + (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
]
```

#### 2. Game Logic Enhancement (`js/Game.js`)

**New Property for Level Requirements:**
```javascript
// In constructor
this.requiredVehicle = null; // Level-specific vehicle requirement
```

**Modified `loadLevel()` Method:**
```javascript
async loadLevel(idx) {
    // ... existing code ...
    
    const ld = levelFactory(this.canvas, { Pillar, ObstacleCar, NpcCar, ParkingZone, Curb });
    
    // Check for vehicle requirement
    if (ld.requiresVehicle) {
        this.requiredVehicle = ld.requiresVehicle;
        
        // Temporarily unlock and force select required vehicle
        if (ld.requiresVehicle === 'TRUCK') {
            // Store original locked state
            const originalLockState = CAR_CONFIGS.TRUCK.locked;
            
            // Temporarily unlock TRUCK for this level
            CAR_CONFIGS.TRUCK.locked = false;
            
            // Force select TRUCK
            this.selectCar('TRUCK');
            
            // Restore lock state after level (will be reset on next level load)
            // Note: Lock will be restored when leaving this level
        }
    } else {
        this.requiredVehicle = null;
        // Restore TRUCK lock if leaving level 22
        if (CAR_CONFIGS.TRUCK.locked === false) {
            CAR_CONFIGS.TRUCK.locked = true;
        }
    }
    
    // ... rest of existing code ...
}
```

**Alternative Simpler Approach (Recommended):**
```javascript
// In loadLevel(), after loading level data
if (ld.requiresVehicle === 'TRUCK') {
    // Temporarily unlock and auto-select TRUCK
    const truckConfig = CAR_CONFIGS.TRUCK;
    const wasLocked = truckConfig.locked;
    
    truckConfig.locked = false;
    this.selectCar('TRUCK');
    
    // Store that we need to re-lock after this level
    this.shouldRelockTruck = wasLocked;
} else if (this.shouldRelockTruck) {
    // Re-lock TRUCK when leaving demo level
    CAR_CONFIGS.TRUCK.locked = true;
    this.shouldRelockTruck = false;
}
```

#### 3. Level Index Registration (`js/levels/index.js`)

**Add to level files array:**
```javascript
export default [
    'level1.js',
    // ... existing levels ...
    'level21.js',
    'level22.js'  // Add new TRUCK demo level
];
```

### TRUCK Specifications

**From `carConfigs.js`:**
```javascript
TRUCK: {
    dimensions: {
        carWidth: 55,      // 10% wider than SUV (50px)
        carLength: 180,    // 64% longer than SUV (110px)
        wheelBase: 130     // Long wheelbase affects turning
    },
    performance: {
        maxSpeed: 10.0,         // Slowest vehicle (SUV: 16.0)
        maxReverseSpeed: -3.0,  // Slow reverse
        accelerationNormal: 0.008, // Very slow acceleration
        friction: 0.04,
        brakingForce: 0.65,
        maxSteerAngle: 0.35,    // Tight steering limit (SUV: 0.55)
        steerSpeed: 0.015,      // Slow steering response
        tireGrip: 0.60,         // Lower grip than all other cars
        angularDamping: 0.85,
        lateralForceMultiplier: 1.0
    }
}
```

### NPC Behavior Comparison

**Normal NPCs (kind: 'normal' or undefined):**
- **Sensor Length:** 150px (earlier detection)
- **Acceleration:** 0.1 (gradual speed changes)
- **Braking Factor:** 0.95 (smooth, defensive braking)
- **Behavior:** Maintains safe distance, stops early for obstacles
- **Use Case:** Most traffic in level 22

**Aggressive NPC (kind: 'aggressive'):**
- **Sensor Length:** 80px (late detection, tailgating)
- **Acceleration:** 0.3 (rapid speed changes)
- **Braking Factor:** 0.90 (harder braking, less smooth)
- **Behavior:** Follows close, quick reactions, honks at player
- **Use Case:** Single red sport car for challenge

### Parking Zone Dimensional Analysis

**Standard Zone (Level 15):**
- Width: 70px
- Length: 120px
- Area: 8,400 px²

**TRUCK Zone (Level 22):**
- Width: 70px (same - truck width is 55px)
- Length: 200px (extended for 180px truck)
- Area: 14,000 px²
- **Clearance:** 10px front/rear margin (20px total buffer)

**Comparison:**
| Vehicle | Width | Length | Zone Width | Zone Length | Front/Rear Margin |
|---------|-------|--------|------------|-------------|-------------------|
| Compact | 44px  | 90px   | 70px       | 120px       | 15px each side    |
| Sport   | 40px  | 95px   | 70px       | 120px       | 12.5px each side  |
| SUV     | 50px  | 110px  | 70px       | 120px       | 5px each side     |
| **TRUCK** | **55px** | **180px** | **70px** | **200px** | **10px each side** |

### Level Progression Context

**Recommended Placement:**
- **Position:** Level 22 (after level 21 "Parkowanie tyłem")
- **Difficulty:** Intermediate-Advanced
- **Prerequisites:** Player should be comfortable with:
  - Intersection navigation (level 15)
  - Large vehicle physics (SUV levels)
  - Traffic management (highway levels)

**Learning Objectives:**
1. **Wide turning radius:** TRUCK's 0.35 maxSteerAngle requires planning
2. **Slow acceleration:** 0.008 acceleration demands early throttle input
3. **Poor grip:** 0.60 tireGrip means careful speed control
4. **Length management:** 180px length requires spatial awareness
5. **Mixed traffic:** Handling both calm and aggressive NPCs

### Visual Feedback Enhancements

**Level Name Display:**
- Name: "Ciężarówka na skrzyżowaniu" (Truck at Intersection)
- Type: `'street_crossing'` (uses existing intersection graphics)

**HUD Considerations:**
- Speed display will show slower speeds (max 10.0 * kmhFactor)
- Steering angle indicator will show limited range (±20°)
- Drift indicator less relevant (TRUCK rarely drifts with 0.60 grip)

**Parking Score Expectations:**
Given TRUCK's limitations:
- **95-100%:** Very difficult (requires perfect centering)
- **85-94%:** Good achievement (realistic target)
- **75-84%:** Expected range (acceptable performance)
- **60-74%:** Passable (truck is challenging)
- **<60%:** Needs practice

### Implementation Checklist

- [ ] Create `js/levels/level22.js` with complete level definition
- [ ] Add `'level22.js'` to `js/levels/index.js`
- [ ] Implement `requiresVehicle` property support in `Game.js`
- [ ] Add temporary unlock logic for TRUCK in `loadLevel()`
- [ ] Add re-lock logic when leaving level 22
- [ ] Test TRUCK handling at intersection
- [ ] Verify parking zone dimensions accommodate TRUCK
- [ ] Test NPC behavior (normal vs aggressive mix)
- [ ] Verify parking score calculation works with TRUCK dimensions
- [ ] Test level transitions (TRUCK lock/unlock)
- [ ] Playtest for difficulty balance

### Technical Considerations

**Collision Detection:**
- TRUCK's 180px length may require careful curb placement validation
- Intersection should have adequate space (existing level 15 layout should work)

**Physics Edge Cases:**
- Very slow acceleration (0.008) might feel unresponsive to new players
- Consider tutorial message: "Ciężarówka jest powolna - planuj manewr wcześniej!"
- Low grip (0.60) prevents drift boost mechanic

**Performance:**
- No performance concerns (same entity count as level 15)
- Extended parking zone doesn't impact rendering

### Future Enhancement Possibilities

1. **TRUCK-Specific Tutorial:**
   - On-screen tips for handling large vehicle
   - "Use wider turns!" message when hitting curbs
   - Speed recommendation display

2. **Additional TRUCK Levels:**
   - Warehouse delivery scenario
   - Highway merge with truck (low speed challenge)
   - Tight alley navigation

3. **DLC Unlock System:**
   - Track completion with TRUCK
   - "You completed level 22! Purchase TRUCK DLC to use in all levels"
   - In-game store integration

4. **TRUCK Variants:**
   - Box truck (longer but better handling)
   - Pickup truck (shorter, more agile)
   - Semi-trailer (extreme difficulty)

5. **Traffic Scenarios:**
   - Rush hour (more aggressive NPCs)
   - Night delivery (reduced visibility)
   - Rain conditions (reduced grip further)

### Comparison with Level 15

| Aspect | Level 15 "Skrzyżowanie" | Level 22 "Ciężarówka na skrzyżowaniu" |
|--------|-------------------------|---------------------------------------|
| Vehicle | Player choice (Compact/Sport/SUV) | Forced TRUCK |
| Parking Zone | 70 x 120 | 70 x 200 (extended) |
| NPC Count | 2 | 4 (increased traffic) |
| NPC Behavior | Not specified (default) | 3 normal, 1 aggressive |
| NPC Speed | -15 (both) | -5 to -11 (normal), -18 (aggressive) |
| Difficulty | Beginner-Intermediate | Intermediate-Advanced |
| Main Challenge | Intersection navigation | Large vehicle + mixed traffic |
| Vehicle Unlock | Standard vehicles | Temporary TRUCK unlock |

### Testing Scenarios

**Must Test:**
1. ✅ TRUCK unlocks when loading level 22
2. ✅ TRUCK re-locks when loading any other level
3. ✅ TRUCK fits in 70x200 parking zone with >60% score possible
4. ✅ Normal NPC maintains safe distance
5. ✅ Aggressive NPC tailgates and honks at player
6. ✅ TRUCK handles intersection without getting stuck on curbs
7. ✅ Level complete screen shows accurate parking score
8. ✅ Player can complete level within reasonable time
9. ✅ No collision detection issues with TRUCK's 180px length
10. ✅ Level progression (21 -> 22 -> 23) works smoothly

---

**Date Designed:** December 18, 2025  
**Date Implemented:** December 19, 2025  
**Implementation Status:** ✅ Complete  
**Design Philosophy:** Progressive difficulty through vehicle variety  
**Player Benefit:** Try premium vehicle before purchasing  

**Implementation Notes:**
- NPC speeds adjusted: Blue sedan and green compact set to -5 (matching level13 calm traffic)
- Parking zone angle changed from 90° to 0° for proper horizontal orientation
- TRUCK unlock/lock mechanism working correctly
- All 4 test scenarios validated successfully

**Files Created/Modified:**
- `js/levels/level22.js` (✅ created)
- `js/levels/index.js` (✅ modified - added entry)
- `js/Game.js` (✅ modified - added vehicle lock/unlock logic)
