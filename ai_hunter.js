// Hunter AI helpers and debug renderer (separated for clarity)
(function(){
  // find platform by center x when possible
  window.findPlatformIndexAtX = function(x, w) {
    var cx = x + (w || 0) / 2;
    for (var i = 0; i < (window.g && g.plat ? g.plat.length : 0); i++) {
      var pl = g.plat[i];
      if (cx >= pl.x && cx <= pl.x + pl.w) return i;
    }
    return -1;
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
      if (!e._path || e._path.length === 0) continue;
      // draw path lines between platform centers
      ctx.strokeStyle = 'rgba(124,58,237,0.9)'; ctx.fillStyle = 'rgba(124,58,237,0.12)';
      ctx.beginPath();
      for (var j = 0; j < e._path.length; j++) {
        var pi = e._path[j];
        if (pi < 0 || pi >= g.plat.length) continue;
        var pl = g.plat[pi];
        if (!pl) continue;
        var cx = pl.x + pl.w / 2 - cam, cy = pl.y - 8;
        if (j === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      // draw nodes
      for (var j = 0; j < e._path.length; j++) {
        var pi = e._path[j]; 
        if (pi < 0 || pi >= g.plat.length) continue;
        var pl = g.plat[pi]; 
        if (!pl) continue;
        var cx = pl.x + pl.w / 2 - cam, cy = pl.y - 8;
        ctx.beginPath(); ctx.arc(cx, cy, j === 1 ? 6 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // draw line from hunter to next target if any
      if (e._path && e._path.length > 1) {
        var nextIdx = e._path[1];
        if (nextIdx >= 0 && nextIdx < g.plat.length) {
          var nextPl = g.plat[nextIdx]; 
          if (nextPl) {
            var hx = e.x + e.w / 2 - cam, hy = e.y + e.h / 2;
            var tx = nextPl.x + nextPl.w / 2 - cam, ty = nextPl.y - 8;
            ctx.strokeStyle = 'rgba(250,204,21,0.9)'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  };
})();
