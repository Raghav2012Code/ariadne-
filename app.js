/* Ariadne — Pitch-Black Pathfinding & Maze Engine */
(() => {
  'use strict';

  const DENSITY_PRESETS = {
    dense:    { rows: 35, cols: 75 },
    balanced: { rows: 25, cols: 55 },
    spacious: { rows: 17, cols: 37 }
  };
  const DEFAULT_DENSITY = 'balanced';
  const SPEEDS = [
    { label: 'Instant', delay: 0 },
    { label: 'Fast',    delay: 3 },
    { label: 'Normal',  delay: 15 },
    { label: 'Slow',    delay: 40 }
  ];

  const gridEl = document.getElementById('grid');
  const stageEl = document.getElementById('stage');
  const algoSelect = document.getElementById('algoSelect');
  const mazeSelect = document.getElementById('mazeSelect');
  const speedRange = document.getElementById('speedRange');
  const speedLabel = document.getElementById('speedLabel');
  const visualizeBtn = document.getElementById('visualizeBtn');
  const generateBtn = document.getElementById('generateBtn');
  const clearToggle = document.getElementById('clearToggle');
  const clearMenu = document.getElementById('clearMenu');
  const densityBtns = document.querySelectorAll('.density-btn');
  const navEl = document.querySelector('.nav');
  const legendEl = document.querySelector('.legend');
  const ribbonEl = document.querySelector('.ribbon');
  const ribbonAlgo = document.getElementById('ribbonAlgo');
  const ribbonStatus = document.getElementById('ribbonStatus');
  const ribbonVisited = document.getElementById('ribbonVisited');
  const ribbonPath = document.getElementById('ribbonPath');
  const ribbonLatency = document.getElementById('ribbonLatency');
  const toastEl = document.getElementById('toast');

  let rows = DENSITY_PRESETS[DEFAULT_DENSITY].rows;
  let cols = DENSITY_PRESETS[DEFAULT_DENSITY].cols;
  let grid = [];
  let start = { r: 1, c: 1 };
  let target = { r: rows - 2, c: cols - 2 };
  let isVisualizing = false;
  let abortToken = 0;
  let draggedType = null;
  let mouseDown = false;
  let mouseButton = 0;
  let shiftDown = false;
  let pendingInstantBatch = [];

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (n) => Math.floor(Math.random() * n);
  const choice = (arr) => arr[rand(arr.length)];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function getDelay(){ return SPEEDS[clamp(parseInt(speedRange.value,10)||1,0,3)].delay; }
  function getSpeedLabel(){ return SPEEDS[clamp(parseInt(speedRange.value,10)||1,0,3)].label; }
  function isAbort(t){ return t !== abortToken; }
  function toast(msg,kind=''){
    toastEl.textContent=msg; toastEl.className='toast '+kind; toastEl.classList.remove('hidden');
    clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.add('hidden'),2400);
  }
  function setRibbonStatus(s){ ribbonStatus.textContent=s; }
  function updateRibbon(visited, pathLen, latency){
    ribbonVisited.textContent=visited;
    ribbonPath.textContent=pathLen==null?'0':String(pathLen);
    ribbonLatency.textContent=(latency==null?'0.0ms':`${latency.toFixed(1)}ms`);
    ribbonAlgo.textContent=(algoSelect.options[algoSelect.selectedIndex]?.textContent||'A*').toUpperCase().replace(' SEARCH','');
  }

  class MinHeap{
    constructor(cmp){ this.a=[]; this.cmp=cmp; }
    size(){return this.a.length}
    isEmpty(){return this.a.length===0}
    push(v){ this.a.push(v); this._up(this.a.length-1); }
    pop(){
      if(!this.a.length) return undefined;
      const t=this.a[0], last=this.a.pop();
      if(this.a.length){ this.a[0]=last; this._down(0); }
      return t;
    }
    _up(i){ const a=this.a,c=this.cmp; while(i>0){ const p=(i-1)>>1; if(c(a[i],a[p])>=0) break; [a[i],a[p]]=[a[p],a[i]]; i=p; } }
    _down(i){ const a=this.a,c=this.cmp,n=a.length; while(true){ let s=i,l=i*2+1,r=l+1; if(l<n&&c(a[l],a[s])<0) s=l; if(r<n&&c(a[r],a[s])<0) s=r; if(s===i) break; [a[i],a[s]]=[a[s],a[i]]; i=s; } }
  }
  class DSU{
    constructor(n){ this.p=Array.from({length:n},(_,i)=>i); this.r=Array(n).fill(0); }
    find(x){ if(this.p[x]!==x) this.p[x]=this.find(this.p[x]); return this.p[x]; }
    union(a,b){
      let ra=this.find(a), rb=this.find(b); if(ra===rb) return false;
      if(this.r[ra]<this.r[rb]) [ra,rb]=[rb,ra];
      this.p[rb]=ra; if(this.r[ra]===this.r[rb]) this.r[ra]++; return true;
    }
  }

  function computeCellSize(){
    const navH = navEl ? navEl.offsetHeight : 52;
    const legH = legendEl ? legendEl.offsetHeight : 28;
    const ribH = ribbonEl ? ribbonEl.offsetHeight : 28;
    const availW = window.innerWidth - 20;
    const availH = window.innerHeight - navH - legH - ribH - 18;
    if(availW<=0||availH<=0) return;
    const gap=1, pad=4;
    const w=Math.floor((availW - pad - (cols-1)*gap)/cols);
    const h=Math.floor((availH - pad - (rows-1)*gap)/rows);
    const size=clamp(Math.min(w,h), 6, 26);
    document.documentElement.style.setProperty('--cell-size', size+'px');
    gridEl.style.setProperty('--cell-size', size+'px');
    gridEl.style.setProperty('--cols', cols);
    gridEl.style.setProperty('--rows', rows);
  }

  function createNode(r,c){ return { r,c, type:'empty', state:'unvisited', g:Infinity,h:0,f:Infinity, parent:null, parentB:null, el:null }; }

  function initGrid(presetRows, presetCols){
    if(presetRows && presetCols){ rows=presetRows; cols=presetCols; }
    if(rows%2===0) rows++; if(cols%2===0) cols++;
    start={ r:1, c:1 }; target={ r:rows-2, c:cols-2 };
    grid=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>createNode(r,c)));
    grid[start.r][start.c].type='start';
    grid[target.r][target.c].type='target';
    abortToken++;
    renderGrid();
    computeCellSize();
    setRibbonStatus('READY');
    updateRibbon(0,0,0);
  }

  function renderGrid(){
    gridEl.style.setProperty('--cols', cols);
    gridEl.style.setProperty('--rows', rows);
    gridEl.innerHTML='';
    const frag=document.createDocumentFragment();
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const n=grid[r][c];
      const d=document.createElement('div');
      d.className='cell'; d.dataset.r=r; d.dataset.c=c; d.setAttribute('role','gridcell');
      n.el=d; syncCellClass(n); frag.appendChild(d);
    }
    gridEl.appendChild(frag);
    requestAnimationFrame(computeCellSize);
  }
  function syncCellClass(n){
    const el=n.el; if(!el) return;
    el.className='cell';
    if(n.type==='wall') el.classList.add('wall');
    else if(n.type==='weight') el.classList.add('weight');
    if(n.state==='visited') el.classList.add('visited');
    else if(n.state==='frontier') el.classList.add('frontier');
    else if(n.state==='path') el.classList.add('path');
    if(n.r===start.r&&n.c===start.c) el.classList.add('start');
    if(n.r===target.r&&n.c===target.c) el.classList.add('target');
  }
  function syncAll(){ for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) syncCellClass(grid[r][c]); }
  function clearPathState(){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const n=grid[r][c];
      if(n.state==='visited'||n.state==='frontier'||n.state==='path'){
        n.state='unvisited'; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; n.parentB=null;
      }
    }
    syncAll(); updateRibbon(0,0,0); setRibbonStatus('READY');
  }
  function clearWalls(){
    if(isVisualizing) return;
    abortToken++;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const n=grid[r][c]; n.type='empty'; n.state='unvisited'; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; n.parentB=null;
    }
    grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
    syncAll(); updateRibbon(0,0,0); setRibbonStatus('READY');
  }
  function fullReset(){
    if(isVisualizing) abortToken++;
    isVisualizing=false;
    const active=document.querySelector('.density-btn.active');
    const key=active?active.dataset.density:DEFAULT_DENSITY;
    const p=DENSITY_PRESETS[key]||DENSITY_PRESETS[DEFAULT_DENSITY];
    initGrid(p.rows,p.cols);
  }

  function heuristic(a,b, euclidean=false){
    const dx=Math.abs(a.r-b.r), dy=Math.abs(a.c-b.c);
    return euclidean ? Math.hypot(dx,dy) : dx+dy;
  }
  function getNeighbors(node){
    const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    const res=[];
    for(const [dr,dc] of dirs){
      const nr=node.r+dr,nc=node.c+dc;
      if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
      const nb=grid[nr][nc];
      if(nb.type==='wall') continue;
      res.push(nb);
    }
    return res;
  }
  function nodeCost(n){ return n.type==='weight'?5:1; }
  function isTarget(n){ return n.r===target.r&&n.c===target.c; }
  function isStart(n){ return n.r===start.r&&n.c===start.c; }

  async function maybeDelay(t){ const d=getDelay(); if(d===0) return; await sleep(d); if(isAbort(t)) throw new Error('aborted'); }
  function markVisited(n, ref){
    if(isStart(n)||isTarget(n)) return;
    if(n.state==='visited') return;
    n.state='visited';
    if(getDelay()===0) pendingInstantBatch.push(n); else syncCellClass(n);
    ref.count++; ribbonVisited.textContent=ref.count;
  }
  function markFrontier(n){
    if(isStart(n)||isTarget(n)) return;
    if(n.state!=='unvisited') return;
    n.state='frontier';
    if(getDelay()===0) pendingInstantBatch.push(n); else syncCellClass(n);
  }
  function flushInstant(){ if(!pendingInstantBatch.length) return; for(const n of pendingInstantBatch) syncCellClass(n); pendingInstantBatch=[]; }
  async function animatePath(path, token){
    if(!path||!path.length) return;
    const d=getDelay();
    if(d===0){ for(const n of path){ if(isStart(n)||isTarget(n)) continue; n.state='path'; } syncAll(); return; }
    for(const n of path){
      if(isAbort(token)) throw new Error('aborted');
      if(isStart(n)||isTarget(n)) continue;
      n.state='path'; syncCellClass(n);
      await sleep(Math.max(6, d*1.2));
    }
  }
  function reconstruct(end){
    const path=[]; let cur=end; while(cur){ path.push(cur); cur=cur.parent; } path.reverse(); return path;
  }
  function reconstructBidirectional(meet){
    const fwd=[]; let cur=meet; while(cur){ fwd.push(cur); cur=cur.parent; } fwd.reverse();
    const bwd=[]; cur=meet.parentB; while(cur){ bwd.push(cur); cur=cur.parentB; }
    return fwd.concat(bwd);
  }

  async function runBFS(token, ref){
    const s=grid[start.r][start.c];
    const q=[s]; const seen=new Set([`${s.r},${s.c}`]);
    s.g=0; s.parent=null; markFrontier(s);
    while(q.length){
      if(isAbort(token)) throw new Error('aborted');
      const cur=q.shift();
      if(cur.state==='frontier') cur.state='unvisited';
      if(!isStart(cur)) markVisited(cur, ref);
      if(isTarget(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const k=`${nb.r},${nb.c}`; if(seen.has(k)) continue;
        seen.add(k); nb.parent=cur; nb.g=cur.g+1; markFrontier(nb); q.push(nb);
      }
    }
    return null;
  }
  async function runDFS(token, ref){
    const s=grid[start.r][start.c];
    const stack=[s]; const seen=new Set(); s.parent=null;
    while(stack.length){
      if(isAbort(token)) throw new Error('aborted');
      const cur=stack.pop(); const k=`${cur.r},${cur.c}`; if(seen.has(k)) continue; seen.add(k);
      if(!isStart(cur)) markVisited(cur, ref);
      if(isTarget(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      const neigh=getNeighbors(cur);
      for(let i=neigh.length-1;i>=0;i--){
        const nb=neigh[i]; const kk=`${nb.r},${nb.c}`; if(seen.has(kk)) continue;
        if(!nb.parent) nb.parent=cur; markFrontier(nb); stack.push(nb);
      }
    }
    return null;
  }
  async function runDijkstra(token, ref){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=Infinity; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c]; s.g=0; s.f=0;
    const heap=new MinHeap((a,b)=>a.g-b.g); heap.push(s);
    const closed=new Set();
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`; if(closed.has(k)) continue; closed.add(k);
      if(!isStart(cur)) markVisited(cur, ref);
      if(isTarget(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(closed.has(kk)) continue;
        const alt=cur.g+nodeCost(nb);
        if(alt<nb.g){ nb.g=alt; nb.f=alt; nb.parent=cur; markFrontier(nb); heap.push(nb); }
      }
    }
    return null;
  }
  async function runAStar(token, ref){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    s.g=0; s.h=heuristic(s,t,false); s.f=s.h;
    const heap=new MinHeap((a,b)=>a.f-b.f); heap.push(s);
    const closed=new Set();
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`; if(closed.has(k)) continue; closed.add(k);
      if(!isStart(cur)) markVisited(cur, ref);
      if(isTarget(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(closed.has(kk)) continue;
        const tentative=cur.g+nodeCost(nb);
        if(tentative<nb.g){
          nb.parent=cur; nb.g=tentative; nb.h=heuristic(nb,t,false); nb.f=nb.g+nb.h; markFrontier(nb); heap.push(nb);
        }
      }
    }
    return null;
  }
  async function runGreedy(token, ref){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    s.h=heuristic(s,t,false); s.f=s.h;
    const heap=new MinHeap((a,b)=>a.f-b.f); heap.push(s);
    const seen=new Set();
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`; if(seen.has(k)) continue; seen.add(k);
      if(!isStart(cur)) markVisited(cur, ref);
      if(isTarget(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(seen.has(kk)) continue; if(nb.parent) continue;
        nb.parent=cur; nb.h=heuristic(nb,t,false); nb.f=nb.h; markFrontier(nb); heap.push(nb);
      }
    }
    return null;
  }

  async function runBiBFS(token, ref){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.parent=null; n.parentB=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    const qF=[s], qB=[t];
    const seenF=new Set([`${s.r},${s.c}`]), seenB=new Set([`${t.r},${t.c}`]);
    const visitedF=new Set(), visitedB=new Set();
    markFrontier(s); markFrontier(t);
    while(qF.length && qB.length){
      if(isAbort(token)) throw new Error('aborted');
      // expand forward
      if(qF.length){
        const cur=qF.shift(); const k=`${cur.r},${cur.c}`;
        if(!visitedF.has(k)){
          visitedF.add(k);
          if(!isStart(cur)&&!isTarget(cur)) markVisited(cur, ref);
          if(seenB.has(k)){
            // meeting: stitch
            // cur is meeting point; parentB already set from backward side if needed
            // ensure backward parent chain exists
            return cur;
          }
          if(getDelay()!==0) await maybeDelay(token);
          for(const nb of getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(seenF.has(kk)) continue;
            seenF.add(kk); nb.parent=cur; markFrontier(nb); qF.push(nb);
            if(seenB.has(kk)) return nb;
          }
        }
      }
      // expand backward
      if(qB.length){
        const cur=qB.shift(); const k=`${cur.r},${cur.c}`;
        if(!visitedB.has(k)){
          visitedB.add(k);
          if(!isStart(cur)&&!isTarget(cur)) markVisited(cur, ref);
          if(seenF.has(k)) return cur;
          if(getDelay()!==0) await maybeDelay(token);
          for(const nb of getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(seenB.has(kk)) continue;
            seenB.add(kk); nb.parentB=cur; markFrontier(nb); qB.push(nb);
            if(seenF.has(kk)) return nb;
          }
        }
      }
    }
    return null;
  }

  async function runBiAStar(token, ref){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; n.parentB=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    s.g=0; s.h=heuristic(s,t); s.f=s.h;
    // backward node separate tracking: use parentB and gB/hB stored via extra props
    t.gB=0; t.hB=heuristic(t,s); t.fB=t.hB;
    const heapF=new MinHeap((a,b)=>a.f-b.f); heapF.push(s);
    const heapB=new MinHeap((a,b)=>a.fB-b.fB); heapB.push(t);
    const closedF=new Set(), closedB=new Set();
    let bestMeet=null, bestCost=Infinity;
    const updateBest=(node)=>{
      const cost=(node.g===Infinity?1e9:node.g)+(node.gB===Infinity?1e9:node.gB);
      if(cost<bestCost){ bestCost=cost; bestMeet=node; }
    };
    while(!heapF.isEmpty() && !heapB.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      // forward step
      if(!heapF.isEmpty()){
        const cur=heapF.pop(); const k=`${cur.r},${cur.c}`; if(closedF.has(k)) {} else {
          closedF.add(k);
          if(!isStart(cur)) markVisited(cur, ref);
          if(closedB.has(k)) { updateBest(cur); break; }
          if(getDelay()!==0) await maybeDelay(token);
          for(const nb of getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(closedF.has(kk)) continue;
            const tentative=cur.g+nodeCost(nb);
            if(tentative < (nb.g===Infinity?1e9:nb.g)){
              nb.parent=cur; nb.g=tentative; nb.h=heuristic(nb,t); nb.f=nb.g+nb.h; markFrontier(nb); heapF.push(nb);
              if(closedB.has(kk)) updateBest(nb);
            }
          }
        }
      }
      if(!heapB.isEmpty()){
        const cur=heapB.pop(); const k=`${cur.r},${cur.c}`; if(closedB.has(k)) continue;
        closedB.add(k);
        if(!isTarget(cur)) markVisited(cur, ref);
        if(closedF.has(k)) { updateBest(cur); break; }
        if(getDelay()!==0) await maybeDelay(token);
        for(const nb of getNeighbors(cur)){
          const kk=`${nb.r},${nb.c}`; if(closedB.has(kk)) continue;
          const tentative=(cur.gB===undefined?Infinity:cur.gB)+nodeCost(nb);
          const curG = nb.gB===undefined?Infinity:nb.gB;
          if(tentative < curG){
            nb.parentB=cur; nb.gB=tentative; nb.hB=heuristic(nb,s); nb.fB=nb.gB+nb.hB; markFrontier(nb); heapB.push(nb);
            if(closedF.has(kk)) updateBest(nb);
          }
        }
      }
      if(bestMeet) break;
      if(heapF.isEmpty()||heapB.isEmpty()) break;
    }
    if(bestMeet) return bestMeet;
    // fallback: if no meeting, try any overlap
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const n=grid[r][c];
      if(n.g!==Infinity && n.gB!==undefined && n.gB!==Infinity) return n;
    }
    return null;
  }

  // Jump Point Search (pruned A* for grid)
  function hasForcedNeighbors(node, dir){
    const [dr,dc]=dir;
    // check perpendicular walls creating forced neighbors
    if(dr===0 && dc!==0){
      // horizontal
      const upR=node.r-1, downR=node.r+1, c=node.c;
      if(upR>=0 && node.c+dc>=0 && node.c+dc<cols){
        const up=grid[upR][c], diagUp=grid[upR][c+dc];
        if(up && up.type==='wall' && diagUp && diagUp.type!=='wall') return true;
      }
      if(downR<rows && node.c+dc>=0 && node.c+dc<cols){
        const down=grid[downR][c], diagDown=grid[downR][c+dc];
        if(down && down.type==='wall' && diagDown && diagDown.type!=='wall') return true;
      }
    } else if(dc===0 && dr!==0){
      const leftC=node.c-1, rightC=node.c+1, r=node.r;
      if(leftC>=0 && node.r+dr>=0 && node.r+dr<rows){
        const left=grid[r][leftC], diagLeft=grid[r+dr][leftC];
        if(left && left.type==='wall' && diagLeft && diagLeft.type!=='wall') return true;
      }
      if(rightC<cols && node.r+dr>=0 && node.r+dr<rows){
        const right=grid[r][rightC], diagRight=grid[r+dr][rightC];
        if(right && right.type==='wall' && diagRight && diagRight.type!=='wall') return true;
      }
    }
    return false;
  }
  function jump(from, dir, token){
    let r=from.r+dir[0], c=from.c+dir[1];
    while(true){
      if(r<0||r>=rows||c<0||c>=cols) return null;
      const node=grid[r][c];
      if(node.type==='wall') return null;
      if(isTarget(node)) return node;
      if(hasForcedNeighbors(node, dir)) return node;
      // if next step blocked, current is jump point
      const nr=r+dir[0], nc=c+dir[1];
      if(nr<0||nr>=rows||nc<0||nc>=cols) return node;
      const nxt=grid[nr][nc];
      if(nxt.type==='wall') return node;
      r=nr; c=nc;
    }
  }
  async function runJPS(token, ref){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    s.g=0; s.h=heuristic(s,t); s.f=s.h;
    const heap=new MinHeap((a,b)=>a.f-b.f); heap.push(s);
    const closed=new Set();
    const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`; if(closed.has(k)) continue; closed.add(k);
      if(!isStart(cur)) markVisited(cur, ref);
      if(isTarget(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const dir of dirs){
        const jp=jump(cur, dir, token);
        if(!jp) continue;
        const kk=`${jp.r},${jp.c}`; if(closed.has(kk)) continue;
        const dist=Math.abs(jp.r-cur.r)+Math.abs(jp.c-cur.c);
        // cost: sum of weights along path approximation
        let wCost=0; let rr=cur.r, cc=cur.c;
        for(let step=0; step<dist; step++){ rr+=dir[0]; cc+=dir[1]; wCost+=nodeCost(grid[rr][cc]); }
        const tentative=cur.g+wCost;
        if(tentative < jp.g){
          jp.parent=cur; jp.g=tentative; jp.h=heuristic(jp,t); jp.f=jp.g+jp.h; markFrontier(jp); heap.push(jp);
        }
      }
    }
    return null;
  }

  const ALGO_RUNNERS={
    bfs:runBFS, dfs:runDFS, dijkstra:runDijkstra, astar:runAStar, greedy:runGreedy,
    bibfs:runBiBFS, biastar:runBiAStar, jps:runJPS
  };

  async function generateBacktracking(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='wall'; grid[r][c].state='unvisited'; grid[r][c].parent=null; grid[r][c].parentB=null; }
    syncAll();
    const carve=(r,c)=>{ grid[r][c].type='empty'; if(getDelay()===0) pendingInstantBatch.push(grid[r][c]); else syncCellClass(grid[r][c]); };
    const sr=(start.r%2===0?start.r+1:start.r), sc=(start.c%2===0?start.c+1:start.c);
    const startCarve={ r:clamp(sr,1,rows-2), c:clamp(sc,1,cols-2) };
    carve(startCarve.r,startCarve.c);
    const stack=[startCarve];
    const visited=new Set([`${startCarve.r},${startCarve.c}`]);
    const dirs=[[-2,0],[2,0],[0,-2],[0,2]];
    let steps=0;
    while(stack.length){
      if(isAbort(token)) throw new Error('aborted');
      const cur=stack[stack.length-1];
      const cand=[];
      for(const [dr,dc] of dirs){
        const nr=cur.r+dr,nc=cur.c+dc;
        if(nr<=0||nr>=rows-1||nc<=0||nc>=cols-1) continue;
        const k=`${nr},${nc}`; if(visited.has(k)) continue;
        cand.push({r:nr,c:nc,dr,dc});
      }
      if(!cand.length){ stack.pop(); continue; }
      const nxt=choice(cand); visited.add(`${nxt.r},${nxt.c}`);
      carve(cur.r+nxt.dr/2, cur.c+nxt.dc/2); carve(nxt.r,nxt.c);
      stack.push({r:nxt.r,c:nxt.c});
      steps++; if(getDelay()!==0 && steps%3===0) await sleep(getDelay()); else if(getDelay()===0 && steps%60===0) flushInstant();
    }
    for(const p of [start,target]){
      grid[p.r][p.c].type=p===start?'start':'target';
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=p.r+dr,nc=p.c+dc;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&grid[nr][nc].type==='wall'&&Math.random()<0.92){ grid[nr][nc].type='empty'; syncCellClass(grid[nr][nc]); }
      }
    }
    flushInstant(); syncAll();
  }
  async function generatePrims(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='wall'; grid[r][c].state='unvisited'; }
    syncAll();
    let cr=start.r%2===0?start.r+1:start.r, cc=start.c%2===0?start.c+1:start.c;
    cr=clamp(cr,1,rows-2); cc=clamp(cc,1,cols-2);
    grid[cr][cc].type='empty'; syncCellClass(grid[cr][cc]);
    const frontier=[]; const add=(r,c,fr,fc)=>{ if(r<=0||r>=rows-1||c<=0||c>=cols-1) return; if(grid[r][c].type!=='wall') return; frontier.push({r,c,fr,fc}); };
    const dirs=[[-2,0],[2,0],[0,-2],[0,2]];
    for(const [dr,dc] of dirs) add(cr+dr,cc+dc,cr,cc);
    let iter=0;
    while(frontier.length){
      if(isAbort(token)) throw new Error('aborted');
      const idx=rand(frontier.length); const cur=frontier.splice(idx,1)[0];
      if(grid[cur.r][cur.c].type!=='wall') continue;
      const wr=(cur.r+cur.fr)/2, wc=(cur.c+cur.fc)/2;
      grid[wr][wc].type='empty'; syncCellClass(grid[wr][wc]);
      grid[cur.r][cur.c].type='empty'; syncCellClass(grid[cur.r][cur.c]);
      for(const [dr,dc] of dirs) add(cur.r+dr,cur.c+dc,cur.r,cur.c);
      iter++; if(getDelay()!==0 && iter%4===0) await sleep(getDelay());
    }
    grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
    for(const p of [start,target]) for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=p.r+dr,nc=p.c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&grid[nr][nc].type==='wall'&&Math.random()<0.7){ grid[nr][nc].type='empty'; syncCellClass(grid[nr][nc]); }
    }
    flushInstant(); syncAll();
  }
  async function generateKruskal(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='wall'; grid[r][c].state='unvisited'; }
    syncAll();
    // cells at odd positions
    const cells=[]; const cellIndex=new Map();
    for(let r=1;r<rows-1;r+=2) for(let c=1;c<cols-1;c+=2){ cellIndex.set(`${r},${c}`, cells.length); cells.push({r,c}); }
    const dsu=new DSU(cells.length);
    const walls=[];
    for(let r=1;r<rows-1;r+=2) for(let c=1;c<cols-1;c+=2){
      if(r+2<rows-1) walls.push({ r:r+1,c, a:`${r},${c}`, b:`${r+2},${c}` });
      if(c+2<cols-1) walls.push({ r,c:c+1, a:`${r},${c}`, b:`${r},${c+2}` });
    }
    // shuffle walls
    for(let i=walls.length-1;i>0;i--){ const j=rand(i+1); [walls[i],walls[j]]=[walls[j],walls[i]]; }
    // carve cells
    for(const {r,c} of cells){ grid[r][c].type='empty'; syncCellClass(grid[r][c]); }
    let processed=0;
    for(const w of walls){
      if(isAbort(token)) throw new Error('aborted');
      const ai=cellIndex.get(w.a), bi=cellIndex.get(w.b);
      if(ai===undefined||bi===undefined) continue;
      if(dsu.union(ai,bi)){
        grid[w.r][w.c].type='empty'; syncCellClass(grid[w.r][w.c]);
      }
      processed++; if(getDelay()!==0 && processed%12===0) await sleep(getDelay()); else if(getDelay()===0 && processed%80===0) flushInstant();
    }
    grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
    // ensure anchors open
    for(const p of [start,target]) for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=p.r+dr,nc=p.c+dc; if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&grid[nr][nc].type==='wall'&&Math.random()<0.85){ grid[nr][nc].type='empty'; syncCellClass(grid[nr][nc]); }
    }
    flushInstant(); syncAll();
  }
  async function generateDivision(token, r0=0,c0=0,r1=rows,c1=cols,depth=0){
    if(depth===0){
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='empty'; grid[r][c].state='unvisited'; }
      for(let r=0;r<rows;r++){ grid[r][0].type='wall'; grid[r][cols-1].type='wall'; }
      for(let c=0;c<cols;c++){ grid[0][c].type='wall'; grid[rows-1][c].type='wall'; }
      grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
      syncAll(); if(getDelay()!==0) await sleep(getDelay()*2);
      await generateDivision(token,1,1,rows-1,cols-1,1);
      flushInstant(); syncAll(); return;
    }
    if(isAbort(token)) throw new Error('aborted');
    const h=r1-r0,w=c1-c0; if(h<3||w<3) return;
    const horiz=h>w?true:w>h?false:Math.random()<0.5;
    if(horiz){
      const r=r0+1+rand(h-2); const passage=c0+rand(w);
      for(let c=c0;c<c1;c++){ if(c===passage) continue; const n=grid[r][c]; if((n.r===start.r&&n.c===start.c)||(n.r===target.r&&n.c===target.c)) continue; n.type='wall'; if(getDelay()===0) pendingInstantBatch.push(n); else syncCellClass(n); }
      if(getDelay()!==0) await sleep(getDelay());
      await generateDivision(token,r0,c0,r,c1,depth+1);
      await generateDivision(token,r+1,c0,r1,c1,depth+1);
    } else {
      const c=c0+1+rand(w-2); const passage=r0+rand(h);
      for(let r=r0;r<r1;r++){ if(r===passage) continue; const n=grid[r][c]; if((n.r===start.r&&n.c===start.c)||(n.r===target.r&&n.c===target.c)) continue; n.type='wall'; if(getDelay()===0) pendingInstantBatch.push(n); else syncCellClass(n); }
      if(getDelay()!==0) await sleep(getDelay());
      await generateDivision(token,r0,c0,r1,c,depth+1);
      await generateDivision(token,r0,c+1,r1,c1,depth+1);
    }
    if(depth===1) flushInstant();
  }
  async function generateCellular(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type=Math.random()<0.42?'wall':'empty'; grid[r][c].state='unvisited'; }
    // protect anchors
    for(let r=start.r-2;r<=start.r+2;r++) for(let c=start.c-2;c<=start.c+2;c++) if(r>=0&&r<rows&&c>=0&&c<cols) grid[r][c].type='empty';
    for(let r=target.r-2;r<=target.r+2;r++) for(let c=target.c-2;c<=target.c+2;c++) if(r>=0&&r<rows&&c>=0&&c<cols) grid[r][c].type='empty';
    // border walls
    for(let r=0;r<rows;r++){ grid[r][0].type='wall'; grid[r][cols-1].type='wall'; }
    for(let c=0;c<cols;c++){ grid[0][c].type='wall'; grid[rows-1][c].type='wall'; }
    syncAll(); if(getDelay()!==0) await sleep(getDelay()*2);
    const smooth = (iter)=>{
      const next=grid.map(row=>row.map(n=>n.type));
      for(let r=1;r<rows-1;r++) for(let c=1;c<cols-1;c++){
        if((r===start.r&&c===start.c)||(r===target.r&&c===target.c)) continue;
        let walls=0;
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0&&dc===0) continue; if(grid[r+dr][c+dc].type==='wall') walls++; }
        if(walls>4) next[r][c]='wall';
        else if(walls<4) next[r][c]='empty';
      }
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) grid[r][c].type=next[r][c];
    };
    for(let i=0;i<4;i++){
      if(isAbort(token)) throw new Error('aborted');
      smooth(i); syncAll();
      if(getDelay()!==0) await sleep(getDelay()*2);
    }
    // sprinkle weights in caves
    let wCount=0, wTarget=Math.floor(rows*cols*0.08);
    for(let r=1;r<rows-1&&wCount<wTarget;r++) for(let c=1;c<cols-1&&wCount<wTarget;c++){
      if(grid[r][c].type==='empty'&&Math.random()<0.06&& !(r===start.r&&c===start.c)&& !(r===target.r&&c===target.c)){
        grid[r][c].type='weight'; wCount++;
      }
    }
    grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
    flushInstant(); syncAll();
  }
  async function generateSpiral(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='empty'; grid[r][c].state='unvisited'; }
    for(let r=0;r<rows;r++){ grid[r][0].type='wall'; grid[r][cols-1].type='wall'; }
    for(let c=0;c<cols;c++){ grid[0][c].type='wall'; grid[rows-1][c].type='wall'; }
    syncAll();
    // diagonal stair + spiral obstacles
    let r=2,c=2, dir=0; // 0 right,1 down,2 left,3 up
    const dirs=[[0,2],[2,0],[0,-2],[-2,0]];
    let steps=0;
    // create diagonal stairs
    for(let k=2;k<Math.min(rows,cols)-4;k+=3){
      if(isAbort(token)) throw new Error('aborted');
      for(let s=0;s<k;s++){
        const nr=2+s, nc=2+s;
        if(nr<rows-1&&nc<cols-1&& !(nr===start.r&&nc===start.c)&& !(nr===target.r&&nc===target.c)){
          grid[nr][nc].type='wall'; syncCellClass(grid[nr][nc]);
        }
        // branching walls
        if(s%4===0){
          const br=nr+1, bc=nc;
          if(br<rows-1&&bc<cols-1&&grid[br][bc].type!=='wall'){ grid[br][bc].type='wall'; syncCellClass(grid[br][bc]); }
        }
      }
      if(getDelay()!==0 && k%6===0) await sleep(getDelay());
    }
    // spiral border inside
    let top=2,left=2,bottom=rows-3,right=cols-3;
    while(top<bottom && left<right){
      if(isAbort(token)) throw new Error('aborted');
      for(let cc=left;cc<=right;cc++){ if(Math.random()<0.55 && !(top===start.r&&cc===start.c)&& !(top===target.r&&cc===target.c)){ grid[top][cc].type='wall'; syncCellClass(grid[top][cc]); } }
      top+=2;
      for(let rr=top;rr<=bottom;rr++){ if(Math.random()<0.55 && !(rr===start.r&&right===start.c)&& !(rr===target.r&&right===target.c)){ grid[rr][right].type='wall'; syncCellClass(grid[rr][right]); } }
      right-=2;
      if(top<=bottom){ for(let cc=right;cc>=left;cc--){ if(Math.random()<0.55 && !(bottom===start.r&&cc===start.c)&& !(bottom===target.r&&cc===target.c)){ grid[bottom][cc].type='wall'; syncCellClass(grid[bottom][cc]); } } bottom-=2; }
      if(left<=right){ for(let rr=bottom;rr>=top;rr--){ if(Math.random()<0.55 && !(rr===start.r&&left===start.c)&& !(rr===target.r&&left===target.c)){ grid[rr][left].type='wall'; syncCellClass(grid[rr][left]); } } left+=2; }
      if(getDelay()!==0) await sleep(getDelay());
      steps++; if(steps>20) break;
    }
    grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
    flushInstant(); syncAll();
  }

  const MAZE_RUNNERS={
    backtracking:generateBacktracking, prim:generatePrims, kruskal:generateKruskal,
    division:generateDivision, cellular:generateCellular, spiral:generateSpiral
  };

  function setControlsEnabled(v){
    generateBtn.disabled=!v; algoSelect.disabled=!v; mazeSelect.disabled=!v;
    densityBtns.forEach(b=>b.disabled=!v);
    clearToggle.disabled=!v;
    visualizeBtn.disabled=false;
    if(v) visualizeBtn.classList.remove('pulsing');
  }

  async function runVisualization(){
    if(isVisualizing){
      abortToken++; isVisualizing=false; setRibbonStatus('READY'); setControlsEnabled(true);
      visualizeBtn.classList.remove('pulsing');
      visualizeBtn.innerHTML=`<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.2 1.4 L8.8 5.5 L2.2 9.6 Z" fill="currentColor"/></svg><span>Visualize</span>`;
      toast('Cancelled','error'); return;
    }
    const algo=algoSelect.value; const runner=ALGO_RUNNERS[algo];
    if(!runner){ toast('Unknown','error'); return; }
    clearPathState();
    abortToken++; const token=abortToken;
    isVisualizing=true; setControlsEnabled(false);
    visualizeBtn.innerHTML=`<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="1.5" width="2.8" height="8" rx="1" fill="currentColor"/><rect x="6.7" y="1.5" width="2.8" height="8" rx="1" fill="currentColor"/></svg><span>Abort</span>`;
    visualizeBtn.classList.add('pulsing'); setRibbonStatus('SEARCHING');
    pendingInstantBatch=[]; const ref={count:0}; const t0=performance.now();
    ribbonVisited.textContent='0'; ribbonPath.textContent='0';
    try{
      const end=await runner(token, ref);
      const t1=performance.now(); flushInstant();
      if(isAbort(token)) return;
      if(!end){
        updateRibbon(ref.count,'∞',t1-t0); setRibbonStatus('UNREACHABLE'); toast('No path found','error');
      } else {
        let path;
        if(algo==='bibfs' || algo==='biastar'){
          path=reconstructBidirectional(end);
        } else {
          path=reconstruct(end);
        }
        setRibbonStatus('FOUND');
        await animatePath(path, token); if(isAbort(token)) return; flushInstant();
        const t2=performance.now();
        let cost=0; for(let i=1;i<path.length;i++) cost+=nodeCost(path[i]);
        const isW=algo==='dijkstra'||algo==='astar'||algo==='biastar'||algo==='jps';
        let label=`${path.length-1}`;
        if(isW && cost!==path.length-1) label=`${path.length-1} (cost ${cost})`;
        updateRibbon(ref.count, label, t2-t0);
        ribbonPath.textContent=label;
        toast(`Path • ${label} • ${ref.count} visited`,'success');
      }
    } catch(e){ if(e.message!=='aborted'){ toast(e.message,'error'); setRibbonStatus('ERROR'); } }
    finally{
      if(!isAbort(token)){
        isVisualizing=false; setControlsEnabled(true); visualizeBtn.classList.remove('pulsing');
        visualizeBtn.innerHTML=`<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.2 1.4 L8.8 5.5 L2.2 9.6 Z" fill="currentColor"/></svg><span>Visualize</span>`;
      }
    }
  }

  async function runMazeGeneration(){
    if(isVisualizing) return;
    const kind=mazeSelect.value; const runner=MAZE_RUNNERS[kind]; if(!runner) return;
    abortToken++; const token=abortToken;
    isVisualizing=true; setControlsEnabled(false); clearPathState(); setRibbonStatus('GENERATING');
    pendingInstantBatch=[]; const t0=performance.now();
    try{
      await runner(token); if(isAbort(token)) return;
      flushInstant(); syncAll();
      const dt=performance.now()-t0; updateRibbon(0,0,dt); setRibbonStatus('READY'); toast('Maze generated','success');
    } catch(e){ if(e.message!=='aborted') toast(e.message,'error'); }
    finally{ if(!isAbort(token)){ isVisualizing=false; setControlsEnabled(true); setRibbonStatus('READY'); } }
  }

  function cellFromEvent(e){
    const el=e.target.closest('.cell'); if(!el) return null;
    const r=parseInt(el.dataset.r,10), c=parseInt(el.dataset.c,10);
    if(Number.isNaN(r)||Number.isNaN(c)) return null; if(r<0||r>=rows||c<0||c>=cols) return null;
    return grid[r][c];
  }
  function canPlaceAt(n){ return !(n.r===start.r&&n.c===start.c) && !(n.r===target.r&&n.c===target.c); }
  function handlePointerDown(e){
    if(isVisualizing) return;
    if(e.button===2) e.preventDefault();
    const n=cellFromEvent(e); if(!n) return;
    mouseDown=true; mouseButton=e.button; shiftDown=e.shiftKey;
    if(n.r===start.r&&n.c===start.c){ draggedType='start'; return; }
    if(n.r===target.r&&n.c===target.c){ draggedType='target'; return; }
    draggedType=null; paintCell(n,e);
  }
  function paintCell(n,e){
    if(!canPlaceAt(n)) return;
    const isErase=mouseButton===2 || e.shiftKey || shiftDown;
    if(isErase){ n.type='empty'; n.state='unvisited'; }
    else { n.type='wall'; n.state='unvisited'; }
    syncCellClass(n);
  }
  function handlePointerMove(e){
    shiftDown=e.shiftKey; if(!mouseDown||isVisualizing) return;
    const n=cellFromEvent(e); if(!n) return;
    if(draggedType){
      if(n.type==='wall') return;
      if(n.r===start.r&&n.c===start.c) return;
      if(n.r===target.r&&n.c===target.c) return;
      const old=draggedType==='start'?grid[start.r][start.c]:grid[target.r][target.c];
      old.type='empty'; syncCellClass(old);
      if(draggedType==='start'){ start.r=n.r; start.c=n.c; } else { target.r=n.r; target.c=n.c; }
      n.type=draggedType==='start'?'start':'target'; n.state='unvisited'; syncAll(); return;
    }
    paintCell(n,e);
  }
  function handlePointerUp(){ mouseDown=false; draggedType=null; }

  function bindEvents(){
    visualizeBtn.addEventListener('click', runVisualization);
    generateBtn.addEventListener('click', runMazeGeneration);
    clearToggle.addEventListener('click', ()=> clearMenu.classList.toggle('hidden'));
    clearMenu.addEventListener('click', (e)=>{
      const btn=e.target.closest('button'); if(!btn) return;
      const act=btn.dataset.clear;
      clearMenu.classList.add('hidden');
      if(act==='path'){ if(isVisualizing){ abortToken++; isVisualizing=false; setControlsEnabled(true); } clearPathState(); toast('Path cleared','success'); }
      else if(act==='walls'){ clearWalls(); toast('Walls cleared','success'); }
      else if(act==='reset'){ fullReset(); toast('Full reset','success'); }
    });
    document.addEventListener('click', (e)=>{ if(!e.target.closest('.dropdown')) clearMenu.classList.add('hidden'); });
    algoSelect.addEventListener('change', ()=>{ updateRibbon(ribbonVisited.textContent, ribbonPath.textContent, 0); });
    speedRange.addEventListener('input', ()=>{ speedLabel.textContent=getSpeedLabel(); });
    densityBtns.forEach(b=>{
      b.addEventListener('click', ()=>{
        if(isVisualizing) return;
        densityBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active');
        const key=b.dataset.density; const p=DENSITY_PRESETS[key];
        if(p) initGrid(p.rows,p.cols);
      });
    });
    gridEl.addEventListener('mousedown', handlePointerDown);
    gridEl.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    gridEl.addEventListener('contextmenu', e=>e.preventDefault());
    gridEl.addEventListener('touchstart', e=>{
      const t=e.touches[0]; const el=document.elementFromPoint(t.clientX,t.clientY); if(!el) return;
      handlePointerDown({target:el, button:0, shiftKey:false, preventDefault:()=>e.preventDefault()}); e.preventDefault();
    }, {passive:false});
    gridEl.addEventListener('touchmove', e=>{
      const t=e.touches[0]; const el=document.elementFromPoint(t.clientX,t.clientY); if(!el) return;
      handlePointerMove({target:el, button:0, shiftKey:false}); e.preventDefault();
    }, {passive:false});
    gridEl.addEventListener('touchend', handlePointerUp);
    window.addEventListener('keydown', e=>{
      if(e.key==='Shift') shiftDown=true;
      if(e.code==='Space'){ e.preventDefault(); runVisualization(); }
      if(e.key==='Escape'&&isVisualizing) abortToken++;
    });
    window.addEventListener('keyup', e=>{ if(e.key==='Shift') shiftDown=false; });
    window.addEventListener('resize', computeCellSize);
    if(window.ResizeObserver){
      const ro=new ResizeObserver(()=>computeCellSize());
      ro.observe(stageEl); ro.observe(document.documentElement);
      if(navEl) ro.observe(navEl); if(legendEl) ro.observe(legendEl); if(ribbonEl) ro.observe(ribbonEl);
    }
  }

  initGrid(DENSITY_PRESETS[DEFAULT_DENSITY].rows, DENSITY_PRESETS[DEFAULT_DENSITY].cols);
  bindEvents();
  speedLabel.textContent=getSpeedLabel();
  computeCellSize();
  // Auto-generate backtracking on load
  (async()=>{
    const prev=speedRange.value; speedRange.value="0";
    abortToken++; const token=abortToken; isVisualizing=true; setRibbonStatus('GENERATING'); pendingInstantBatch=[];
    try{ await generateBacktracking(token); } catch(_){ } finally {
      isVisualizing=false; setControlsEnabled(true); setRibbonStatus('READY');
      speedRange.value=prev; speedLabel.textContent=getSpeedLabel(); computeCellSize();
    }
  })();

  window.Ariadne={ get grid(){return grid}, get rows(){return rows}, get cols(){return cols}, initGrid, clearWalls, clearPathState, computeCellSize };
})();
