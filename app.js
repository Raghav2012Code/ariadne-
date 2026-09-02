/* Ariadne — Maze Generator & Search Visualizer
   Zero-deps, ES6+, DOM Grid + Async Animation Engine
*/

(() => {
  'use strict';

  // ---------- Config ----------
  const GRID_PRESETS = {
    small: { rows: 15, cols: 25 },
    medium: { rows: 25, cols: 45 },
    large: { rows: 35, cols: 65 }
  };
  const SPEEDS = [
    { label: 'Instant', delay: 0 },
    { label: 'Medium', delay: 20 },
    { label: 'Fast', delay: 5 },
    { label: 'Slow', delay: 50 }
  ];
  // map slider 0..3 -> index in SPEEDS: slider 0=Slow(3),1=Medium(1),2=Fast(2),3=Instant(0) - we map directly
  const SLIDER_MAP = [3, 1, 2, 0];

  // ---------- DOM ----------
  const gridEl = document.getElementById('grid');
  const algoSelect = document.getElementById('algoSelect');
  const mazeSelect = document.getElementById('mazeSelect');
  const gridSizeSelect = document.getElementById('gridSizeSelect');
  const speedRange = document.getElementById('speedRange');
  const speedLabel = document.getElementById('speedLabel');
  const diagonalToggle = document.getElementById('diagonalToggle');
  const weightToggle = document.getElementById('weightToggle');
  const visualizeBtn = document.getElementById('visualizeBtn');
  const visualizeLabel = document.getElementById('visualizeLabel');
  const genMazeBtn = document.getElementById('genMazeBtn');
  const clearPathBtn = document.getElementById('clearPathBtn');
  const clearBoardBtn = document.getElementById('clearBoardBtn');
  const resetBtn = document.getElementById('resetBtn');
  const metricVisited = document.getElementById('metricVisited');
  const metricPath = document.getElementById('metricPath');
  const metricTime = document.getElementById('metricTime');
  const statusBadge = document.getElementById('statusBadge');
  const toastEl = document.getElementById('toast');

  // ---------- State ----------
  let rows = GRID_PRESETS.medium.rows;
  let cols = GRID_PRESETS.medium.cols;
  let grid = []; // 2D array of nodes
  let start = { r: 12, c: 5 };
  let target = { r: 12, c: 39 };
  let isVisualizing = false;
  let abortToken = 0;
  let speedIdx = 1; // medium
  let draggedType = null; // 'start' | 'target'
  let mouseDown = false;
  let mouseButton = 0; // 0 left, 2 right
  let shiftDown = false;
  let animationVisited = 0;
  let pendingInstantBatch = [];

  // ---------- Utils ----------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (n) => Math.floor(Math.random() * n);
  const choice = (arr) => arr[rand(arr.length)];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function getDelay() {
    const mapped = SLIDER_MAP[parseInt(speedRange.value, 10)] ?? 1;
    return SPEEDS[mapped].delay;
  }
  function getSpeedLabel() {
    const mapped = SLIDER_MAP[parseInt(speedRange.value, 10)] ?? 1;
    return SPEEDS[mapped].label;
  }
  function setStatus(text, kind = 'idle') {
    statusBadge.textContent = text;
    statusBadge.className = 'badge badge-' + kind;
  }
  function toast(msg, kind = '') {
    toastEl.textContent = msg;
    toastEl.className = 'toast ' + kind;
    toastEl.classList.remove('hidden');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.add('hidden'), 2400);
  }
  function updateMetrics(visited, pathLen, timeMs) {
    metricVisited.textContent = visited;
    metricPath.textContent = pathLen == null ? '—' : (typeof pathLen === 'number' ? String(pathLen) : pathLen);
    metricTime.textContent = timeMs == null ? '0.00 ms' : `${timeMs.toFixed(2)} ms`;
  }
  function isAbort(token) { return token !== abortToken; }

  // ---------- MinHeap ----------
  class MinHeap {
    constructor(compare) {
      this.a = [];
      this.compare = compare;
    }
    size() { return this.a.length; }
    isEmpty() { return this.a.length === 0; }
    push(v) {
      this.a.push(v);
      this._up(this.a.length - 1);
    }
    pop() {
      if (this.a.length === 0) return undefined;
      const top = this.a[0];
      const last = this.a.pop();
      if (this.a.length) { this.a[0] = last; this._down(0); }
      return top;
    }
    _up(i) {
      const a = this.a, cmp = this.compare;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (cmp(a[i], a[p]) >= 0) break;
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
      }
    }
    _down(i) {
      const a = this.a, cmp = this.compare;
      const n = a.length;
      while (true) {
        let s = i;
        const l = i * 2 + 1, r = l + 1;
        if (l < n && cmp(a[l], a[s]) < 0) s = l;
        if (r < n && cmp(a[r], a[s]) < 0) s = r;
        if (s === i) break;
        [a[i], a[s]] = [a[s], a[i]];
        i = s;
      }
    }
  }

  // ---------- Grid Model ----------
  function createNode(r, c) {
    return {
      r, c,
      type: 'empty', // empty | wall | weight | start | target
      state: 'unvisited', // unvisited | frontier | visited | path
      g: Infinity, h: 0, f: Infinity,
      parent: null,
      el: null
    };
  }

  function initGrid(preset = 'medium') {
    const p = GRID_PRESETS[preset] || GRID_PRESETS.medium;
    rows = p.rows; cols = p.cols;
    start = { r: Math.floor(rows / 2), c: 5 };
    target = { r: Math.floor(rows / 2), c: cols - 6 };
    grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => createNode(r, c)));
    grid[start.r][start.c].type = 'start';
    grid[target.r][target.c].type = 'target';
    abortToken++;
    renderGrid();
    setStatus('Idle', 'idle');
    updateMetrics(0, '—', 0);
    updateVisualizeLabel();
  }

  function renderGrid() {
    gridEl.style.setProperty('--cols', cols);
    gridEl.style.setProperty('--rows', rows);
    gridEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const node = grid[r][c];
        const div = document.createElement('div');
        div.className = 'cell';
        div.dataset.r = r;
        div.dataset.c = c;
        div.setAttribute('role', 'gridcell');
        node.el = div;
        syncCellClass(node);
        frag.appendChild(div);
      }
    }
    gridEl.appendChild(frag);
  }

  function syncCellClass(node) {
    const el = node.el;
    if (!el) return;
    el.className = 'cell';
    // type
    if (node.type === 'wall') el.classList.add('wall');
    else if (node.type === 'weight') el.classList.add('weight');
    // state - but start/target override visual
    if (node.state === 'visited') el.classList.add('visited');
    else if (node.state === 'frontier') el.classList.add('frontier');
    else if (node.state === 'path') el.classList.add('path');
    // anchors on top
    if (node.r === start.r && node.c === start.c) el.classList.add('start');
    if (node.r === target.r && node.c === target.c) el.classList.add('target');
    // visited alt for stripe
    if (node.state === 'visited' && (node.r + node.c) % 2 === 0) el.classList.add('visited-alt');
  }

  function syncAll() {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) syncCellClass(grid[r][c]);
  }

  function clearPathState() {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const n = grid[r][c];
      if (n.state === 'visited' || n.state === 'frontier' || n.state === 'path') {
        n.state = 'unvisited';
        n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null;
      }
    }
    syncAll();
    updateMetrics(0, '—', 0);
    setStatus('Idle', 'idle');
  }

  function clearBoard() {
    if (isVisualizing) return;
    abortToken++;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const n = grid[r][c];
      n.type = 'empty';
      n.state = 'unvisited';
      n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null;
    }
    grid[start.r][start.c].type = 'start';
    grid[target.r][target.c].type = 'target';
    syncAll();
    updateMetrics(0, '—', 0);
    setStatus('Idle', 'idle');
  }

  function resetDefault() {
    if (isVisualizing) abortToken++;
    isVisualizing = false;
    const preset = gridSizeSelect.value;
    initGrid(preset);
    setControlsEnabled(true);
  }

  // ---------- Neighbors & Heuristic ----------
  function heuristic(a, b) {
    const dx = Math.abs(a.r - b.r);
    const dy = Math.abs(a.c - b.c);
    if (diagonalToggle.checked) {
      // Chebyshev for 8-dir, Euclidean alternative: Math.hypot(dx,dy)
      // Use max for fewer overestimates with uniform cost
      return Math.max(dx, dy);
    }
    return dx + dy; // Manhattan
  }

  function getNeighbors(node) {
    const dirs4 = [[-1,0],[1,0],[0,-1],[0,1]];
    const dirs8 = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    const dirs = diagonalToggle.checked ? dirs8 : dirs4;
    const res = [];
    for (const [dr, dc] of dirs) {
      const nr = node.r + dr, nc = node.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nb = grid[nr][nc];
      if (nb.type === 'wall') continue;
      // prevent cutting corner through walls diagonally
      if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
        const adj1 = grid[node.r + dr]?.[node.c];
        const adj2 = grid[node.r]?.[node.c + dc];
        if (adj1 && adj1.type === 'wall' && adj2 && adj2.type === 'wall') continue;
        if (adj1 && adj1.type === 'wall' && adj2 && adj2.type === 'wall') continue;
      }
      res.push(nb);
    }
    return res;
  }

  function nodeCost(node) {
    if (node.type === 'weight') return 5;
    return 1;
  }

  function isTerminal(node) {
    return node.r === target.r && node.c === target.c;
  }

  // ---------- Animation helpers ----------
  async function maybeDelay(token) {
    const d = getDelay();
    if (d === 0) return;
    await sleep(d);
    if (isAbort(token)) throw new Error('aborted');
  }

  function markVisited(node, token, visitedCountRef) {
    if (node.r === start.r && node.c === start.c) return;
    if (node.r === target.r && node.c === target.c) return;
    if (node.state === 'visited') return;
    node.state = 'visited';
    if (getDelay() === 0) pendingInstantBatch.push(node);
    else syncCellClass(node);
    visitedCountRef.count++;
    metricVisited.textContent = visitedCountRef.count;
  }
  function markFrontier(node, token) {
    if (node.r === start.r && node.c === start.c) return;
    if (node.r === target.r && node.c === target.c) return;
    if (node.state !== 'unvisited') return;
    node.state = 'frontier';
    if (getDelay() === 0) pendingInstantBatch.push(node);
    else syncCellClass(node);
  }
  function flushInstantBatch() {
    if (pendingInstantBatch.length === 0) return;
    for (const n of pendingInstantBatch) syncCellClass(n);
    pendingInstantBatch = [];
  }

  async function animatePath(path, token, totalWeight) {
    if (!path || path.length === 0) return;
    const d = getDelay();
    if (d === 0) {
      for (const n of path) { n.state = 'path'; }
      // keep start/target on top
      syncAll();
      return;
    }
    for (let i = 0; i < path.length; i++) {
      if (isAbort(token)) throw new Error('aborted');
      const n = path[i];
      if (n.r === start.r && n.c === start.c) continue;
      if (n.r === target.r && n.c === target.c) continue;
      n.state = 'path';
      syncCellClass(n);
      await sleep(Math.max(6, d * 1.2));
    }
  }

  function reconstructPath(endNode) {
    const path = [];
    let cur = endNode;
    let weight = 0;
    while (cur) {
      path.push(cur);
      weight += nodeCost(cur);
      cur = cur.parent;
    }
    path.reverse();
    return { path, weight: weight - nodeCost(grid[start.r][start.c]) }; // exclude start cost
  }

  // ---------- Pathfinding Algorithms ----------
  async function runBFS(token, visitedCountRef) {
    const startNode = grid[start.r][start.c];
    const queue = [startNode];
    const visited = new Set([`${startNode.r},${startNode.c}`]);
    startNode.g = 0; startNode.parent = null;
    markFrontier(startNode, token);

    while (queue.length) {
      if (isAbort(token)) throw new Error('aborted');
      const cur = queue.shift();
      if (cur.state === 'frontier') cur.state = 'unvisited'; // will become visited
      if (cur.r !== start.r || cur.c !== start.c) markVisited(cur, token, visitedCountRef);
      if (isTerminal(cur)) return cur;
      if (getDelay() !== 0) await maybeDelay(token);
      for (const nb of getNeighbors(cur)) {
        const key = `${nb.r},${nb.c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        nb.parent = cur;
        nb.g = cur.g + 1;
        markFrontier(nb, token);
        queue.push(nb);
      }
    }
    return null;
  }

  async function runDFS(token, visitedCountRef) {
    const startNode = grid[start.r][start.c];
    const stack = [startNode];
    const visited = new Set();
    startNode.parent = null;

    while (stack.length) {
      if (isAbort(token)) throw new Error('aborted');
      const cur = stack.pop();
      const key = `${cur.r},${cur.c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (cur.r !== start.r || cur.c !== start.c) markVisited(cur, token, visitedCountRef);
      if (isTerminal(cur)) return cur;
      if (getDelay() !== 0) await maybeDelay(token);
      const neigh = getNeighbors(cur);
      // shuffle for more interesting DFS? keep deterministic but reverse for stack
      for (let i = neigh.length - 1; i >= 0; i--) {
        const nb = neigh[i];
        const k = `${nb.r},${nb.c}`;
        if (visited.has(k)) continue;
        // avoid re-adding if already in stack as frontier
        if (nb.parent == null || nb.parent === cur) {
          // only set parent if not visited as frontier? DFS tree
          if (!visited.has(k)) {
            nb.parent = cur;
            markFrontier(nb, token);
            stack.push(nb);
          }
        }
      }
    }
    return null;
  }

  async function runDijkstra(token, visitedCountRef) {
    const startNode = grid[start.r][start.c];
    // reset costs
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const n=grid[r][c]; n.g=Infinity; n.f=Infinity; n.parent=null; }
    startNode.g = 0; startNode.f = 0;
    const heap = new MinHeap((a, b) => a.g - b.g);
    heap.push(startNode);
    const closed = new Set();

    while (!heap.isEmpty()) {
      if (isAbort(token)) throw new Error('aborted');
      const cur = heap.pop();
      const key = `${cur.r},${cur.c}`;
      if (closed.has(key)) continue;
      closed.add(key);
      if (cur.r !== start.r || cur.c !== start.c) markVisited(cur, token, visitedCountRef);
      if (isTerminal(cur)) return cur;
      if (getDelay() !== 0) await maybeDelay(token);
      for (const nb of getNeighbors(cur)) {
        const nk = `${nb.r},${nb.c}`;
        if (closed.has(nk)) continue;
        const alt = cur.g + nodeCost(nb) * (diagonalToggle.checked && Math.abs(nb.r - cur.r)===1 && Math.abs(nb.c - cur.c)===1 ? Math.SQRT2 : 1);
        if (alt < nb.g) {
          nb.g = alt;
          nb.f = alt;
          nb.parent = cur;
          markFrontier(nb, token);
          heap.push(nb);
        }
      }
    }
    return null;
  }

  async function runAStar(token, visitedCountRef) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const n=grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; }
    const startNode = grid[start.r][start.c];
    const targetNode = grid[target.r][target.c];
    startNode.g = 0;
    startNode.h = heuristic(startNode, targetNode);
    startNode.f = startNode.h;
    const heap = new MinHeap((a, b) => a.f - b.f);
    heap.push(startNode);
    const closed = new Set();

    while (!heap.isEmpty()) {
      if (isAbort(token)) throw new Error('aborted');
      const cur = heap.pop();
      const key = `${cur.r},${cur.c}`;
      if (closed.has(key)) continue;
      closed.add(key);
      if (cur.r !== start.r || cur.c !== start.c) markVisited(cur, token, visitedCountRef);
      if (isTerminal(cur)) return cur;
      if (getDelay() !== 0) await maybeDelay(token);
      for (const nb of getNeighbors(cur)) {
        const nk = `${nb.r},${nb.c}`;
        if (closed.has(nk)) continue;
        const moveCost = nodeCost(nb) * (diagonalToggle.checked && Math.abs(nb.r - cur.r)===1 && Math.abs(nb.c - cur.c)===1 ? Math.SQRT2 : 1);
        const tentativeG = cur.g + moveCost;
        if (tentativeG < nb.g) {
          nb.parent = cur;
          nb.g = tentativeG;
          nb.h = heuristic(nb, targetNode);
          nb.f = nb.g + nb.h;
          markFrontier(nb, token);
          heap.push(nb);
        }
      }
    }
    return null;
  }

  async function runGreedy(token, visitedCountRef) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const n=grid[r][c]; n.g=0; n.h=0; n.f=Infinity; n.parent=null; }
    const startNode = grid[start.r][start.c];
    const targetNode = grid[target.r][target.c];
    startNode.h = heuristic(startNode, targetNode);
    startNode.f = startNode.h;
    const heap = new MinHeap((a, b) => a.f - b.f);
    heap.push(startNode);
    const visited = new Set();

    while (!heap.isEmpty()) {
      if (isAbort(token)) throw new Error('aborted');
      const cur = heap.pop();
      const key = `${cur.r},${cur.c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (cur.r !== start.r || cur.c !== start.c) markVisited(cur, token, visitedCountRef);
      if (isTerminal(cur)) return cur;
      if (getDelay() !== 0) await maybeDelay(token);
      for (const nb of getNeighbors(cur)) {
        const nk = `${nb.r},${nb.c}`;
        if (visited.has(nk)) continue;
        if (nb.parent) continue; // greedy: first parent wins to show rapid behavior
        nb.parent = cur;
        nb.h = heuristic(nb, targetNode);
        nb.f = nb.h;
        markFrontier(nb, token);
        heap.push(nb);
      }
    }
    return null;
  }

  const ALGO_RUNNERS = {
    bfs: runBFS,
    dfs: runDFS,
    dijkstra: runDijkstra,
    astar: runAStar,
    greedy: runGreedy
  };

  // ---------- Maze Generators ----------
  async function generateBacktracking(token) {
    abortToken = token;
    // fill walls
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const n = grid[r][c];
      n.type = 'wall'; n.state='unvisited'; n.parent=null;
    }
    grid[start.r][start.c].type='start';
    grid[target.r][target.c].type='target';
    syncAll();

    // carve using stack on odd cells for perfect maze
    // initialize grid to walls, then carve passages at odd coords
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c].type='wall';
    const carve = (r,c) => {
      grid[r][c].type='empty';
      if (getDelay()===0) pendingInstantBatch.push(grid[r][c]); else syncCellClass(grid[r][c]);
    };
    // ensure odd dimensions for carving; we adapt: work on logical cells where step=2
    const stack = [];
    const sr = start.r %2===0 ? start.r+1 : start.r;
    const sc = start.c %2===0 ? start.c+1 : start.c;
    const startCarve = { r: clamp(sr,1,rows-2), c: clamp(sc,1,cols-2) };
    carve(startCarve.r, startCarve.c);
    stack.push(startCarve);
    const visitedMaze = new Set([`${startCarve.r},${startCarve.c}`]);

    const dirs = [[-2,0],[2,0],[0,-2],[0,2]];
    let steps=0;
    while (stack.length) {
      if (isAbort(token)) throw new Error('aborted');
      const cur = stack[stack.length-1];
      const neighbors = [];
      for (const [dr,dc] of dirs) {
        const nr = cur.r + dr, nc = cur.c + dc;
        if (nr<=0 || nr>=rows-1 || nc<=0 || nc>=cols-1) continue;
        const key=`${nr},${nc}`;
        if (visitedMaze.has(key)) continue;
        neighbors.push({r:nr,c:nc, dr,dc});
      }
      if (neighbors.length===0) { stack.pop(); continue; }
      const nxt = choice(neighbors);
      visitedMaze.add(`${nxt.r},${nxt.c}`);
      // knock wall between
      carve(cur.r + nxt.dr/2, cur.c + nxt.dc/2);
      carve(nxt.r, nxt.c);
      stack.push({r:nxt.r,c:nxt.c});
      steps++;
      if (getDelay()!==0 && steps % 3===0) await sleep(getDelay());
      else if (getDelay()===0 && steps % 40===0) flushInstantBatch();
    }
    // ensure start/target are open plus adjacent
    for (const p of [start, target]) {
      for (let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++){
        const nr=p.r+dr, nc=p.c+dc;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols) if(grid[nr][nc].type==='wall'){ /* keep border walls */ }
      }
      grid[p.r][p.c].type = p===start ? 'start':'target';
      // open immediate neighbors if walled off
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=p.r+dr, nc=p.c+dc;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols && grid[nr][nc].type==='wall'){
          // 30% chance to open to ensure connectivity
          if(Math.random()<0.9) {grid[nr][nc].type='empty'; syncCellClass(grid[nr][nc]);}
        }
      }
    }
    flushInstantBatch();
    syncAll();
  }

  async function generatePrims(token) {
    for (let r=0; r<rows; r++) for(let c=0;c<cols;c++){grid[r][c].type='wall'; grid[r][c].state='unvisited';}
    syncAll();
    const sr = clamp(start.r,1,rows-2), sc = clamp(start.c,1,cols-2);
    const startCell = {r: sr - sr%2 ===0? sr-1:sr, c: sc - sc%2===0? sc-1:sc};
    // normalize to odd
    let cr = start.r %2===0? start.r+1:start.r;
    let cc = start.c %2===0? start.c+1:start.c;
    cr = clamp(cr,1,rows-2); cc = clamp(cc,1,cols-2);
    grid[cr][cc].type='empty';
    syncCellClass(grid[cr][cc]);
    const frontier = [];
    const addFrontier = (r,c, fromR, fromC) => {
      if(r<=0||r>=rows-1||c<=0||c>=cols-1) return;
      if(grid[r][c].type!=='wall') return;
      frontier.push({r,c, fromR, fromC});
      // visual frontier temporary? not needed
    };
    const dirs=[[ -2,0],[2,0],[0,-2],[0,2]];
    for(const [dr,dc] of dirs) addFrontier(cr+dr, cc+dc, cr,cc);
    let iter=0;
    while(frontier.length){
      if(isAbort(token)) throw new Error('aborted');
      const idx = rand(frontier.length);
      const cur = frontier.splice(idx,1)[0];
      if(grid[cur.r][cur.c].type!=='wall') continue;
      // connect
      const wallR = (cur.r + cur.fromR)/2, wallC = (cur.c + cur.fromC)/2;
      grid[wallR][wallC].type='empty'; syncCellClass(grid[wallR][wallC]);
      grid[cur.r][cur.c].type='empty'; syncCellClass(grid[cur.r][cur.c]);
      for(const [dr,dc] of dirs) addFrontier(cur.r+dr, cur.c+dc, cur.r, cur.c);
      iter++;
      if(getDelay()!==0){
        if(iter%4===0) await sleep(getDelay());
      } else if(iter%30===0) { /* batched */ }
    }
    // open start/target
    grid[start.r][start.c].type='start';
    grid[target.r][target.c].type='target';
    // open neighbors near anchors
    for(const p of [start,target]){
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=p.r+dr,nc=p.c+dc;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols && grid[nr][nc].type==='wall'){
          if(Math.random()<0.7){grid[nr][nc].type='empty'; syncCellClass(grid[nr][nc]);}
        }
      }
    }
    flushInstantBatch();
    syncAll();
  }

  async function generateDivision(token, r0=0, c0=0, r1=rows, c1=cols, depth=0){
    // initial call fills empty and builds walls recursively
    if(depth===0){
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){grid[r][c].type='empty'; grid[r][c].state='unvisited';}
      // outer border
      for(let r=0;r<rows;r++){grid[r][0].type='wall'; grid[r][cols-1].type='wall';}
      for(let c=0;c<cols;c++){grid[0][c].type='wall'; grid[rows-1][c].type='wall';}
      grid[start.r][start.c].type='start';
      grid[target.r][target.c].type='target';
      syncAll();
      if(getDelay()!==0) await sleep(getDelay()*2);
      await generateDivision(token, 1,1, rows-1, cols-1, 1);
      flushInstantBatch(); syncAll();
      return;
    }
    if(isAbort(token)) throw new Error('aborted');
    const height = r1 - r0;
    const width  = c1 - c0;
    if(height < 3 || width < 3) return;
    const horizontal = height > width ? true : width > height ? false : Math.random() < 0.5;
    if(horizontal){
      const r = r0 + 1 + rand(height - 2);
      // ensure wall row is not on start/target row if possible; but allow
      const passage = c0 + rand(width);
      for(let c=c0;c<c1;c++){
        if(c===passage) continue;
        const n=grid[r][c];
        if((n.r===start.r&&n.c===start.c)||(n.r===target.r&&n.c===target.c)) continue;
        n.type='wall';
        if(getDelay()===0) pendingInstantBatch.push(n); else syncCellClass(n);
      }
      if(getDelay()!==0) await sleep(getDelay());
      await generateDivision(token, r0,c0, r,c1, depth+1);
      await generateDivision(token, r+1,c0, r1,c1, depth+1);
    } else {
      const c = c0 + 1 + rand(width - 2);
      const passage = r0 + rand(height);
      for(let r=r0;r<r1;r++){
        if(r===passage) continue;
        const n=grid[r][c];
        if((n.r===start.r&&n.c===start.c)||(n.r===target.r&&n.c===target.c)) continue;
        n.type='wall';
        if(getDelay()===0) pendingInstantBatch.push(n); else syncCellClass(n);
      }
      if(getDelay()!==0) await sleep(getDelay());
      await generateDivision(token, r0,c0, r1,c, depth+1);
      await generateDivision(token, r0,c+1, r1,c1, depth+1);
    }
    if(depth===1) flushInstantBatch();
  }

  async function generateRandomClutter(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      if((r===start.r&&c===start.c)||(r===target.r&&c===target.c)) continue;
      // keep border open-ish
      grid[r][c].type='empty';
      grid[r][c].state='unvisited';
    }
    syncAll();
    const protect = (r,c) => Math.abs(r-start.r)<=2 && Math.abs(c-start.c)<=2 || Math.abs(r-target.r)<=2 && Math.abs(c-target.c)<=2;
    let placed=0;
    const total = Math.floor(rows*cols*0.35);
    // sprinkle walls in clusters for more natural look
    const clusters = Math.floor(total/6);
    for(let i=0;i<clusters;i++){
      if(isAbort(token)) throw new Error('aborted');
      let cr = rand(rows), cc = rand(cols);
      if(protect(cr,cc)) continue;
      for(let k=0;k<6;k++){
        const nr = clamp(cr + rand(3)-1, 0, rows-1);
        const nc = clamp(cc + rand(3)-1, 0, cols-1);
        if(protect(nr,nc)) continue;
        if(grid[nr][nc].type==='wall') continue;
        grid[nr][nc].type='wall';
        if(getDelay()===0) pendingInstantBatch.push(grid[nr][nc]); else syncCellClass(grid[nr][nc]);
        placed++;
      }
      if(getDelay()!==0 && i%6===0) await sleep(getDelay());
    }
    // fill remaining random
    let attempts=0;
    while(placed < total && attempts < total*3){
      if(isAbort(token)) throw new Error('aborted');
      const r=rand(rows), c=rand(cols);
      attempts++;
      if(protect(r,c)) continue;
      if(grid[r][c].type!=='empty') continue;
      grid[r][c].type='wall';
      if(getDelay()===0) pendingInstantBatch.push(grid[r][c]); else syncCellClass(grid[r][c]);
      placed++;
      if(getDelay()!==0 && placed%18===0) await sleep(getDelay()/2);
    }
    // scatter weights 12%
    const wTotal = Math.floor(rows*cols*0.12);
    let wPlaced=0;
    for(let i=0;i<wTotal*2 && wPlaced<wTotal;i++){
      const r=rand(rows), c=rand(cols);
      if(protect(r,c)) continue;
      if(grid[r][c].type!=='empty') continue;
      grid[r][c].type='weight';
      if(getDelay()===0) pendingInstantBatch.push(grid[r][c]); else syncCellClass(grid[r][c]);
      wPlaced++;
      if(getDelay()!==0 && wPlaced%10===0) await sleep(getDelay()/2);
    }
    grid[start.r][start.c].type='start';
    grid[target.r][target.c].type='target';
    flushInstantBatch();
    syncAll();
  }

  const MAZE_RUNNERS = {
    backtracking: generateBacktracking,
    prim: generatePrims,
    division: generateDivision,
    random: generateRandomClutter
  };

  // ---------- Control helpers ----------
  function setControlsEnabled(enabled){
    genMazeBtn.disabled = !enabled;
    clearPathBtn.disabled = !enabled;
    clearBoardBtn.disabled = !enabled;
    resetBtn.disabled = false;
    gridSizeSelect.disabled = !enabled;
    algoSelect.disabled = !enabled;
    mazeSelect.disabled = !enabled;
    diagonalToggle.disabled = !enabled;
    // weightToggle stays enabled? disable during visualize
    weightToggle.disabled = !enabled;
    visualizeBtn.disabled = false; // always allow abort
    if(enabled) visualizeBtn.classList.remove('pulsing');
  }
  function updateVisualizeLabel(){
    const map={bfs:'BFS', dfs:'DFS', dijkstra:'Dijkstra', astar:'A*', greedy:'Greedy BFS'};
    const v = algoSelect.value;
    visualizeLabel.textContent = `Visualize ${map[v]||v}`;
  }

  async function runVisualization(){
    if(isVisualizing){
      // abort
      abortToken++;
      isVisualizing=false;
      setStatus('Idle','idle');
      setControlsEnabled(true);
      visualizeBtn.classList.remove('pulsing');
      updateVisualizeLabel();
      toast('Cancelled', 'error');
      return;
    }
    const algo = algoSelect.value;
    const runner = ALGO_RUNNERS[algo];
    if(!runner){ toast('Unknown algorithm','error'); return; }

    // prepare
    clearPathState();
    abortToken++;
    const token = abortToken;
    isVisualizing = true;
    setControlsEnabled(false);
    visualizeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/></svg> Abort`;
    visualizeBtn.classList.add('pulsing');
    setStatus('Searching…','searching');
    pendingInstantBatch = [];
    const visitedRef = { count: 0 };
    const t0 = performance.now();
    metricVisited.textContent='0';
    metricPath.textContent='—';

    try{
      const endNode = await runner(token, visitedRef);
      const t1 = performance.now();
      flushInstantBatch();
      if(isAbort(token)) return;
      if(!endNode){
        const dt = t1 - t0;
        updateMetrics(visitedRef.count, '∞', dt);
        setStatus('Path Unreachable','unreachable');
        toast('No path found — target is boxed in','error');
      } else {
        const { path, weight } = reconstructPath(endNode);
        const dt = t1 - performance.now() + (performance.now()-t0); // keep t1
        // animate path
        setStatus('Path Found','found');
        await animatePath(path, token, weight);
        if(isAbort(token)) return;
        flushInstantBatch();
        const t2 = performance.now();
        // path length: hops = path.length-1, weighted cost = weight
        const isWeighted = algo==='dijkstra' || algo==='astar';
        const label = isWeighted ? `${path.length-1} steps (cost ${weight.toFixed(algo==='dijkstra'||algo==='astar'&&diagonalToggle.checked?1:0)})` : `${path.length-1} steps`;
        // compute cost nicely
        let displayLen = `${path.length-1}`;
        if(isWeighted){
          // compute true cost with diagonal factor for display
          let cost=0;
          for(let i=1;i<path.length;i++){
            const prev=path[i-1], cur=path[i];
            const isDiag = Math.abs(prev.r - cur.r)===1 && Math.abs(prev.c - cur.c)===1;
            cost += nodeCost(cur) * (isDiag? Math.SQRT2 : 1);
          }
          displayLen = `${path.length-1} (cost ${cost.toFixed(1)})`;
        }
        updateMetrics(visitedRef.count, displayLen, t2 - t0);
        toast(`Path found • ${displayLen} • ${visitedRef.count} visited`,'success');
      }
    } catch(e){
      if(e.message!=='aborted') { console.error(e); toast(e.message,'error'); setStatus('Error','unreachable'); }
    } finally {
      if(!isAbort(token)){
        isVisualizing=false;
        setControlsEnabled(true);
        visualizeBtn.classList.remove('pulsing');
        visualizeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 3L12 8L5 13V3Z" fill="currentColor"/></svg><span id="visualizeLabel">Visualize ${algoSelect.options[algoSelect.selectedIndex].text.split('(')[0].trim()}</span>`;
        // re-cache label ref
        const newLabel = document.getElementById('visualizeLabel');
        if(newLabel) { /* update ref */ }
        updateVisualizeLabel();
        // ensure grid interactive
      }
    }
  }

  async function runMazeGeneration(){
    if(isVisualizing) return;
    const kind = mazeSelect.value;
    const runner = MAZE_RUNNERS[kind];
    if(!runner) return;
    abortToken++;
    const token = abortToken;
    isVisualizing = true;
    setControlsEnabled(false);
    clearPathState();
    setStatus('Generating Maze…','generating');
    pendingInstantBatch=[];
    const t0=performance.now();
    try{
      await runner(token);
      if(isAbort(token)) return;
      flushInstantBatch();
      syncAll();
      const dt=performance.now()-t0;
      updateMetrics(0,'—',dt);
      setStatus('Idle','idle');
      toast('Maze generated','success');
    } catch(e){
      if(e.message!=='aborted') toast(e.message,'error');
    } finally {
      if(!isAbort(token)){
        isVisualizing=false;
        setControlsEnabled(true);
      }
    }
  }

  // ---------- Interaction ----------
  function cellFromEvent(e){
    const el = e.target.closest('.cell');
    if(!el) return null;
    const r = parseInt(el.dataset.r,10), c=parseInt(el.dataset.c,10);
    if(Number.isNaN(r)||Number.isNaN(c)) return null;
    if(r<0||r>=rows||c<0||c>=cols) return null;
    return grid[r][c];
  }

  function canPlaceAt(node){
    // cannot place wall/weight on start/target
    if(node.r===start.r && node.c===start.c) return false;
    if(node.r===target.r && node.c===target.c) return false;
    return true;
  }

  function handlePointerDown(e){
    if(isVisualizing) return;
    // right click
    if(e.button===2) e.preventDefault();
    const node = cellFromEvent(e);
    if(!node) return;
    mouseDown = true;
    mouseButton = e.button;
    shiftDown = e.shiftKey;
    // check drag start/target
    if(node.r===start.r && node.c===start.c){
      draggedType='start';
      return;
    }
    if(node.r===target.r && node.c===target.c){
      draggedType='target';
      return;
    }
    draggedType=null;
    // paint
    paintCell(node, e);
  }

  function paintCell(node, e){
    if(!canPlaceAt(node)) return;
    const isErase = mouseButton===2 || e.shiftKey || shiftDown || (e.buttons===2);
    const weightMode = weightToggle.checked;
    if(isErase){
      node.type='empty';
      node.state='unvisited';
    } else {
      if(weightMode){
        node.type='weight';
        node.state='unvisited';
      } else {
        node.type='wall';
        node.state='unvisited';
      }
    }
    syncCellClass(node);
  }

  function handlePointerMove(e){
    shiftDown = e.shiftKey;
    if(!mouseDown) return;
    if(isVisualizing) return;
    const node = cellFromEvent(e);
    if(!node) return;
    if(draggedType){
      // move anchor
      if(node.type==='wall') return;
      if(node.r===start.r && node.c===start.c) return;
      if(node.r===target.r && node.c===target.c) return;
      // clear old
      const old = draggedType==='start' ? grid[start.r][start.c] : grid[target.r][target.c];
      old.type='empty';
      syncCellClass(old);
      if(draggedType==='start'){ start.r=node.r; start.c=node.c; }
      else { target.r=node.r; target.c=node.c; }
      // ensure new not weight/wall? clear
      node.type = draggedType==='start' ? 'start' : 'target';
      node.state='unvisited';
      syncAll();
      return;
    }
    paintCell(node, e);
  }

  function handlePointerUp(){
    mouseDown=false;
    draggedType=null;
  }

  // ---------- Bindings ----------
  function bindEvents(){
    visualizeBtn.addEventListener('click', runVisualization);
    genMazeBtn.addEventListener('click', runMazeGeneration);
    clearPathBtn.addEventListener('click', () => { if(isVisualizing) { abortToken++; isVisualizing=false; setControlsEnabled(true);} clearPathState(); toast('Path cleared','success'); });
    clearBoardBtn.addEventListener('click', () => { clearBoard(); toast('Board cleared','success'); });
    resetBtn.addEventListener('click', () => { resetDefault(); toast('Reset to default','success'); });

    algoSelect.addEventListener('change', updateVisualizeLabel);
    gridSizeSelect.addEventListener('change', () => {
      if(isVisualizing) { toast('Cannot change size while visualizing','error'); gridSizeSelect.value = Object.keys(GRID_PRESETS).find(k=>GRID_PRESETS[k].rows===rows) || 'medium'; return; }
      initGrid(gridSizeSelect.value);
      toast(`Grid: ${rows}×${cols}`,'success');
    });
    speedRange.addEventListener('input', () => {
      speedLabel.textContent = getSpeedLabel();
    });
    // weight toggle hint
    weightToggle.addEventListener('change', () => {
      toast(weightToggle.checked ? 'Weight mode: click-drag to paint mud (×5)' : 'Wall mode','success');
    });

    // grid events
    gridEl.addEventListener('mousedown', handlePointerDown);
    gridEl.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    gridEl.addEventListener('contextmenu', e => e.preventDefault());
    // touch
    gridEl.addEventListener('touchstart', (e)=>{
      const t=e.touches[0];
      const el=document.elementFromPoint(t.clientX, t.clientY);
      if(!el) return;
      const fake={target:el, button:0, shiftKey:false, preventDefault:()=>e.preventDefault()};
      handlePointerDown(fake);
      e.preventDefault();
    }, {passive:false});
    gridEl.addEventListener('touchmove', (e)=>{
      const t=e.touches[0];
      const el=document.elementFromPoint(t.clientX, t.clientY);
      if(!el) return;
      const fake={target:el, button:0, shiftKey:false, buttons:1};
      handlePointerMove(fake);
      e.preventDefault();
    }, {passive:false});
    gridEl.addEventListener('touchend', handlePointerUp);

    window.addEventListener('keydown', (e)=>{
      if(e.key==='Shift') shiftDown=true;
      if(e.key==='Escape' && isVisualizing){ abortToken++; }
    });
    window.addEventListener('keyup', (e)=>{ if(e.key==='Shift') shiftDown=false; });
  }

  // ---------- Init ----------
  initGrid('medium');
  bindEvents();
  speedLabel.textContent = getSpeedLabel();
  updateVisualizeLabel();

  // expose for debug
  window.Ariadne = { grid, get rows(){return rows}, get cols(){return cols}, initGrid, clearBoard, clearPathState };
})();
