/* Ariadne — Minimalist No-Scroll Maze & Search Visualizer */
(() => {
  'use strict';

  const DEFAULT_PRESET = { rows: 29, cols: 55 };
  const DENSITY_PRESETS = {
    compact:  { rows: 33, cols: 65 },
    standard: { rows: 25, cols: 49 },
    focused:  { rows: 17, cols: 33 }
  };
  const SPEEDS = [
    { label: 'Instant', delay: 0 },
    { label: 'Fast',    delay: 5 },
    { label: 'Normal',  delay: 20 },
    { label: 'Slow',    delay: 50 }
  ];

  const gridEl = document.getElementById('grid');
  const stageEl = document.getElementById('stage');
  const algoSelect = document.getElementById('algoSelect');
  const mazeSelect = document.getElementById('mazeSelect');
  const speedRange = document.getElementById('speedRange');
  const speedLabel = document.getElementById('speedLabel');
  const visualizeBtn = document.getElementById('visualizeBtn');
  const genMazeBtn = document.getElementById('genMazeBtn');
  const clearPathBtn = document.getElementById('clearPathBtn');
  const clearWallsBtn = document.getElementById('clearWallsBtn');
  const metricVisited = document.getElementById('metricVisited');
  const metricPath = document.getElementById('metricPath');
  const metricTime = document.getElementById('metricTime');
  const statusBadge = document.getElementById('statusBadge');
  const toastEl = document.getElementById('toast');
  const densityBtns = document.querySelectorAll('.seg');

  let rows = DEFAULT_PRESET.rows;
  let cols = DEFAULT_PRESET.cols;
  let activeDensity = 'default';
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

  function getDelay() {
    const idx = clamp(parseInt(speedRange.value, 10) || 0, 0, 3);
    return SPEEDS[idx].delay;
  }
  function getSpeedLabel() { return SPEEDS[clamp(parseInt(speedRange.value,10)||0,0,3)].label; }
  function isAbort(token) { return token !== abortToken; }
  function setStatus(text, kind='idle') { statusBadge.textContent=text; statusBadge.className='badge badge-'+kind; }
  function toast(msg, kind='') {
    toastEl.textContent=msg;
    toastEl.className='toast '+kind;
    toastEl.classList.remove('hidden');
    clearTimeout(toastEl._t);
    toastEl._t=setTimeout(()=>toastEl.classList.add('hidden'), 2400);
  }
  function updateMetrics(visited, pathLen, timeMs){
    metricVisited.textContent=visited;
    metricPath.textContent= pathLen==null ? '—' : String(pathLen);
    metricTime.textContent= timeMs==null ? '0.00 ms' : `${timeMs.toFixed(2)} ms`;
  }

  class MinHeap{
    constructor(cmp){ this.a=[]; this.cmp=cmp; }
    size(){return this.a.length}
    isEmpty(){return this.a.length===0}
    push(v){ this.a.push(v); this._up(this.a.length-1); }
    pop(){
      if(!this.a.length) return undefined;
      const top=this.a[0]; const last=this.a.pop();
      if(this.a.length){ this.a[0]=last; this._down(0); }
      return top;
    }
    _up(i){ const a=this.a,c=this.cmp; while(i>0){ const p=(i-1)>>1; if(c(a[i],a[p])>=0) break; [a[i],a[p]]=[a[p],a[i]]; i=p; } }
    _down(i){ const a=this.a,c=this.cmp,n=a.length; while(true){ let s=i,l=i*2+1,r=l+1; if(l<n&&c(a[l],a[s])<0) s=l; if(r<n&&c(a[r],a[s])<0) s=r; if(s===i) break; [a[i],a[s]]=[a[s],a[i]]; i=s; } }
  }

  function computeCellSize(){
    const style = getComputedStyle(stageEl);
    const padX = parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
    const padY = parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
    const availW = stageEl.clientWidth - padX - 12;
    const availH = stageEl.clientHeight - padY - 12;
    if(availW<=0 || availH<=0) return;
    // account gap + border + padding inside grid (3*2 + 1*gaps)
    const gap = 1;
    const gridPad = 3*2;
    const w = Math.floor((availW - gridPad - (cols-1)*gap) / cols);
    const h = Math.floor((availH - gridPad - (rows-1)*gap) / rows);
    const size = clamp(Math.min(w, h), 8, 28);
    document.documentElement.style.setProperty('--cell-size', size+'px');
    gridEl.style.setProperty('--cell-size', size+'px');
  }

  function createNode(r,c){
    return { r,c, type:'empty', state:'unvisited', g:Infinity,h:0,f:Infinity, parent:null, el:null };
  }

  function initGrid(presetRows, presetCols){
    if(presetRows && presetCols){ rows=presetRows; cols=presetCols; }
    // ensure odd for perfect maze
    if(rows%2===0) rows++;
    if(cols%2===0) cols++;
    start={ r:1, c:1 };
    target={ r:rows-2, c:cols-2 };
    grid=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>createNode(r,c)));
    grid[start.r][start.c].type='start';
    grid[target.r][target.c].type='target';
    abortToken++;
    renderGrid();
    computeCellSize();
    setStatus('Idle','idle');
    updateMetrics(0,'—',0);
  }

  function renderGrid(){
    gridEl.style.setProperty('--cols', cols);
    gridEl.style.setProperty('--rows', rows);
    gridEl.innerHTML='';
    const frag=document.createDocumentFragment();
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const node=grid[r][c];
        const div=document.createElement('div');
        div.className='cell';
        div.dataset.r=r; div.dataset.c=c;
        div.setAttribute('role','gridcell');
        node.el=div;
        syncCellClass(node);
        frag.appendChild(div);
      }
    }
    gridEl.appendChild(frag);
    requestAnimationFrame(computeCellSize);
  }

  function syncCellClass(node){
    const el=node.el; if(!el) return;
    el.className='cell';
    if(node.type==='wall') el.classList.add('wall');
    else if(node.type==='weight') el.classList.add('weight');
    if(node.state==='visited') el.classList.add('visited');
    else if(node.state==='frontier') el.classList.add('frontier');
    else if(node.state==='path') el.classList.add('path');
    if(node.r===start.r&&node.c===start.c) el.classList.add('start');
    if(node.r===target.r&&node.c===target.c) el.classList.add('target');
    if(node.state==='visited' && (node.r+node.c)%2===0) el.classList.add('visited-alt');
  }
  function syncAll(){ for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) syncCellClass(grid[r][c]); }

  function clearPathState(){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const n=grid[r][c];
      if(n.state==='visited'||n.state==='frontier'||n.state==='path'){
        n.state='unvisited'; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null;
      }
    }
    syncAll(); updateMetrics(0,'—',0); setStatus('Idle','idle');
  }
  function clearWalls(){
    if(isVisualizing) return;
    abortToken++;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const n=grid[r][c];
      n.type='empty'; n.state='unvisited'; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null;
    }
    grid[start.r][start.c].type='start';
    grid[target.r][target.c].type='target';
    syncAll(); updateMetrics(0,'—',0); setStatus('Idle','idle');
  }

  function heuristic(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }
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
  function nodeCost(node){ return node.type==='weight'?5:1; }
  function isTerminal(node){ return node.r===target.r&&node.c===target.c; }

  async function maybeDelay(token){
    const d=getDelay(); if(d===0) return;
    await sleep(d);
    if(isAbort(token)) throw new Error('aborted');
  }
  function markVisited(node, visitedRef){
    if(node.r===start.r&&node.c===start.c) return;
    if(node.r===target.r&&node.c===target.c) return;
    if(node.state==='visited') return;
    node.state='visited';
    if(getDelay()===0) pendingInstantBatch.push(node); else syncCellClass(node);
    visitedRef.count++; metricVisited.textContent=visitedRef.count;
  }
  function markFrontier(node){
    if(node.r===start.r&&node.c===start.c) return;
    if(node.r===target.r&&node.c===target.c) return;
    if(node.state!=='unvisited') return;
    node.state='frontier';
    if(getDelay()===0) pendingInstantBatch.push(node); else syncCellClass(node);
  }
  function flushInstantBatch(){
    if(!pendingInstantBatch.length) return;
    for(const n of pendingInstantBatch) syncCellClass(n);
    pendingInstantBatch=[];
  }
  async function animatePath(path, token){
    if(!path||!path.length) return;
    const d=getDelay();
    if(d===0){ for(const n of path){ if(n.r===start.r&&n.c===start.c) continue; if(n.r===target.r&&n.c===target.c) continue; n.state='path'; } syncAll(); return; }
    for(let i=0;i<path.length;i++){
      if(isAbort(token)) throw new Error('aborted');
      const n=path[i];
      if(n.r===start.r&&n.c===start.c) continue;
      if(n.r===target.r&&n.c===target.c) continue;
      n.state='path'; syncCellClass(n);
      await sleep(Math.max(7, d*1.15));
    }
  }
  function reconstructPath(endNode){
    const path=[]; let cur=endNode; let w=0;
    while(cur){ path.push(cur); w+=nodeCost(cur); cur=cur.parent; }
    path.reverse();
    return { path, weight: w - nodeCost(grid[start.r][start.c]) };
  }

  async function runBFS(token, visitedRef){
    const s=grid[start.r][start.c];
    const q=[s]; const seen=new Set([`${s.r},${s.c}`]);
    s.g=0; s.parent=null; markFrontier(s);
    while(q.length){
      if(isAbort(token)) throw new Error('aborted');
      const cur=q.shift();
      if(cur.state==='frontier') cur.state='unvisited';
      if(cur.r!==start.r||cur.c!==start.c) markVisited(cur, visitedRef);
      if(isTerminal(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const k=`${nb.r},${nb.c}`;
        if(seen.has(k)) continue;
        seen.add(k); nb.parent=cur; nb.g=cur.g+1; markFrontier(nb); q.push(nb);
      }
    }
    return null;
  }
  async function runDFS(token, visitedRef){
    const s=grid[start.r][start.c];
    const stack=[s]; const seen=new Set(); s.parent=null;
    while(stack.length){
      if(isAbort(token)) throw new Error('aborted');
      const cur=stack.pop(); const k=`${cur.r},${cur.c}`;
      if(seen.has(k)) continue; seen.add(k);
      if(cur.r!==start.r||cur.c!==start.c) markVisited(cur, visitedRef);
      if(isTerminal(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      const neigh=getNeighbors(cur);
      for(let i=neigh.length-1;i>=0;i--){
        const nb=neigh[i]; const kk=`${nb.r},${nb.c}`;
        if(seen.has(kk)) continue;
        if(!nb.parent) nb.parent=cur;
        else if(seen.has(`${nb.parent.r},${nb.parent.c}`)) nb.parent=cur;
        markFrontier(nb); stack.push(nb);
      }
    }
    return null;
  }
  async function runDijkstra(token, visitedRef){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=Infinity; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c]; s.g=0; s.f=0;
    const heap=new MinHeap((a,b)=>a.g-b.g); heap.push(s);
    const closed=new Set();
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`;
      if(closed.has(k)) continue; closed.add(k);
      if(cur.r!==start.r||cur.c!==start.c) markVisited(cur, visitedRef);
      if(isTerminal(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(closed.has(kk)) continue;
        const alt=cur.g+nodeCost(nb);
        if(alt<nb.g){ nb.g=alt; nb.f=alt; nb.parent=cur; markFrontier(nb); heap.push(nb); }
      }
    }
    return null;
  }
  async function runAStar(token, visitedRef){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    s.g=0; s.h=heuristic(s,t); s.f=s.h;
    const heap=new MinHeap((a,b)=>a.f-b.f); heap.push(s);
    const closed=new Set();
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`;
      if(closed.has(k)) continue; closed.add(k);
      if(cur.r!==start.r||cur.c!==start.c) markVisited(cur, visitedRef);
      if(isTerminal(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(closed.has(kk)) continue;
        const tentative=cur.g+nodeCost(nb);
        if(tentative<nb.g){ nb.parent=cur; nb.g=tentative; nb.h=heuristic(nb,t); nb.f=nb.g+nb.h; markFrontier(nb); heap.push(nb); }
      }
    }
    return null;
  }
  async function runGreedy(token, visitedRef){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const n=grid[r][c]; n.g=0; n.h=0; n.f=Infinity; n.parent=null; }
    const s=grid[start.r][start.c], t=grid[target.r][target.c];
    s.h=heuristic(s,t); s.f=s.h;
    const heap=new MinHeap((a,b)=>a.f-b.f); heap.push(s);
    const seen=new Set();
    while(!heap.isEmpty()){
      if(isAbort(token)) throw new Error('aborted');
      const cur=heap.pop(); const k=`${cur.r},${cur.c}`;
      if(seen.has(k)) continue; seen.add(k);
      if(cur.r!==start.r||cur.c!==start.c) markVisited(cur, visitedRef);
      if(isTerminal(cur)) return cur;
      if(getDelay()!==0) await maybeDelay(token);
      for(const nb of getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(seen.has(kk)) continue;
        if(nb.parent) continue;
        nb.parent=cur; nb.h=heuristic(nb,t); nb.f=nb.h; markFrontier(nb); heap.push(nb);
      }
    }
    return null;
  }
  const ALGO_RUNNERS={ bfs:runBFS, dfs:runDFS, dijkstra:runDijkstra, astar:runAStar, greedy:runGreedy };

  async function generateBacktracking(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='wall'; grid[r][c].state='unvisited'; grid[r][c].parent=null; }
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
      steps++;
      if(getDelay()!==0 && steps%3===0) await sleep(getDelay());
      else if(getDelay()===0 && steps%50===0) flushInstantBatch();
    }
    for(const p of [start,target]){
      grid[p.r][p.c].type=p===start?'start':'target';
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=p.r+dr,nc=p.c+dc;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&grid[nr][nc].type==='wall'){
          if(Math.random()<0.92){ grid[nr][nc].type='empty'; syncCellClass(grid[nr][nc]); }
        }
      }
    }
    flushInstantBatch(); syncAll();
  }

  async function generatePrims(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='wall'; grid[r][c].state='unvisited'; }
    syncAll();
    let cr=start.r%2===0?start.r+1:start.r, cc=start.c%2===0?start.c+1:start.c;
    cr=clamp(cr,1,rows-2); cc=clamp(cc,1,cols-2);
    grid[cr][cc].type='empty'; syncCellClass(grid[cr][cc]);
    const frontier=[];
    const add=(r,c,fr,fc)=>{ if(r<=0||r>=rows-1||c<=0||c>=cols-1) return; if(grid[r][c].type!=='wall') return; frontier.push({r,c,fr,fc}); };
    const dirs=[[-2,0],[2,0],[0,-2],[0,2]];
    for(const [dr,dc] of dirs) add(cr+dr,cc+dc,cr,cc);
    let iter=0;
    while(frontier.length){
      if(isAbort(token)) throw new Error('aborted');
      const idx=rand(frontier.length);
      const cur=frontier.splice(idx,1)[0];
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
    flushInstantBatch(); syncAll();
  }

  async function generateDivision(token, r0=0,c0=0,r1=rows,c1=cols,depth=0){
    if(depth===0){
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ grid[r][c].type='empty'; grid[r][c].state='unvisited'; }
      for(let r=0;r<rows;r++){ grid[r][0].type='wall'; grid[r][cols-1].type='wall'; }
      for(let c=0;c<cols;c++){ grid[0][c].type='wall'; grid[rows-1][c].type='wall'; }
      grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
      syncAll();
      if(getDelay()!==0) await sleep(getDelay()*2);
      await generateDivision(token,1,1,rows-1,cols-1,1);
      flushInstantBatch(); syncAll(); return;
    }
    if(isAbort(token)) throw new Error('aborted');
    const h=r1-r0,w=c1-c0;
    if(h<3||w<3) return;
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
    if(depth===1) flushInstantBatch();
  }

  async function generateRandomClutter(token){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      if(r===start.r&&c===start.c||r===target.r&&c===target.c) continue;
      grid[r][c].type='empty'; grid[r][c].state='unvisited';
    }
    syncAll();
    const protect=(r,c)=> (Math.abs(r-start.r)<=2&&Math.abs(c-start.c)<=2) || (Math.abs(r-target.r)<=2&&Math.abs(c-target.c)<=2);
    const total=Math.floor(rows*cols*0.35);
    let placed=0;
    const clusters=Math.floor(total/6);
    for(let i=0;i<clusters;i++){
      if(isAbort(token)) throw new Error('aborted');
      let cr=rand(rows), cc=rand(cols); if(protect(cr,cc)) continue;
      for(let k=0;k<6;k++){
        const nr=clamp(cr+rand(3)-1,0,rows-1), nc=clamp(cc+rand(3)-1,0,cols-1);
        if(protect(nr,nc)) continue; if(grid[nr][nc].type==='wall') continue;
        grid[nr][nc].type='wall'; if(getDelay()===0) pendingInstantBatch.push(grid[nr][nc]); else syncCellClass(grid[nr][nc]); placed++;
      }
      if(getDelay()!==0 && i%6===0) await sleep(getDelay());
    }
    let attempts=0;
    while(placed<total && attempts<total*3){
      if(isAbort(token)) throw new Error('aborted');
      const r=rand(rows),c=rand(cols); attempts++;
      if(protect(r,c)) continue; if(grid[r][c].type!=='empty') continue;
      grid[r][c].type='wall'; if(getDelay()===0) pendingInstantBatch.push(grid[r][c]); else syncCellClass(grid[r][c]); placed++;
      if(getDelay()!==0 && placed%18===0) await sleep(getDelay()/2);
    }
    const wTotal=Math.floor(rows*cols*0.12);
    let wPlaced=0;
    for(let i=0;i<wTotal*2 && wPlaced<wTotal;i++){
      const r=rand(rows),c=rand(cols);
      if(protect(r,c)) continue; if(grid[r][c].type!=='empty') continue;
      grid[r][c].type='weight'; if(getDelay()===0) pendingInstantBatch.push(grid[r][c]); else syncCellClass(grid[r][c]); wPlaced++;
      if(getDelay()!==0 && wPlaced%10===0) await sleep(getDelay()/2);
    }
    grid[start.r][start.c].type='start'; grid[target.r][target.c].type='target';
    flushInstantBatch(); syncAll();
  }

  const MAZE_RUNNERS={ backtracking:generateBacktracking, prim:generatePrims, division:generateDivision, random:generateRandomClutter };

  function setControlsEnabled(enabled){
    genMazeBtn.disabled=!enabled;
    clearPathBtn.disabled=!enabled;
    clearWallsBtn.disabled=!enabled;
    algoSelect.disabled=!enabled; mazeSelect.disabled=!enabled;
    densityBtns.forEach(b=>b.disabled=!enabled);
    visualizeBtn.disabled=false;
    if(enabled) visualizeBtn.classList.remove('pulsing');
  }
  function updateVisualizeLabel(){
    const m={bfs:'BFS',dfs:'DFS',dijkstra:'Dijkstra',astar:'A*',greedy:'Greedy'};
    // keep button label dynamic but header shows simplified
  }

  async function runVisualization(){
    if(isVisualizing){
      abortToken++; isVisualizing=false; setStatus('Idle','idle'); setControlsEnabled(true);
      visualizeBtn.classList.remove('pulsing');
      visualizeBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 2.2 L10.2 6.5 L3 10.8 Z" fill="currentColor"/></svg><span>Visualize</span>`;
      toast('Cancelled','error'); return;
    }
    const algo=algoSelect.value; const runner=ALGO_RUNNERS[algo];
    if(!runner){ toast('Unknown','error'); return; }
    clearPathState();
    abortToken++; const token=abortToken;
    isVisualizing=true; setControlsEnabled(false);
    visualizeBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="2" width="3.2" height="9" rx="1" fill="currentColor"/><rect x="7.8" y="2" width="3.2" height="9" rx="1" fill="currentColor"/></svg><span>Abort</span>`;
    visualizeBtn.classList.add('pulsing'); setStatus('Searching…','searching');
    pendingInstantBatch=[]; const visitedRef={count:0}; const t0=performance.now();
    metricVisited.textContent='0'; metricPath.textContent='—';
    try{
      const end=await runner(token, visitedRef);
      const t1=performance.now(); flushInstantBatch();
      if(isAbort(token)) return;
      if(!end){
        updateMetrics(visitedRef.count,'∞',t1-t0); setStatus('Unreachable','unreachable'); toast('No path found','error');
      } else {
        const {path}=reconstructPath(end); setStatus('Path Found','found');
        await animatePath(path, token); if(isAbort(token)) return; flushInstantBatch();
        const t2=performance.now();
        let cost=0; for(let i=1;i<path.length;i++) cost+=nodeCost(path[i]);
        const isW=algo==='dijkstra'||algo==='astar';
        let label=`${path.length-1}`;
        if(isW) label=`${path.length-1} (cost ${cost})`;
        updateMetrics(visitedRef.count,label,t2-t0); toast(`Path • ${label} • ${visitedRef.count} visited`,'success');
      }
    } catch(e){ if(e.message!=='aborted'){ toast(e.message,'error'); setStatus('Error','unreachable'); } }
    finally{
      if(!isAbort(token)){
        isVisualizing=false; setControlsEnabled(true); visualizeBtn.classList.remove('pulsing');
        visualizeBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 2.2 L10.2 6.5 L3 10.8 Z" fill="currentColor"/></svg><span>Visualize</span>`;
      }
    }
  }

  async function runMazeGeneration(){
    if(isVisualizing) return;
    const kind=mazeSelect.value; const runner=MAZE_RUNNERS[kind];
    if(!runner) return;
    abortToken++; const token=abortToken;
    isVisualizing=true; setControlsEnabled(false); clearPathState(); setStatus('Generating…','generating');
    pendingInstantBatch=[]; const t0=performance.now();
    try{
      await runner(token); if(isAbort(token)) return;
      flushInstantBatch(); syncAll();
      const dt=performance.now()-t0; updateMetrics(0,'—',dt); setStatus('Idle','idle'); toast('Maze generated','success');
    } catch(e){ if(e.message!=='aborted') toast(e.message,'error'); }
    finally{ if(!isAbort(token)){ isVisualizing=false; setControlsEnabled(true); } }
  }

  function cellFromEvent(e){
    const el=e.target.closest('.cell'); if(!el) return null;
    const r=parseInt(el.dataset.r,10), c=parseInt(el.dataset.c,10);
    if(Number.isNaN(r)||Number.isNaN(c)) return null; if(r<0||r>=rows||c<0||c>=cols) return null;
    return grid[r][c];
  }
  function canPlaceAt(node){ return !(node.r===start.r&&node.c===start.c) && !(node.r===target.r&&node.c===target.c); }
  function handlePointerDown(e){
    if(isVisualizing) return;
    if(e.button===2) e.preventDefault();
    const node=cellFromEvent(e); if(!node) return;
    mouseDown=true; mouseButton=e.button; shiftDown=e.shiftKey;
    if(node.r===start.r&&node.c===start.c){ draggedType='start'; return; }
    if(node.r===target.r&&node.c===target.c){ draggedType='target'; return; }
    draggedType=null; paintCell(node,e);
  }
  function paintCell(node,e){
    if(!canPlaceAt(node)) return;
    const isErase=mouseButton===2 || e.shiftKey || shiftDown;
    if(isErase){ node.type='empty'; node.state='unvisited'; }
    else { node.type='wall'; node.state='unvisited'; }
    syncCellClass(node);
  }
  function handlePointerMove(e){
    shiftDown=e.shiftKey; if(!mouseDown||isVisualizing) return;
    const node=cellFromEvent(e); if(!node) return;
    if(draggedType){
      if(node.type==='wall') return;
      if(node.r===start.r&&node.c===start.c) return;
      if(node.r===target.r&&node.c===target.c) return;
      const old=draggedType==='start'?grid[start.r][start.c]:grid[target.r][target.c];
      old.type='empty'; syncCellClass(old);
      if(draggedType==='start'){ start.r=node.r; start.c=node.c; } else { target.r=node.r; target.c=node.c; }
      node.type=draggedType==='start'?'start':'target'; node.state='unvisited'; syncAll(); return;
    }
    paintCell(node,e);
  }
  function handlePointerUp(){ mouseDown=false; draggedType=null; }

  function bindEvents(){
    visualizeBtn.addEventListener('click', runVisualization);
    genMazeBtn.addEventListener('click', runMazeGeneration);
    clearPathBtn.addEventListener('click', ()=>{ if(isVisualizing){ abortToken++; isVisualizing=false; setControlsEnabled(true); } clearPathState(); toast('Path cleared','success'); });
    clearWallsBtn.addEventListener('click', ()=>{ clearWalls(); toast('Walls cleared','success'); });
    algoSelect.addEventListener('change', updateVisualizeLabel);
    speedRange.addEventListener('input', ()=>{ speedLabel.textContent=getSpeedLabel(); });
    densityBtns.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(isVisualizing) return;
        densityBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const key=btn.dataset.density;
        const preset=DENSITY_PRESETS[key];
        if(preset){ activeDensity=key; initGrid(preset.rows, preset.cols); }
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
      if(e.key==='c'||e.key==='C'){ clearPathState(); }
      if(e.key==='r'||e.key==='R'){ runMazeGeneration(); }
      if(e.key==='Escape'&&isVisualizing) abortToken++;
    });
    window.addEventListener('keyup', e=>{ if(e.key==='Shift') shiftDown=false; });
    window.addEventListener('resize', computeCellSize);
    if(window.ResizeObserver){ const ro=new ResizeObserver(()=>computeCellSize()); ro.observe(stageEl); ro.observe(document.documentElement); }
  }

  // Init + auto-generate maze
  initGrid(DEFAULT_PRESET.rows, DEFAULT_PRESET.cols);
  bindEvents();
  speedLabel.textContent=getSpeedLabel();
  // Auto-maze on load: run backtracking instantly so user sees maze immediately
  (async ()=>{
    // ensure instant generation on first load
    const prevVal=speedRange.value;
    speedRange.value="0"; // instant
    abortToken++; const token=abortToken;
    isVisualizing=true; setStatus('Generating…','generating');
    pendingInstantBatch=[];
    try{ await generateBacktracking(token); } catch(_){} finally { isVisualizing=false; setControlsEnabled(true); setStatus('Idle','idle'); speedRange.value=prevVal; speedLabel.textContent=getSpeedLabel(); computeCellSize(); }
  })();

  window.Ariadne={ get grid(){return grid}, get rows(){return rows}, get cols(){return cols}, initGrid, clearWalls, clearPathState, computeCellSize };
})();
