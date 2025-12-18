# GTA: S2 Deliveroo - New Gameplay Features Documentation

## Feature: Reverse Parking System

### Overview
Implemented a flexible parking system that allows level designers to specify parking zones requiring reverse parking (backing in) versus normal forward parking.

### Implementation Details

#### 1. ParkingZone Model Enhancement (`js/ParkingZone.js`)

**Added Property:**
```javascript
this.parkingType = props.parkingType || 'normal'; // 'normal' or 'reverse'
```

**Valid Values:**
- `'normal'` (default) - Car can park facing any direction
- `'reverse'` - Car must be facing opposite direction (180° ± 23°) from zone orientation

**Visual Indicator:**
Parking zones with `parkingType: 'reverse'` display "Tyłem" (Polish for "Reverse") text in white at the zone center.

#### 2. Game Logic Changes (`js/Game.js`)

**Updated `checkParking()` Method:**
- Removed dependency on `this.level.subtype`
- Now checks `zone.parkingType` property directly
- Each parking zone is evaluated independently

**Reverse Parking Validation:**
```javascript
if (zone.parkingType === 'reverse') {
    const zoneAngle = zone.angle || 0;
    const angleDiff = Math.atan2(
        Math.sin(this.player.angle - zoneAngle), 
        Math.cos(this.player.angle - zoneAngle)
    );
    
    // Car must face opposite direction (±23° tolerance)
    if (Math.abs(angleDiff) > Math.PI - 0.4) {
        this.triggerLevelComplete();
    }
}
```

**Angle Tolerance:** 0.4 radians (~23 degrees) from perfect 180° opposition

#### 3. New Level: Level 21 - "Parkowanie tyłem" (`js/levels/level21.js`)

**Level Configuration:**
- **Name:** "Parkowanie tyłem" (Reverse Parking)
- **Type:** `'lot'` (parking lot environment)
- **Subtype:** `'reverse'` (legacy property, no longer used in logic)
- **Starting Position:** x: 100, y: 360, angle: 0°

**Obstacles:**
- 9 pillars positioned to create narrow parking challenge
- Strategic placement: (255, 430), (325, 520), (395, 430), (465, 430), (535, 520), (605, 430), (325, 185), (535, 185), (605, 260)

**Parked Cars:**
- SUV at (255, 260) - Purple (#8e44ad)
- Sedan at (395, 260) - Red (#c0392b)
- Compact at (465, 260) - Green (#27ae60)
- All facing 90° (vertical orientation)

**Parking Zones:**
Two reverse parking zones:
```javascript
new ParkingZone({x: 325, y: 260, w: 70, l: 120, angle: 270, parkingType: 'reverse'})
new ParkingZone({x: 535, y: 260, w: 70, l: 120, angle: 270, parkingType: 'reverse'})
```
- Width: 70px, Length: 120px
- Orientation: 270° (facing left)
- Both require reverse parking

**Curbs:**
- Top boundary: Full width at y: 20
- Bottom boundary: Full width at y: canvas.height - 20

### Benefits of Refactored Design

#### ✅ Flexibility
- Reverse parking zones can be oriented at any angle (0°, 90°, 180°, 270°, etc.)
- Not limited to specific angle values
- Mixed parking types within single level

#### ✅ Clarity
- `parkingType: 'reverse'` is self-documenting
- No need to remember that "270° means reverse"
- Intent is explicit in level definition

#### ✅ Scalability
- Easy to add new parking types in future:
  - `'parallel'` - Parallel parking challenge
  - `'diagonal'` - Angled parking (45°)
  - `'perpendicular'` - Standard 90° spots
  - `'compact'` - Smaller zones requiring precision

#### ✅ Independence
- Each parking zone has its own rules
- Level designers can create complex scenarios
- No global level-wide constraints

### Usage Examples

**Normal Forward Parking:**
```javascript
new ParkingZone({x: 400, y: 300, w: 70, l: 120, angle: 0, parkingType: 'normal'})
// or simply omit parkingType (defaults to 'normal')
new ParkingZone({x: 400, y: 300, w: 70, l: 120, angle: 0})
```

**Reverse Parking (any angle):**
```javascript
// Reverse into spot facing north (0°)
new ParkingZone({x: 400, y: 300, w: 70, l: 120, angle: 0, parkingType: 'reverse'})

// Reverse into spot facing east (90°)
new ParkingZone({x: 400, y: 300, w: 70, l: 120, angle: 90, parkingType: 'reverse'})

// Reverse into spot facing west (270°)
new ParkingZone({x: 400, y: 300, w: 70, l: 120, angle: 270, parkingType: 'reverse'})
```

**Mixed Level Example:**
```javascript
parkingZones: [
    // Normal spots
    new ParkingZone({x: 200, y: 300, w: 70, l: 120, angle: 0}),
    new ParkingZone({x: 300, y: 300, w: 70, l: 120, angle: 0}),
    
    // Reverse spots (harder)
    new ParkingZone({x: 400, y: 300, w: 70, l: 120, angle: 0, parkingType: 'reverse'}),
    new ParkingZone({x: 500, y: 300, w: 70, l: 120, angle: 0, parkingType: 'reverse'})
]
```

### Technical Notes

**Angle Calculation:**
- Uses `Math.atan2()` for normalized angle difference in range [-π, π]
- Handles angle wrapping automatically (no manual normalization needed)
- Formula: `Math.atan2(sin(Δθ), cos(Δθ))` where Δθ = player angle - zone angle

**Tolerance Rationale:**
- 0.4 radians = ~23 degrees
- Allows for realistic player error
- Strict enough to require proper backing in technique
- Prevents "close enough" forward parking from succeeding

**Visual Feedback:**
- White "Tyłem" text clearly indicates reverse parking requirement
- Text positioned at zone center for visibility
- Rendered after zone drawing (overlay effect)

### Future Enhancement Possibilities

1. **Difficulty Levels:**
   - Tighter angle tolerance for expert mode
   - Larger tolerance for beginner mode

2. **Parking Types:**
   - Parallel parking with multi-step validation
   - Angled parking (45° spots)
   - Time-limited parking challenges

3. **Scoring System:**
   - Bonus points for perfect angle alignment
   - Penalties for multiple attempts
   - Time-based scoring

4. **Visual Enhancements:**
   - Arrow indicators showing required entry direction
   - Color-coded zones (green=normal, yellow=reverse, red=expert)
   - Animated guide lines for reverse parking trajectory

5. **Tutorial Mode:**
   - Step-by-step reverse parking instructions
   - On-screen angle indicator
   - Practice mode with relaxed constraints

---

**Date Implemented:** December 18, 2025  
**Files Modified:**
- `js/ParkingZone.js`
- `js/Game.js`
- `js/levels/level21.js`
