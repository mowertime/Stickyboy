// Hunter AI helpers and debug renderer (separated for clarity)
(function(){
  // Grid-based pathfinding system
  var GRID_SIZE = 40; // Grid cell size in pixels
  var grid = null;
  var gridWidth = 0;
  var gridHeight = 0;
  var gridOffsetX = 0;
  
  // Initialize or update the navigation grid based on current platforms
  window.updateNavigationGrid = function(platforms, camX, worldW, worldH) {
    if (!platforms || platforms.length === 0) return;
    
    // Create grid bounds around visible area + buffer
    var minX = camX - 200;
    var maxX = camX + worldW + 400;
    gridOffsetX = minX;
    gridWidth = Math.ceil((maxX - minX) / GRID_SIZE);
    gridHeight = Math.ceil(worldH / GRID_SIZE);
    
    // Initialize grid (0 = blocked, 1 = walkable, 2 = air/jumpable)
    grid = [];
    for (var y = 0; y < gridHeight; y++) {
      grid[y] = [];
      for (var x = 0; x < gridWidth; x++) {
        grid[y][x] = 2; // Air by default
      }
    }
    
    // Mark platforms as walkable
    for (var i = 0; i < platforms.length; i++) {
      var pl = platforms[i];
      var gx1 = Math.floor((pl.x - gridOffsetX) / GRID_SIZE);
      var gx2 = Math.ceil((pl.x + pl.w - gridOffsetX) / GRID_SIZE);
      var gy = Math.floor(pl.y / GRID_SIZE);
      
      // Mark platform surface
      for (var x = Math.max(0, gx1); x < Math.min(gridWidth, gx2); x++) {
        if (gy >= 0 && gy < gridHeight) {
          grid[gy][x] = pl.spikes ? 0 : 1; // 1 = walkable, 0 = spike/blocked
          // Mark air above platform as jumpable
          if (gy > 0) grid[gy - 1][x] = 2;
        }
      }
    }
  };
  
  // Convert world position to grid coordinates
  window.worldToGrid = function(x, y) {
    return {
      gx: Math.floor((x - gridOffsetX) / GRID_SIZE),
      gy: Math.floor(y / GRID_SIZE)
    };
  };
  
  // Convert grid to world position (center of cell)
  window.gridToWorld = function(gx, gy) {
    return {
      x: gridOffsetX + gx * GRID_SIZE + GRID_SIZE / 2,
      y: gy * GRID_SIZE + GRID_SIZE / 2
    };
  };
  
  // Check if grid cell is valid and walkable
  window.isGridWalkable = function(gx, gy) {
    if (!grid || gx < 0 || gy < 0 || gx >= gridWidth || gy >= gridHeight) return false;
    return grid[gy][gx] === 1; // Only walkable cells
  };
  
  // Check if can jump from one grid cell to another
  window.canGridJump = function(fromGx, fromGy, toGx, toGy) {
    if (!grid) return false;
    var dx = Math.abs(toGx - fromGx);
    var dy = toGy - fromGy;
    
    // Max horizontal jump ~6 cells, max vertical jump ~4 cells up, ~6 down
    if (dx > 6) return false;
    if (dy > 6) return false; // Can fall further
    if (dy < -4) return false; // Can't jump too high
    
    // Target must be walkable
    return isGridWalkable(toGx, toGy);
  };
  
  // Grid-based A* pathfinding
  window.findGridPath = function(startX, startY, targetX, targetY) {
    if (!grid) return null;
    
    var start = worldToGrid(startX, startY);
    var target = worldToGrid(targetX, targetY);
    
    if (!isGridWalkable(start.gx, start.gy) || !isGridWalkable(target.gx, target.gy)) {
      return null;
    }
    
    function heuristic(gx, gy) {
      var dx = Math.abs(gx - target.gx);
      var dy = Math.abs(gy - target.gy);
      return dx + dy; // Manhattan distance
    }
    
    function key(gx, gy) { return gx + '_' + gy; }
    
    var openSet = [start];
    var cameFrom = {};
    var gScore = {};
    var fScore = {};
    
    gScore[key(start.gx, start.gy)] = 0;
    fScore[key(start.gx, start.gy)] = heuristic(start.gx, start.gy);
    
    while (openSet.length > 0) {
      // Find node with lowest fScore
      var currentIdx = 0;
      for (var i = 1; i < openSet.length; i++) {
        var currKey = key(openSet[i].gx, openSet[i].gy);
        var bestKey = key(openSet[currentIdx].gx, openSet[currentIdx].gy);
        if ((fScore[currKey] || Infinity) < (fScore[bestKey] || Infinity)) {
          currentIdx = i;
        }
      }
      
      var current = openSet.splice(currentIdx, 1)[0];
      
      if (current.gx === target.gx && current.gy === target.gy) {
        // Reconstruct path
        var path = [current];
        var curr = current;
        var currKey = key(curr.gx, curr.gy);
        while (cameFrom[currKey]) {
          curr = cameFrom[currKey];
          path.unshift(curr);
          currKey = key(curr.gx, curr.gy);
        }
        return path;
      }
      
      // Check neighbors (8-directional + jump arcs)
      var neighbors = [];
      
      // Walking neighbors
      for (var dx = -1; dx <= 1; dx++) {
        var ngx = current.gx + dx;
        var ngy = current.gy;
        if (isGridWalkable(ngx, ngy)) {
          neighbors.push({ gx: ngx, gy: ngy, cost: 1 });
        }
      }
      
      // Jump neighbors
      for (var dx = -6; dx <= 6; dx++) {
        for (var dy = -4; dy <= 6; dy++) {
          if (dx === 0 && dy === 0) continue;
          var ngx = current.gx + dx;
          var ngy = current.gy + dy;
          if (canGridJump(current.gx, current.gy, ngx, ngy)) {
            var jumpCost = 2 + Math.abs(dx) * 0.3 + Math.max(0, -dy) * 0.5; // Favor easier jumps
            neighbors.push({ gx: ngx, gy: ngy, cost: jumpCost });
          }
        }
      }
      
      for (var i = 0; i < neighbors.length; i++) {
        var neighbor = neighbors[i];
        var neighborKey = key(neighbor.gx, neighbor.gy);
        var currentKey = key(current.gx, current.gy);
        var tentativeG = (gScore[currentKey] || Infinity) + neighbor.cost;
        
        if (tentativeG < (gScore[neighborKey] || Infinity)) {
          cameFrom[neighborKey] = current;
          gScore[neighborKey] = tentativeG;
          fScore[neighborKey] = tentativeG + heuristic(neighbor.gx, neighbor.gy);
          
          // Add to open set if not already there
          var inOpen = false;
          for (var j = 0; j < openSet.length; j++) {
            if (openSet[j].gx === neighbor.gx && openSet[j].gy === neighbor.gy) {
              inOpen = true;
              break;
            }
          }
          if (!inOpen) {
            openSet.push({ gx: neighbor.gx, gy: neighbor.gy });
          }
        }
      }
    }
    
    return null; // No path found
  };
  
  // find platform by center x when possible
  window.findPlatformIndexAtX = function(x, w) {
    var cx = x + (w || 0) / 2;
    for (var i = 0; i < (window.g && g.plat ? g.plat.length : 0); i++) {
      var pl = g.plat[i];
      if (cx >= pl.x && cx <= pl.x + pl.w) return i;
    }
    return -1;
  };

  // Behavior Tree Node Types
  window.BehaviorTree = {
    // Selector: returns success if any child succeeds
    Selector: function(children) {
      return function(entity) {
        for (var i = 0; i < children.length; i++) {
          var result = children[i](entity);
          if (result === 'success') return 'success';
        }
        return 'failure';
      };
    },
    
    // Sequence: returns success only if all children succeed
    Sequence: function(children) {
      return function(entity) {
        for (var i = 0; i < children.length; i++) {
          var result = children[i](entity);
          if (result !== 'success') return result;
        }
        return 'success';
      };
    },
    
    // Condition node
    Condition: function(check) {
      return function(entity) {
        return check(entity) ? 'success' : 'failure';
      };
    },
    
    // Action node
    Action: function(action) {
      return function(entity) {
        return action(entity);
      };
    }
  };
  
  // Hunter Behavior Tree
  window.createHunterBehaviorTree = function() {
    var BT = window.BehaviorTree;
    
    return BT.Selector([
      // Priority 1: Attack if close
      BT.Sequence([
        BT.Condition(function(e) {
          if (!e._cachedPlayer) return false;
          var dx = Math.abs(e.x - e._cachedPlayer.x);
          var dy = Math.abs(e.y - e._cachedPlayer.y);
          return dx < 50 && dy < 30;
        }),
        BT.Action(function(e) {
          e._btState = 'ATTACKING';
          return 'success';
        })
      ]),
      
      // Priority 2: Follow path if exists
      BT.Sequence([
        BT.Condition(function(e) {
          return e._gridPath && e._gridPath.length > 1;
        }),
        BT.Action(function(e) {
          e._btState = 'FOLLOWING_PATH';
          return 'success';
        })
      ]),
      
      // Priority 3: Calculate new path
      BT.Sequence([
        BT.Condition(function(e) {
          return e._cachedPlayer && (!e._pathRecalcTimer || e._pathRecalcTimer <= 0);
        }),
        BT.Action(function(e) {
          e._btState = 'CALCULATING_PATH';
          e._pathRecalcTimer = 30; // Recalc every 30 frames
          return 'success';
        })
      ]),
      
      // Priority 4: Idle/patrol
      BT.Action(function(e) {
        e._btState = 'IDLE';
        return 'success';
      })
    ]);
  };

  window.platformGap = function(a, b) {
    if (!a || !b) return 9999;
    if (b.x > a.x) return b.x - (a.x + a.w);
    return a.x - (b.x + b.w);
  };

  window.canJump = function(from, to) {
    if (!from || !to) return false;
    var gap = platformGap(from, to);
    var maxHoriz = 240;
    var maxDrop = 160;
    if (gap > maxHoriz) return false;
    if (to.y - from.y > maxDrop) return false;
    return true;
  };

  window.findPlatformPath = function(startIdx, targetIdx) {
    // Use A* search with a scoring system that favors shorter paths and safer jumps
    if (!window.g || !g.plat || startIdx === -1 || targetIdx === -1) return null;
    if (startIdx === targetIdx) return [startIdx];

    function centerOf(pl) { return { x: pl.x + pl.w / 2, y: pl.y }; }
    function heuristic(aIdx, bIdx) {
      if (aIdx < 0 || aIdx >= g.plat.length || bIdx < 0 || bIdx >= g.plat.length) return Infinity;
      var a = centerOf(g.plat[aIdx]);
      var b = centerOf(g.plat[bIdx]);
      var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy);
    }

    // cost to move from platform a -> b: base 1 + gap penalty + climb penalty
    function moveCost(aIdx, bIdx) {
      var a = g.plat[aIdx], b = g.plat[bIdx];
      var gap = platformGap(a, b); var climb = Math.max(0, b.y - a.y);
      // reward short hops: gap penalty scaled, climb penalty scaled
      return 1 + (gap / 120) + (climb / 180);
    }

    // A* implementation (arrays suffice for small platform counts)
    var open = [startIdx];
    var cameFrom = {};
    var gScore = {}; gScore[startIdx] = 0;
    var fScore = {}; fScore[startIdx] = heuristic(startIdx, targetIdx);

    while (open.length) {
      // pick node with lowest fScore
      var bestIdx = 0; for (var k = 1; k < open.length; k++) { if ((fScore[open[k]] || Infinity) < (fScore[open[bestIdx]] || Infinity)) bestIdx = k; }
      var current = open.splice(bestIdx, 1)[0];
      if (current === targetIdx) {
        var path = [current]; var cur = current; while (cameFrom[cur] !== undefined) { cur = cameFrom[cur]; path.unshift(cur); }
        return path;
      }
      // neighbors: any platform that can be reached by a valid jump (in either direction)
      var curPl = g.plat[current];
      for (var j = 0; j < g.plat.length; j++) {
        if (j === current) continue;
        var nxtPl = g.plat[j];
        if (!(canJump(curPl, nxtPl) || canJump(nxtPl, curPl))) continue;
        var tentativeG = (gScore[current] || Infinity) + moveCost(current, j);
        if (tentativeG < (gScore[j] || Infinity)) {
          cameFrom[j] = current;
          gScore[j] = tentativeG;
          fScore[j] = tentativeG + heuristic(j, targetIdx);
          if (open.indexOf(j) === -1) open.push(j);
        }
      }
    }
    return null;
  };

  // returns {dir: -1|1, next: platformIndexOrNull}
  window.findHunterPath = function(hunter, player, platforms) {
    if (!hunter || !player || !g || !g.plat) return { dir: 0, next: null };
    var dx = player.x - hunter.x;
    var dir = dx > 0 ? 1 : -1;
    var hIdx = findPlatformIndexAtX(hunter.x, hunter.w);
    var pIdx = findPlatformIndexAtX(player.x, player.w);
    if (hIdx !== -1 && hIdx === pIdx) return { dir: dir, next: null };
    var path = findPlatformPath(hIdx, pIdx);
    if (path && path.length > 1) {
      var nextIdx = path[1];
      var curPl = g.plat[hIdx] || null;
      var nxtPl = g.plat[nextIdx];
      if (!curPl) return { dir: dir, next: nextIdx };
      var targetX = (nxtPl.x + nxtPl.w / 2);
      return { dir: targetX > hunter.x ? 1 : -1, next: nextIdx };
    }
    var dist = Math.sqrt(dx * dx + (player.y - hunter.y) * (player.y - hunter.y));
    if (dist < 420) return { dir: dir, next: null };
    return { dir: dir, next: null };
  };

  // FSM-based optimal pathfinding considering jump capability
  window.findOptimalHunterPath = function(startIdx, targetIdx, platforms, jumpCount) {
    if (!platforms || startIdx === -1 || targetIdx === -1) return null;
    if (startIdx === targetIdx) return [startIdx];
    
    // Use Dijkstra with cost favoring paths reachable with available jumps
    var visited = {};
    var distances = {};
    var previous = {};
    
    for (var i = 0; i < platforms.length; i++) {
      distances[i] = Infinity;
    }
    distances[startIdx] = 0;
    
    for (var iteration = 0; iteration < platforms.length; iteration++) {
      var minDist = Infinity;
      var current = -1;
      
      for (var i = 0; i < platforms.length; i++) {
        if (!visited[i] && distances[i] < minDist) {
          minDist = distances[i];
          current = i;
        }
      }
      
      if (current === -1 || current === targetIdx) break;
      visited[current] = true;
      
      // Check reachable neighbors
      var curPl = platforms[current];
      for (var j = 0; j < platforms.length; j++) {
        if (visited[j]) continue;
        var nxtPl = platforms[j];
        
        // Can reach if single jump or double jump is available
        if (canJump(curPl, nxtPl) || canJump(nxtPl, curPl)) {
          var gap = platformGap(curPl, nxtPl);
          var climb = Math.max(0, nxtPl.y - curPl.y);
          var cost = 1 + (gap / 100) + (climb / 150); // Favor easier jumps
          
          if (distances[current] + cost < distances[j]) {
            distances[j] = distances[current] + cost;
            previous[j] = current;
          }
        }
      }
    }
    
    // Reconstruct path
    if (distances[targetIdx] === Infinity) return null;
    var path = [targetIdx];
    var cur = targetIdx;
    while (previous[cur] !== undefined) {
      cur = previous[cur];
      path.unshift(cur);
    }
    
    return path;
  };

  // draw path debug for all hunters (ctx is main canvas context)
  window.renderHunterDebug = function(ctx, g, cam) {
    if (!ctx || !g || !g.en) return;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    
    for (var i = 0; i < g.en.length; i++) {
      var e = g.en[i];
      if (e.dead || e.type !== 'hunter') continue;
      
      // Draw grid path if it exists
      if (e._gridPath && e._gridPath.length > 0) {
        ctx.strokeStyle = 'rgba(34,197,94,0.8)';
        ctx.fillStyle = 'rgba(34,197,94,0.5)';
        ctx.beginPath();
        
        for (var j = 0; j < e._gridPath.length; j++) {
          var cell = e._gridPath[j];
          var worldPos = gridToWorld(cell.gx, cell.gy);
          var wx = worldPos.x - cam;
          var wy = worldPos.y;
          
          if (j === 0) {
            ctx.moveTo(wx, wy);
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
        
        // Draw path nodes
        for (var j = 0; j < e._gridPath.length; j++) {
          var cell = e._gridPath[j];
          var worldPos = gridToWorld(cell.gx, cell.gy);
          var wx = worldPos.x - cam;
          var wy = worldPos.y;
          
          ctx.beginPath();
          ctx.arc(wx, wy, j === 0 ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw line from hunter to current target
      if (e._currentTarget) {
        var hx = e.x + e.w / 2 - cam;
        var hy = e.y + e.h / 2;
        var tx = e._currentTarget.x - cam;
        var ty = e._currentTarget.y;
        
        ctx.strokeStyle = 'rgba(250,204,21,0.9)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Draw state text
      if (e._btState) {
        var textX = e.x + e.w / 2 - cam;
        var textY = e.y - 10;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(e._btState, textX, textY);
      }
    }
    ctx.restore();
  };
})();
