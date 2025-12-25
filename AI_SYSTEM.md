# Hunter AI System - Grid-Based Pathfinding + Behavior Trees

## Overview
The hunter AI now uses a sophisticated combination of **Grid-Based A* Pathfinding** and **Behavior Trees** for intelligent enemy navigation and decision-making.

## System Components

### 1. Grid-Based Navigation
- **Grid Size**: 40x40 pixel cells overlay the game world
- **Cell Types**:
  - `0` = Blocked/Spikes (unwalkable)
  - `1` = Walkable platform surface
  - `2` = Air (jumpable)

#### Grid Functions
- `updateNavigationGrid()` - Updates grid based on current platforms (called every 10 frames)
- `worldToGrid()` - Converts world coordinates to grid coordinates
- `gridToWorld()` - Converts grid coordinates back to world position
- `isGridWalkable()` - Checks if a grid cell is safe to walk on
- `canGridJump()` - Determines if a jump between grid cells is possible

### 2. A* Pathfinding
The `findGridPath()` function implements A* algorithm with:
- **Walking neighbors**: Adjacent horizontal cells
- **Jump neighbors**: Cells within jump range (up to 6 cells horizontal, 4 up, 6 down)
- **Cost calculation**: Favors easier jumps (shorter distance, less climbing)
- **Heuristic**: Manhattan distance for efficient pathfinding

### 3. Behavior Tree System
Modular decision-making using composable nodes:

#### Node Types
- **Selector**: Returns success if ANY child succeeds (OR logic)
- **Sequence**: Returns success only if ALL children succeed (AND logic)
- **Condition**: Tests a boolean condition
- **Action**: Executes a behavior

#### Hunter Behavior Tree Structure
```
Selector (Priority-based)
├─ Sequence: Attack if close
│  ├─ Condition: Is player within 50px?
│  └─ Action: Set state to ATTACKING
├─ Sequence: Follow existing path
│  ├─ Condition: Does path exist?
│  └─ Action: Set state to FOLLOWING_PATH
├─ Sequence: Calculate new path
│  ├─ Condition: Needs recalculation?
│  └─ Action: Set state to CALCULATING_PATH
└─ Action: Idle/patrol (fallback)
```

### 4. AI States
The behavior tree manages these states:

1. **CALCULATING_PATH**
   - Runs grid-based A* from hunter to player
   - Stores resulting path in `_gridPath`
   - Transitions to FOLLOWING_PATH if successful

2. **FOLLOWING_PATH**
   - Follows waypoints in `_gridPath`
   - Moves horizontally toward next waypoint
   - Intelligently jumps when needed (target above or far)
   - Advances to next waypoint when close (<30px)
   - Switches to ATTACKING when path complete

3. **ATTACKING**
   - Direct pursuit of player
   - Increased speed multiplier (1.3x)
   - Aggressive jumping toward player
   - Recalculates path if player gets far (>200px)

4. **IDLE**
   - Applies friction to slow down
   - Fallback state when no action needed

## Performance Optimizations

- **Grid updates**: Only every 10 frames (reduces CPU usage)
- **Path recalculation**: Throttled with timer (30 frames between recalcs)
- **Jump validation**: Pre-computed during pathfinding
- **Grid bounds**: Limited to visible area + buffer zone

## Debug Visualization

Enable hunter debug mode to see:
- **Green lines**: Grid-based path with waypoint nodes
- **Yellow dashed line**: Current target vector
- **State text**: Current AI state above each hunter

Toggle via Settings → "Show Hunter Pathfinding Debug"

## Advantages Over Previous System

### Old Platform-Based System
- Limited to platform-to-platform jumps
- Could get stuck on complex terrain
- Required valid platform at exact location
- Path could break when platforms removed

### New Grid-Based System
✅ Smooth navigation through complex terrain
✅ Can plan multi-jump sequences
✅ Handles dynamic platform changes gracefully
✅ More natural movement (not locked to platforms)
✅ Better air control and mid-air corrections
✅ Hierarchical decision-making via behavior tree

## Technical Details

### Grid Resolution Trade-offs
- **Larger cells (40px)**: Faster pathfinding, less precision
- **Smaller cells**: More CPU intensive, smoother paths

Current 40px size balances performance and accuracy for the game's scale.

### Jump Mechanics
- **Max horizontal**: 6 grid cells (~240px)
- **Max vertical up**: 4 grid cells (~160px)
- **Max vertical down**: 6 grid cells (~240px)
- **Double jump**: Available for hunters, used intelligently

### Memory Footprint
- Grid recalculated periodically (not stored permanently)
- Each hunter stores:
  - Current path array (~5-20 waypoints)
  - Behavior tree reference (shared)
  - State variables (minimal)

## Future Enhancements

Possible improvements:
- Add more complex behaviors (flanking, retreat, group tactics)
- Implement squad-based behavior trees
- Add predictive aiming for ranged hunters
- Dynamic difficulty adjustment based on player skill
- Learning system that adapts to player patterns

## Usage Example

```javascript
// Hunter automatically uses the system when spawned
// Grid updates automatically in game loop
// Behavior tree runs every frame per hunter
// Debug rendering shows paths in real-time
```

The system is fully integrated and requires no manual intervention - hunters will automatically use grid-based pathfinding and the behavior tree for all their decision-making!
