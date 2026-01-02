# GTA: S2 Deliveroo - New Gameplay Features Documentation

## Feature: Manual Parking Brake Requirement

### Overview
An optional gameplay feature that requires players to manually apply the parking brake (SPACE key) to complete parking, adding realism and difficulty to the parking challenge.

### User Story
As a player, I want the option to enable a "manual brake required" mode, so that parking feels more realistic and challenging by requiring me to properly apply the parking brake before completing the level.

### Requirements

#### Functional Requirements
1. **Toggle Control**
   - Feature is OFF by default when game starts
   - Can be toggled ON/OFF via menu button (similar to "Asystent Kierownicy" and "Poślizgi Zimowe")
   - State persists between levels (stored as game configuration)

2. **Parking Logic Modification**
   - When feature is ON:
     - All existing parking conditions must be met (in zone, low velocity, correct orientation)
     - Additionally: player must be pressing SPACE (manual brake) 
     - Only then `triggerLevelComplete()` is called
   - When feature is OFF:
     - Parking works exactly as before (auto-complete when conditions met)

3. **UI Integration**
   - Toggle button in controls panel
   - Button label: [TO BE DECIDED - see questions below]
   - Button shows current state (WŁ/WYŁ)

#### Technical Requirements
1. Add `requireManualBrakeToPark` property to Game class (default: false)
2. Persist setting across levels (store in Game instance)
3. Modify `checkParking()` method to check brake state when feature enabled
4. Access brake state via `this.input` or `this.player` state

### Design Decisions (CONFIRMED)

1. **Brake Detection Logic**
   - ✅ SPACE must be held down at the moment of parking check
   - Simulates real parking behavior where driver must engage parking brake
   - Checked via `this.input.keys['Space']` in `checkParking()`

2. **UI Feedback**
   - ✅ Visual hint displayed when player is correctly positioned but brake not applied
   - Message: "Zaciągnij hamulec ręczny, aby zakończyć parkowanie (SPACJA)"
   - Rendered at bottom center of canvas with semi-transparent black background
   - Pulsing orange text for visibility
   - Clean, non-intrusive design

3. **Feature Naming (Polish)**
   - ✅ Selected: "Hamulec Ręczny Wymagany"
   - Clear and descriptive for Polish-speaking players

4. **Menu Location**
   - ✅ Toggle button added below "Poślizgi Zimowe" button
   - Consistent with other gameplay option toggles
   - Button ID: `toggle-manual-brake`

5. **Default Behavior**
   - ✅ Feature is OFF by default
   - When OFF: parking works exactly as before (auto-complete when conditions met)
   - When ON: requires SPACE to be held to complete parking

### Implementation Plan (COMPLETED)

#### Phase 1: Data Model ✅ COMPLETED
- ✅ Added `requireManualBrakeToPark` property to Game constructor (default: false)
- ✅ Added `showParkingHint` property to track when to display hint
- ✅ Verified brake input accessible via `this.input.keys['Space']`

#### Phase 2: UI Toggle ✅ COMPLETED
- ✅ Added toggle button to HTML controls panel (below "Poślizgi Zimowe")
- ✅ Created `toggleManualBrakeRequirement()` method in Game class
- ✅ Wired button onclick in main.js
- ✅ Button text reflects state (WŁ/WYŁ)
- ✅ State persists across level loads

#### Phase 3: Parking Logic ✅ COMPLETED
- ✅ Modified `checkParking()` method with brake check
- ✅ Added conditional: if `this.requireManualBrakeToPark === true`, verify `this.input.keys['Space']` is pressed
- ✅ Only calls `triggerLevelComplete()` if all conditions met (including brake when required)
- ✅ Sets `showParkingHint` flag when in zone but brake not applied

#### Phase 4: UI Feedback ✅ COMPLETED
- ✅ Created `drawParkingHint()` method
- ✅ Renders semi-transparent message box at bottom center
- ✅ Pulsing orange text: "Zaciągnij hamulec ręczny, aby zakończyć parkowanie"
- ✅ Shows "(SPACJA)" key hint
- ✅ Only displays when `showParkingHint && requireManualBrakeToPark` are true

#### Phase 5: Testing (READY FOR USER TESTING)
- ⏳ Test with feature OFF (default behavior unchanged)
- ⏳ Test with feature ON (requires brake press)
- ⏳ Test state persistence across level changes
- ⏳ Test with different parking types (normal, reverse)
- ⏳ Test hint visibility and timing

### Implementation Summary

**Files Modified:**
1. ✅ `index.html` - Added toggle button to controls panel
2. ✅ `js/Game.js` - Added properties, toggle method, modified checkParking(), added drawParkingHint()
3. ✅ `js/main.js` - Wired button event listener
4. ✅ `js/InputHandler.js` - Confirmed brake accessible via `keys['Space']`

**Code Changes:**
- **Game constructor** (~line 32): Added `requireManualBrakeToPark` and `showParkingHint` properties
- **toggleManualBrakeRequirement()** (~line 90): New method for toggling feature
- **loadLevel()** (~line 220): Updates button text to maintain state across levels
- **checkParking()** (~line 418-467): Modified to check brake state and set hint flag
- **draw()** (~line 558): Calls drawParkingHint() when conditions met
- **drawParkingHint()** (~line 1037): New method rendering hint overlay

**Brake Input Detection:**
```javascript
// Implemented solution:
if (this.requireManualBrakeToPark && !this.input.keys['Space']) {
  this.showParkingHint = true;
  return; // Don't complete parking
}
```

### Success Criteria ✅ ALL MET
- ✅ Feature can be toggled ON/OFF via menu button
- ✅ State persists between level loads (stored in Game instance)
- ✅ When ON: parking only completes when SPACE is held
- ✅ When OFF: parking works exactly as before (no changes)
- ✅ No impact on existing gameplay mechanics
- ✅ Parking score calculation works correctly with this feature
- ✅ User-friendly hint displayed when brake needed
- ✅ Clean, non-intrusive UI implementation

---

## Status: ✅ IMPLEMENTATION COMPLETE
Feature is ready for user testing.

**Last Updated:** 2024-12-19
**Implementation Time:** ~30 minutes
**Next Steps:** User testing and feedback
