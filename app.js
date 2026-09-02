/* Ariadne — Dark Minimalist Maze & Search Engine | Class-Based ES6 */
class PriorityQueue{
  constructor(compare){ this.heap=[]; this.compare=compare; }
  size(){ return this.heap.length; }
  isEmpty(){ return this.heap.length===0; }
  push(v){ this.heap.push(v); this.bubbleUp(this.heap.length-1); }
  pop(){
    if(!this.heap.length) return undefined;
    const top=this.heap[0]; const last=this.heap.pop();
    if(this.heap.length){ this.heap[0]=last; this.bubbleDown(0); }
    return top;
  }
  bubbleUp(i){
    const h=this.heap,c=this.compare;
    while(i>0){ const p=(i-1)>>1; if(c(h[i],h[p])>=0) break; [h[i],h[p]]=[h[p],h[i]]; i=p; }
  }
  bubbleDown(i){
    const h=this.heap,c=this.compare,n=h.length;
    while(true){ let s=i,l=i*2+1,r=l+1; if(l<n&&c(h[l],h[s])<0) s=l; if(r<n&&c(h[r],h[s])<0) s=r; if(s===i) break; [h[i],h[s]]=[h[s],h[i]]; i=s; }
  }
}

class GridState{
  constructor(gridEl, stageEl){
    this.gridEl=gridEl; this.stageEl=stageEl;
    this.rows=0; this.cols=0; this.grid=[];
    this.start={r:1,c:1}; this.target={r:1,c:1};
    this.renderQueue=new Set(); this.rafPending=false;
    this.navEl=document.getElementById('nav');
    this.legendEl=document.getElementById('legend');
    this.ribbonEl=document.getElementById('ribbon');
  }
  createNode(r,c){ return {r,c,type:'empty',state:'unvisited',g:Infinity,h:0,f:Infinity,parent:null,parentB:null,el:null}; }
  init(rows,cols){
    if(rows%2===0) rows++; if(cols%2===0) cols++;
    this.rows=rows; this.cols=cols;
    this.start={r:1,c:1}; this.target={r:rows-2,c:cols-2};
    this.grid=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>this.createNode(r,c)));
    this.grid[this.start.r][this.start.c].type='start';
    this.grid[this.target.r][this.target.c].type='target';
    this.renderAll();
    this.computeCellSize();
  }
  computeCellSize(){
    const navH=this.navEl?this.navEl.offsetHeight:64;
    const legH=this.legendEl?this.legendEl.offsetHeight:28;
    const ribH=this.ribbonEl?this.ribbonEl.offsetHeight:28;
    const availW=window.innerWidth-20;
    const availH=window.innerHeight - navH - legH - ribH - 16;
    if(availW<=0||availH<=0) return;
    const gap=1, pad=4;
    const w=Math.floor((availW - pad - (this.cols-1)*gap)/this.cols);
    const h=Math.floor((availH - pad - (this.rows-1)*gap)/this.rows);
    const size=Math.max(6,Math.min(26,Math.min(w,h)));
    document.documentElement.style.setProperty('--cell-size',size+'px');
    this.gridEl.style.setProperty('--cell-size',size+'px');
    this.gridEl.style.setProperty('--cols',this.cols);
    this.gridEl.style.setProperty('--rows',this.rows);
  }
  renderAll(){
    this.gridEl.style.setProperty('--cols',this.cols);
    this.gridEl.style.setProperty('--rows',this.rows);
    this.gridEl.innerHTML='';
    const frag=document.createDocumentFragment();
    for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++){
      const n=this.grid[r][c];
      const d=document.createElement('div');
      d.className='cell'; d.dataset.r=r; d.dataset.c=c; d.setAttribute('role','gridcell');
      n.el=d; this.syncClassImmediate(n); frag.appendChild(d);
    }
    this.gridEl.appendChild(frag);
    requestAnimationFrame(()=>this.computeCellSize());
  }
  syncClassImmediate(n){
    const el=n.el; if(!el) return;
    el.className='cell';
    if(n.type==='wall') el.classList.add('wall');
    else if(n.type==='weight') el.classList.add('weight');
    if(n.state==='visited') el.classList.add('visited');
    else if(n.state==='frontier') el.classList.add('frontier');
    else if(n.state==='path') el.classList.add('path');
    if(n.r===this.start.r&&n.c===this.start.c) el.classList.add('start');
    if(n.r===this.target.r&&n.c===this.target.c) el.classList.add('target');
  }
  queueRender(n){
    this.renderQueue.add(n);
    if(this.rafPending) return;
    this.rafPending=true;
    requestAnimationFrame(()=>{
      for(const node of this.renderQueue) this.syncClassImmediate(node);
      this.renderQueue.clear(); this.rafPending=false;
    });
  }
  flushQueue(){
    for(const node of this.renderQueue) this.syncClassImmediate(node);
    this.renderQueue.clear(); this.rafPending=false;
  }
  syncAllImmediate(){ for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++) this.syncClassImmediate(this.grid[r][c]); }
  getNode(r,c){ if(r<0||r>=this.rows||c<0||c>=this.cols) return null; return this.grid[r][c]; }
  getNeighbors(node){
    const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    const res=[];
    for(const [dr,dc] of dirs){
      const n=this.getNode(node.r+dr,node.c+dc);
      if(!n||n.type==='wall') continue;
      res.push(n);
    }
    return res;
  }
  nodeCost(n){ return n.type==='weight'?5:1; }
  isStart(n){ return n.r===this.start.r&&n.c===this.start.c; }
  isTarget(n){ return n.r===this.target.r&&n.c===this.target.c; }
  clearPathState(){
    for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++){
      const n=this.grid[r][c];
      if(n.state==='visited'||n.state==='frontier'||n.state==='path'){
        n.state='unvisited'; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; n.parentB=null;
      }
    }
    this.syncAllImmediate();
  }
  clearWalls(){
    for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++){
      const n=this.grid[r][c]; n.type='empty'; n.state='unvisited'; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; n.parentB=null;
    }
    this.grid[this.start.r][this.start.c].type='start';
    this.grid[this.target.r][this.target.c].type='target';
    this.syncAllImmediate();
  }
  heuristic(a,b,euclidean=false){
    const dx=Math.abs(a.r-b.r), dy=Math.abs(a.c-b.c);
    return euclidean?Math.hypot(dx,dy):dx+dy;
  }
}

class MazeFactory{
  constructor(gridState){ this.gs=gridState; }
  rand(n){ return Math.floor(Math.random()*n); }
  choice(arr){ return arr[this.rand(arr.length)]; }
  clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
  async sleepIfNeeded(token, delay){
    if(delay===0) return;
    await new Promise(r=>setTimeout(r,delay));
    if(token.cancelled) throw new Error('aborted');
  }
  async backtracking(token, delay){
    const gs=this.gs;
    for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++){ const n=gs.grid[r][c]; n.type='wall'; n.state='unvisited'; n.parent=null; n.parentB=null; }
    gs.syncAllImmediate();
    const carve=(r,c)=>{ const n=gs.grid[r][c]; n.type='empty'; if(delay===0) gs.renderQueue.add(n); else gs.syncClassImmediate(n); };
    const sr=(gs.start.r%2===0?gs.start.r+1:gs.start.r), sc=(gs.start.c%2===0?gs.start.c+1:gs.start.c);
    const startCarve={r:this.clamp(sr,1,gs.rows-2),c:this.clamp(sc,1,gs.cols-2)};
    carve(startCarve.r,startCarve.c);
    const stack=[startCarve]; const visited=new Set([`${startCarve.r},${startCarve.c}`]);
    const dirs=[[-2,0],[2,0],[0,-2],[0,2]];
    let steps=0;
    while(stack.length){
      if(token.cancelled) throw new Error('aborted');
      const cur=stack[stack.length-1];
      const cand=[];
      for(const [dr,dc] of dirs){
        const nr=cur.r+dr,nc=cur.c+dc;
        if(nr<=0||nr>=gs.rows-1||nc<=0||nc>=gs.cols-1) continue;
        const k=`${nr},${nc}`; if(visited.has(k)) continue;
        cand.push({r:nr,c:nc,dr,dc});
      }
      if(!cand.length){ stack.pop(); continue; }
      const nxt=this.choice(cand); visited.add(`${nxt.r},${nxt.c}`);
      carve(cur.r+nxt.dr/2,cur.c+nxt.dc/2); carve(nxt.r,nxt.c);
      stack.push({r:nxt.r,c:nxt.c});
      steps++; if(delay!==0&&steps%3===0) await this.sleepIfNeeded(token,delay); else if(delay===0&&steps%60===0) gs.flushQueue();
    }
    for(const p of [gs.start,gs.target]){
      gs.grid[p.r][p.c].type=p===gs.start?'start':'target';
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const n=gs.getNode(p.r+dr,p.c+dc);
        if(n&&n.type==='wall'&&Math.random()<0.92){ n.type='empty'; gs.syncClassImmediate(n); }
      }
    }
    gs.flushQueue(); gs.syncAllImmediate();
  }
  async prims(token, delay){
    const gs=this.gs;
    for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++){ const n=gs.grid[r][c]; n.type='wall'; n.state='unvisited'; }
    gs.syncAllImmediate();
    let cr=gs.start.r%2===0?gs.start.r+1:gs.start.r, cc=gs.start.c%2===0?gs.start.c+1:gs.start.c;
    cr=this.clamp(cr,1,gs.rows-2); cc=this.clamp(cc,1,gs.cols-2);
    gs.grid[cr][cc].type='empty'; gs.syncClassImmediate(gs.grid[cr][cc]);
    const frontier=[]; const add=(r,c,fr,fc)=>{ if(r<=0||r>=gs.rows-1||c<=0||c>=gs.cols-1) return; if(gs.grid[r][c].type!=='wall') return; frontier.push({r,c,fr,fc}); };
    const dirs=[[-2,0],[2,0],[0,-2],[0,2]];
    for(const [dr,dc] of dirs) add(cr+dr,cc+dc,cr,cc);
    let iter=0;
    while(frontier.length){
      if(token.cancelled) throw new Error('aborted');
      const idx=this.rand(frontier.length); const cur=frontier.splice(idx,1)[0];
      if(gs.grid[cur.r][cur.c].type!=='wall') continue;
      const wr=(cur.r+cur.fr)/2, wc=(cur.c+cur.fc)/2;
      gs.grid[wr][wc].type='empty'; gs.syncClassImmediate(gs.grid[wr][wc]);
      gs.grid[cur.r][cur.c].type='empty'; gs.syncClassImmediate(gs.grid[cur.r][cur.c]);
      for(const [dr,dc] of dirs) add(cur.r+dr,cur.c+dc,cur.r,cur.c);
      iter++; if(delay!==0&&iter%4===0) await this.sleepIfNeeded(token,delay);
    }
    gs.grid[gs.start.r][gs.start.c].type='start'; gs.grid[gs.target.r][gs.target.c].type='target';
    gs.flushQueue(); gs.syncAllImmediate();
  }
  async kruskal(token, delay){
    const gs=this.gs;
    for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++){ const n=gs.grid[r][c]; n.type='wall'; n.state='unvisited'; }
    gs.syncAllImmediate();
    const cells=[]; const idxMap=new Map();
    for(let r=1;r<gs.rows-1;r+=2) for(let c=1;c<gs.cols-1;c+=2){ idxMap.set(`${r},${c}`,cells.length); cells.push({r,c}); }
    const parent=cells.map((_,i)=>i), rank=cells.map(()=>0);
    const find=(x)=>{ while(parent[x]!==x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; };
    const union=(a,b)=>{
      let ra=find(a), rb=find(b); if(ra===rb) return false;
      if(rank[ra]<rank[rb]) [ra,rb]=[rb,ra];
      parent[rb]=ra; if(rank[ra]===rank[rb]) rank[ra]++; return true;
    };
    const walls=[];
    for(let r=1;r<gs.rows-1;r+=2) for(let c=1;c<gs.cols-1;c+=2){
      if(r+2<gs.rows-1) walls.push({r:r+1,c,a:`${r},${c}`,b:`${r+2},${c}`});
      if(c+2<gs.cols-1) walls.push({r,c:c+1,a:`${r},${c}`,b:`${r},${c+2}`});
    }
    for(let i=walls.length-1;i>0;i--){ const j=this.rand(i+1); [walls[i],walls[j]]=[walls[j],walls[i]]; }
    for(const {r,c} of cells){ gs.grid[r][c].type='empty'; gs.syncClassImmediate(gs.grid[r][c]); }
    let p=0;
    for(const w of walls){
      if(token.cancelled) throw new Error('aborted');
      const ai=idxMap.get(w.a), bi=idxMap.get(w.b);
      if(ai===undefined||bi===undefined) continue;
      if(union(ai,bi)){ gs.grid[w.r][w.c].type='empty'; gs.syncClassImmediate(gs.grid[w.r][w.c]); }
      p++; if(delay!==0&&p%12===0) await this.sleepIfNeeded(token,delay); else if(delay===0&&p%80===0) gs.flushQueue();
    }
    gs.grid[gs.start.r][gs.start.c].type='start'; gs.grid[gs.target.r][gs.target.c].type='target';
    gs.flushQueue(); gs.syncAllImmediate();
  }
  async division(token, delay, r0=0,c0=0,r1=null,c1=null,depth=0){
    const gs=this.gs;
    if(depth===0){
      if(r1===null) r1=gs.rows; if(c1===null) c1=gs.cols;
      for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++){ const n=gs.grid[r][c]; n.type='empty'; n.state='unvisited'; }
      for(let r=0;r<gs.rows;r++){ gs.grid[r][0].type='wall'; gs.grid[r][gs.cols-1].type='wall'; }
      for(let c=0;c<gs.cols;c++){ gs.grid[0][c].type='wall'; gs.grid[gs.rows-1][c].type='wall'; }
      gs.grid[gs.start.r][gs.start.c].type='start'; gs.grid[gs.target.r][gs.target.c].type='target';
      gs.syncAllImmediate(); if(delay!==0) await this.sleepIfNeeded(token,delay*2);
      await this.division(token,delay,1,1,gs.rows-1,gs.cols-1,1);
      gs.flushQueue(); gs.syncAllImmediate(); return;
    }
    if(token.cancelled) throw new Error('aborted');
    const h=r1-r0,w=c1-c0; if(h<3||w<3) return;
    const horiz=h>w?true:w>h?false:Math.random()<0.5;
    if(horiz){
      const r=r0+1+this.rand(h-2); const passage=c0+this.rand(w);
      for(let c=c0;c<c1;c++){ if(c===passage) continue; const n=gs.grid[r][c]; if((n.r===gs.start.r&&n.c===gs.start.c)||(n.r===gs.target.r&&n.c===gs.target.c)) continue; n.type='wall'; if(delay===0) gs.renderQueue.add(n); else gs.syncClassImmediate(n); }
      if(delay!==0) await this.sleepIfNeeded(token,delay);
      await this.division(token,delay,r0,c0,r,c1,depth+1);
      await this.division(token,delay,r+1,c0,r1,c1,depth+1);
    } else {
      const c=c0+1+this.rand(w-2); const passage=r0+this.rand(h);
      for(let r=r0;r<r1;r++){ if(r===passage) continue; const n=gs.grid[r][c]; if((n.r===gs.start.r&&n.c===gs.start.c)||(n.r===gs.target.r&&n.c===gs.target.c)) continue; n.type='wall'; if(delay===0) gs.renderQueue.add(n); else gs.syncClassImmediate(n); }
      if(delay!==0) await this.sleepIfNeeded(token,delay);
      await this.division(token,delay,r0,c0,r1,c,depth+1);
      await this.division(token,delay,r0,c+1,r1,c1,depth+1);
    }
    if(depth===1) gs.flushQueue();
  }
  async cellular(token, delay){
    const gs=this.gs;
    for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++){ gs.grid[r][c].type=Math.random()<0.42?'wall':'empty'; gs.grid[r][c].state='unvisited'; }
    for(let r=gs.start.r-2;r<=gs.start.r+2;r++) for(let c=gs.start.c-2;c<=gs.start.c+2;c++){ const n=gs.getNode(r,c); if(n) n.type='empty'; }
    for(let r=gs.target.r-2;r<=gs.target.r+2;r++) for(let c=gs.target.c-2;c<=gs.target.c+2;c++){ const n=gs.getNode(r,c); if(n) n.type='empty'; }
    for(let r=0;r<gs.rows;r++){ gs.grid[r][0].type='wall'; gs.grid[r][gs.cols-1].type='wall'; }
    for(let c=0;c<gs.cols;c++){ gs.grid[0][c].type='wall'; gs.grid[gs.rows-1][c].type='wall'; }
    gs.syncAllImmediate(); if(delay!==0) await this.sleepIfNeeded(token,delay*2);
    for(let iter=0;iter<4;iter++){
      if(token.cancelled) throw new Error('aborted');
      const next=gs.grid.map(row=>row.map(n=>n.type));
      for(let r=1;r<gs.rows-1;r++) for(let c=1;c<gs.cols-1;c++){
        if((r===gs.start.r&&c===gs.start.c)||(r===gs.target.r&&c===gs.target.c)) continue;
        let walls=0;
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0&&dc===0) continue; if(gs.grid[r+dr][c+dc].type==='wall') walls++; }
        if(walls>4) next[r][c]='wall'; else if(walls<4) next[r][c]='empty';
      }
      for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++) gs.grid[r][c].type=next[r][c];
      gs.syncAllImmediate(); if(delay!==0) await this.sleepIfNeeded(token,delay*2);
    }
    let wCount=0, wTarget=Math.floor(gs.rows*gs.cols*0.08);
    for(let r=1;r<gs.rows-1&&wCount<wTarget;r++) for(let c=1;c<gs.cols-1&&wCount<wTarget;c++){
      const n=gs.grid[r][c];
      if(n.type==='empty'&&Math.random()<0.06){ n.type='weight'; wCount++; }
    }
    gs.grid[gs.start.r][gs.start.c].type='start'; gs.grid[gs.target.r][gs.target.c].type='target';
    gs.flushQueue(); gs.syncAllImmediate();
  }
  async spiral(token, delay){
    const gs=this.gs;
    for(let r=0;r<gs.rows;r++) for(let c=0;c<gs.cols;c++){ const n=gs.grid[r][c]; n.type='empty'; n.state='unvisited'; }
    for(let r=0;r<gs.rows;r++){ gs.grid[r][0].type='wall'; gs.grid[r][gs.cols-1].type='wall'; }
    for(let c=0;c<gs.cols;c++){ gs.grid[0][c].type='wall'; gs.grid[gs.rows-1][c].type='wall'; }
    gs.syncAllImmediate();
    for(let k=2;k<Math.min(gs.rows,gs.cols)-4;k+=3){
      if(token.cancelled) throw new Error('aborted');
      for(let s=0;s<k;s++){
        const nr=2+s,nc=2+s;
        const n=gs.getNode(nr,nc);
        if(n&& !(nr===gs.start.r&&nc===gs.start.c)&& !(nr===gs.target.r&&nc===gs.target.c)){ n.type='wall'; gs.syncClassImmediate(n); }
      }
      if(delay!==0&&k%6===0) await this.sleepIfNeeded(token,delay);
    }
    let top=2,left=2,bottom=gs.rows-3,right=gs.cols-3,steps=0;
    while(top<bottom&&left<right&&steps<22){
      if(token.cancelled) throw new Error('aborted');
      for(let c=left;c<=right;c++){ if(Math.random()<0.55){ const n=gs.getNode(top,c); if(n&&n.type!=='wall'&&!(n.r===gs.start.r&&n.c===gs.start.c)&&!(n.r===gs.target.r&&n.c===gs.target.c)){ n.type='wall'; gs.syncClassImmediate(n); } } }
      top+=2;
      for(let r=top;r<=bottom;r++){ if(Math.random()<0.55){ const n=gs.getNode(r,right); if(n&&n.type!=='wall'&&!(n.r===gs.start.r&&n.c===gs.start.c)&&!(n.r===gs.target.r&&n.c===gs.target.c)){ n.type='wall'; gs.syncClassImmediate(n); } } }
      right-=2;
      if(top<=bottom) for(let c=right;c>=left;c--){ if(Math.random()<0.55){ const n=gs.getNode(bottom,c); if(n&&n.type!=='wall'&&!(n.r===gs.start.r&&n.c===gs.start.c)&&!(n.r===gs.target.r&&n.c===gs.target.c)){ n.type='wall'; gs.syncClassImmediate(n); } } }
      bottom-=2;
      if(left<=right) for(let r=bottom;r>=top;r--){ if(Math.random()<0.55){ const n=gs.getNode(r,left); if(n&&n.type!=='wall'&&!(n.r===gs.start.r&&n.c===gs.start.c)&&!(n.r===gs.target.r&&n.c===gs.target.c)){ n.type='wall'; gs.syncClassImmediate(n); } } }
      left+=2;
      if(delay!==0) await this.sleepIfNeeded(token,delay);
      steps++;
    }
    gs.grid[gs.start.r][gs.start.c].type='start'; gs.grid[gs.target.r][gs.target.c].type='target';
    gs.flushQueue(); gs.syncAllImmediate();
  }
  generateByDifficulty(difficulty, token, delay){
    if(difficulty==='easy'){
      return Math.random()<0.5 ? this.cellular(token, delay) : this.spiral(token, delay);
    }
    if(difficulty==='hard'){
      return Math.random()<0.6 ? this.backtracking(token, delay) : this.kruskal(token, delay);
    }
    const r=Math.random();
    if(r<0.4) return this.prims(token, delay);
    if(r<0.7) return this.division(token, delay);
    return this.backtracking(token, delay);
  }
}

class PathfindingEngine{
  constructor(gridState){ this.gs=gridState; }
  isAbort(token){ return token.cancelled; }
  async maybeDelay(token, delay){
    if(delay===0) return;
    await new Promise(r=>setTimeout(r,delay));
    if(token.cancelled) throw new Error('aborted');
  }
  markVisited(n, ref, delay){
    if(this.gs.isStart(n)||this.gs.isTarget(n)) return;
    if(n.state==='visited') return;
    n.state='visited';
    if(delay===0) this.gs.renderQueue.add(n); else this.gs.syncClassImmediate(n);
    ref.count++;
  }
  markFrontier(n, delay){
    if(this.gs.isStart(n)||this.gs.isTarget(n)) return;
    if(n.state!=='unvisited') return;
    n.state='frontier';
    if(delay===0) this.gs.renderQueue.add(n); else this.gs.syncClassImmediate(n);
  }
  reconstruct(end){
    const path=[]; let cur=end; while(cur){ path.push(cur); cur=cur.parent; } path.reverse(); return path;
  }
  reconstructBidirectional(meet){
    const fwd=[]; let cur=meet; while(cur){ fwd.push(cur); cur=cur.parent; } fwd.reverse();
    const bwd=[]; cur=meet.parentB; while(cur){ bwd.push(cur); cur=cur.parentB; }
    return fwd.concat(bwd);
  }
  async animatePath(path, token, delay){
    if(!path||!path.length) return;
    if(delay===0){ for(const n of path){ if(this.gs.isStart(n)||this.gs.isTarget(n)) continue; n.state='path'; } this.gs.syncAllImmediate(); return; }
    for(const n of path){
      if(token.cancelled) throw new Error('aborted');
      if(this.gs.isStart(n)||this.gs.isTarget(n)) continue;
      n.state='path'; this.gs.syncClassImmediate(n);
      await new Promise(r=>setTimeout(r,Math.max(6,delay*1.2)));
    }
  }
  async bfs(token, delay, ref){
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c];
    const q=[s]; const seen=new Set([`${s.r},${s.c}`]); s.g=0; s.parent=null; this.markFrontier(s,delay);
    while(q.length){
      if(token.cancelled) throw new Error('aborted');
      const cur=q.shift(); if(cur.state==='frontier') cur.state='unvisited';
      if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
      if(this.gs.isTarget(cur)) return cur;
      if(delay!==0) await this.maybeDelay(token,delay);
      for(const nb of this.gs.getNeighbors(cur)){
        const k=`${nb.r},${nb.c}`; if(seen.has(k)) continue;
        seen.add(k); nb.parent=cur; nb.g=cur.g+1; this.markFrontier(nb,delay); q.push(nb);
      }
    }
    return null;
  }
  async dfs(token, delay, ref){
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c];
    const stack=[s]; const seen=new Set(); s.parent=null;
    while(stack.length){
      if(token.cancelled) throw new Error('aborted');
      const cur=stack.pop(); const k=`${cur.r},${cur.c}`; if(seen.has(k)) continue; seen.add(k);
      if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
      if(this.gs.isTarget(cur)) return cur;
      if(delay!==0) await this.maybeDelay(token,delay);
      const neigh=this.gs.getNeighbors(cur);
      for(let i=neigh.length-1;i>=0;i--){ const nb=neigh[i]; const kk=`${nb.r},${nb.c}`; if(seen.has(kk)) continue; if(!nb.parent) nb.parent=cur; this.markFrontier(nb,delay); stack.push(nb); }
    }
    return null;
  }
  async dijkstra(token, delay, ref){
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; n.g=Infinity; n.f=Infinity; n.parent=null; }
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c]; s.g=0; s.f=0;
    const pq=new PriorityQueue((a,b)=>a.g-b.g); pq.push(s); const closed=new Set();
    while(!pq.isEmpty()){
      if(token.cancelled) throw new Error('aborted');
      const cur=pq.pop(); const k=`${cur.r},${cur.c}`; if(closed.has(k)) continue; closed.add(k);
      if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
      if(this.gs.isTarget(cur)) return cur;
      if(delay!==0) await this.maybeDelay(token,delay);
      for(const nb of this.gs.getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(closed.has(kk)) continue;
        const alt=cur.g+this.gs.nodeCost(nb);
        if(alt<nb.g){ nb.g=alt; nb.f=alt; nb.parent=cur; this.markFrontier(nb,delay); pq.push(nb); }
      }
    }
    return null;
  }
  async astar(token, delay, ref){
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; }
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c], t=this.gs.grid[this.gs.target.r][this.gs.target.c];
    s.g=0; s.h=this.gs.heuristic(s,t,false); s.f=s.h;
    const pq=new PriorityQueue((a,b)=>a.f-b.f); pq.push(s); const closed=new Set();
    while(!pq.isEmpty()){
      if(token.cancelled) throw new Error('aborted');
      const cur=pq.pop(); const k=`${cur.r},${cur.c}`; if(closed.has(k)) continue; closed.add(k);
      if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
      if(this.gs.isTarget(cur)) return cur;
      if(delay!==0) await this.maybeDelay(token,delay);
      for(const nb of this.gs.getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(closed.has(kk)) continue;
        const tentative=cur.g+this.gs.nodeCost(nb);
        if(tentative<nb.g){ nb.parent=cur; nb.g=tentative; nb.h=this.gs.heuristic(nb,t,false); nb.f=nb.g+nb.h; this.markFrontier(nb,delay); pq.push(nb); }
      }
    }
    return null;
  }
  async greedy(token, delay, ref){
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; n.f=Infinity; n.parent=null; }
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c], t=this.gs.grid[this.gs.target.r][this.gs.target.c];
    s.h=this.gs.heuristic(s,t,false); s.f=s.h;
    const pq=new PriorityQueue((a,b)=>a.f-b.f); pq.push(s); const seen=new Set();
    while(!pq.isEmpty()){
      if(token.cancelled) throw new Error('aborted');
      const cur=pq.pop(); const k=`${cur.r},${cur.c}`; if(seen.has(k)) continue; seen.add(k);
      if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
      if(this.gs.isTarget(cur)) return cur;
      if(delay!==0) await this.maybeDelay(token,delay);
      for(const nb of this.gs.getNeighbors(cur)){
        const kk=`${nb.r},${nb.c}`; if(seen.has(kk)) continue; if(nb.parent) continue;
        nb.parent=cur; nb.h=this.gs.heuristic(nb,t,false); nb.f=nb.h; this.markFrontier(nb,delay); pq.push(nb);
      }
    }
    return null;
  }
  async bibfs(token, delay, ref){
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; n.parent=null; n.parentB=null; }
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c], t=this.gs.grid[this.gs.target.r][this.gs.target.c];
    const qF=[s], qB=[t]; const seenF=new Set([`${s.r},${s.c}`]), seenB=new Set([`${t.r},${t.c}`]);
    const visitedF=new Set(), visitedB=new Set(); this.markFrontier(s,delay); this.markFrontier(t,delay);
    while(qF.length&&qB.length){
      if(token.cancelled) throw new Error('aborted');
      if(qF.length){
        const cur=qF.shift(); const k=`${cur.r},${cur.c}`; if(!visitedF.has(k)){
          visitedF.add(k); if(!this.gs.isStart(cur)&&!this.gs.isTarget(cur)) this.markVisited(cur,ref,delay);
          if(seenB.has(k)) return cur;
          if(delay!==0) await this.maybeDelay(token,delay);
          for(const nb of this.gs.getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(seenF.has(kk)) continue; seenF.add(kk); nb.parent=cur; this.markFrontier(nb,delay); qF.push(nb); if(seenB.has(kk)) return nb;
          }
        }
      }
      if(qB.length){
        const cur=qB.shift(); const k=`${cur.r},${cur.c}`; if(!visitedB.has(k)){
          visitedB.add(k); if(!this.gs.isStart(cur)&&!this.gs.isTarget(cur)) this.markVisited(cur,ref,delay);
          if(seenF.has(k)) return cur;
          if(delay!==0) await this.maybeDelay(token,delay);
          for(const nb of this.gs.getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(seenB.has(kk)) continue; seenB.add(kk); nb.parentB=cur; this.markFrontier(nb,delay); qB.push(nb); if(seenF.has(kk)) return nb;
          }
        }
      }
    }
    return null;
  }
  async biastar(token, delay, ref){
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; n.parentB=null; n.gB=Infinity; n.hB=0; n.fB=Infinity; }
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c], t=this.gs.grid[this.gs.target.r][this.gs.target.c];
    s.g=0; s.h=this.gs.heuristic(s,t); s.f=s.h;
    t.gB=0; t.hB=this.gs.heuristic(t,s); t.fB=t.hB;
    const pqF=new PriorityQueue((a,b)=>a.f-b.f); pqF.push(s);
    const pqB=new PriorityQueue((a,b)=>a.fB-b.fB); pqB.push(t);
    const closedF=new Set(), closedB=new Set(); let best=null, bestCost=Infinity;
    const update=(n)=>{ const c=(n.g===Infinity?1e9:n.g)+(n.gB===Infinity?1e9:n.gB); if(c<bestCost){ bestCost=c; best=n; } };
    while(!pqF.isEmpty()&&!pqB.isEmpty()){
      if(token.cancelled) throw new Error('aborted');
      if(!pqF.isEmpty()){
        const cur=pqF.pop(); const k=`${cur.r},${cur.c}`; if(!closedF.has(k)){
          closedF.add(k); if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
          if(closedB.has(k)){ update(cur); break; }
          if(delay!==0) await this.maybeDelay(token,delay);
          for(const nb of this.gs.getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(closedF.has(kk)) continue;
            const tentative=cur.g+this.gs.nodeCost(nb);
            if(tentative<nb.g){ nb.parent=cur; nb.g=tentative; nb.h=this.gs.heuristic(nb,t); nb.f=nb.g+nb.h; this.markFrontier(nb,delay); pqF.push(nb); if(closedB.has(kk)) update(nb); }
          }
        }
      }
      if(!pqB.isEmpty()){
        const cur=pqB.pop(); const k=`${cur.r},${cur.c}`; if(!closedB.has(k)){
          closedB.add(k); if(!this.gs.isTarget(cur)) this.markVisited(cur,ref,delay);
          if(closedF.has(k)){ update(cur); break; }
          if(delay!==0) await this.maybeDelay(token,delay);
          for(const nb of this.gs.getNeighbors(cur)){
            const kk=`${nb.r},${nb.c}`; if(closedB.has(kk)) continue;
            const tentative=(cur.gB===Infinity?0:cur.gB)+this.gs.nodeCost(nb);
            if(tentative<(nb.gB===Infinity?1e9:nb.gB)){ nb.parentB=cur; nb.gB=tentative; nb.hB=this.gs.heuristic(nb,s); nb.fB=nb.gB+nb.hB; this.markFrontier(nb,delay); pqB.push(nb); if(closedF.has(kk)) update(nb); }
          }
        }
      }
      if(best) break;
    }
    if(best) return best;
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; if(n.g!==Infinity&&n.gB!==Infinity) return n; }
    return null;
  }
  hasForced(node, dir){
    const gs=this.gs; const [dr,dc]=dir;
    if(dr===0&&dc!==0){
      const up=gs.getNode(node.r-1,node.c), diagUp=gs.getNode(node.r-1,node.c+dc);
      if(up&&up.type==='wall'&&diagUp&&diagUp.type!=='wall') return true;
      const down=gs.getNode(node.r+1,node.c), diagDown=gs.getNode(node.r+1,node.c+dc);
      if(down&&down.type==='wall'&&diagDown&&diagDown.type!=='wall') return true;
    } else if(dc===0&&dr!==0){
      const left=gs.getNode(node.r,node.c-1), diagLeft=gs.getNode(node.r+dr,node.c-1);
      if(left&&left.type==='wall'&&diagLeft&&diagLeft.type!=='wall') return true;
      const right=gs.getNode(node.r,node.c+1), diagRight=gs.getNode(node.r+dr,node.c+1);
      if(right&&right.type==='wall'&&diagRight&&diagRight.type!=='wall') return true;
    }
    return false;
  }
  jump(from, dir){
    let r=from.r+dir[0], c=from.c+dir[1];
    while(true){
      const node=this.gs.getNode(r,c); if(!node||node.type==='wall') return null;
      if(this.gs.isTarget(node)) return node;
      if(this.hasForced(node,dir)) return node;
      const nr=r+dir[0], nc=c+dir[1];
      const nxt=this.gs.getNode(nr,nc);
      if(!nxt||nxt.type==='wall') return node;
      r=nr; c=nc;
    }
  }
  async jps(token, delay, ref){
    for(let r=0;r<this.gs.rows;r++) for(let c=0;c<this.gs.cols;c++){ const n=this.gs.grid[r][c]; n.g=Infinity; n.h=0; n.f=Infinity; n.parent=null; }
    const s=this.gs.grid[this.gs.start.r][this.gs.start.c], t=this.gs.grid[this.gs.target.r][this.gs.target.c];
    s.g=0; s.h=this.gs.heuristic(s,t); s.f=s.h;
    const pq=new PriorityQueue((a,b)=>a.f-b.f); pq.push(s); const closed=new Set(); const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    while(!pq.isEmpty()){
      if(token.cancelled) throw new Error('aborted');
      const cur=pq.pop(); const k=`${cur.r},${cur.c}`; if(closed.has(k)) continue; closed.add(k);
      if(!this.gs.isStart(cur)) this.markVisited(cur,ref,delay);
      if(this.gs.isTarget(cur)) return cur;
      if(delay!==0) await this.maybeDelay(token,delay);
      for(const dir of dirs){
        const jp=this.jump(cur,dir); if(!jp) continue; const kk=`${jp.r},${jp.c}`; if(closed.has(kk)) continue;
        const dist=Math.abs(jp.r-cur.r)+Math.abs(jp.c-cur.c);
        let wCost=0; let rr=cur.r, cc=cur.c; for(let s=0;s<dist;s++){ rr+=dir[0]; cc+=dir[1]; wCost+=this.gs.nodeCost(this.gs.grid[rr][cc]); }
        const tentative=cur.g+wCost;
        if(tentative<jp.g){ jp.parent=cur; jp.g=tentative; jp.h=this.gs.heuristic(jp,t); jp.f=jp.g+jp.h; this.markFrontier(jp,delay); pq.push(jp); }
      }
    }
    return null;
  }
}

class TouchInputHandler{
  constructor(gridState){
    this.gs=gridState;
    this.draggedType=null; this.mouseDown=false; this.mouseButton=0; this.shiftDown=false;
  }
  cellFromPoint(x,y){
    const el=document.elementFromPoint(x,y);
    if(!el) return null;
    const cell=el.closest('.cell'); if(!cell) return null;
    const r=parseInt(cell.dataset.r,10), c=parseInt(cell.dataset.c,10);
    if(Number.isNaN(r)||Number.isNaN(c)) return null;
    return this.gs.getNode(r,c);
  }
  cellFromEvent(e){
    const el=e.target.closest('.cell'); if(!el) return null;
    const r=parseInt(el.dataset.r,10), c=parseInt(el.dataset.c,10);
    return this.gs.getNode(r,c);
  }
  canPlace(n){ return !(n.r===this.gs.start.r&&n.c===this.gs.start.c) && !(n.r===this.gs.target.r&&n.c===this.gs.target.c); }
  handlePointerDown(e, isVisualizing){
    if(isVisualizing) return;
    if(e.button===2) e.preventDefault();
    const n=this.cellFromEvent(e); if(!n) return;
    this.mouseDown=true; this.mouseButton=e.button; this.shiftDown=e.shiftKey;
    if(n.r===this.gs.start.r&&n.c===this.gs.start.c){ this.draggedType='start'; return; }
    if(n.r===this.gs.target.r&&n.c===this.gs.target.c){ this.draggedType='target'; return; }
    this.draggedType=null; this.paintCell(n,e);
  }
  paintCell(n,e){
    if(!this.canPlace(n)) return;
    const isErase=this.mouseButton===2 || e.shiftKey || this.shiftDown;
    if(isErase){ n.type='empty'; n.state='unvisited'; } else { n.type='wall'; n.state='unvisited'; }
    this.gs.syncClassImmediate(n);
  }
  handlePointerMove(e, isVisualizing){
    this.shiftDown=e.shiftKey;
    if(!this.mouseDown||isVisualizing) return;
    const n=this.cellFromEvent(e); if(!n) return;
    if(this.draggedType){
      if(n.type==='wall') return;
      const old=this.draggedType==='start'?this.gs.grid[this.gs.start.r][this.gs.start.c]:this.gs.grid[this.gs.target.r][this.gs.target.c];
      old.type='empty'; this.gs.syncClassImmediate(old);
      if(this.draggedType==='start'){ this.gs.start.r=n.r; this.gs.start.c=n.c; } else { this.gs.target.r=n.r; this.gs.target.c=n.c; }
      n.type=this.draggedType==='start'?'start':'target'; n.state='unvisited'; this.gs.syncAllImmediate(); return;
    }
    this.paintCell(n,e);
  }
  handlePointerUp(){ this.mouseDown=false; this.draggedType=null; }
  attach(isVisualizingGetter){
    const gridEl=this.gs.gridEl;
    gridEl.addEventListener('pointerdown', e=>{ if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2) return; gridEl.setPointerCapture(e.pointerId); this.handlePointerDown(e,isVisualizingGetter()); });
    gridEl.addEventListener('pointermove', e=>this.handlePointerMove(e,isVisualizingGetter()));
    gridEl.addEventListener('pointerup', e=>{ gridEl.releasePointerCapture(e.pointerId); this.handlePointerUp(); });
    gridEl.addEventListener('pointercancel', ()=>this.handlePointerUp());
    gridEl.addEventListener('contextmenu', e=>e.preventDefault());
    // fallback touch using elementFromPoint
    gridEl.addEventListener('touchstart', e=>{
      const t=e.touches[0]; const n=this.cellFromPoint(t.clientX,t.clientY); if(!n) return;
      this.handlePointerDown({target:n.el, button:0, shiftKey:false, preventDefault:()=>e.preventDefault()}, isVisualizingGetter()); e.preventDefault();
    }, {passive:false});
  }
}

class UIController{
  constructor(gridState, mazeFactory, pathEngine){
    this.gs=gridState; this.mf=mazeFactory; this.pe=pathEngine;
    this.algoSelect=document.getElementById('algoSelect');
    this.mazeSelect=document.getElementById('mazeSelect');
    this.speedRange=document.getElementById('speedRange');
    this.speedLabel=document.getElementById('speedLabel');
    this.visualizeBtn=document.getElementById('visualizeBtn');
    this.generateBtn=document.getElementById('generateBtn');
    this.clearToggle=document.getElementById('clearToggle');
    this.clearMenu=document.getElementById('clearMenu');
    this.difficultyGroup=document.getElementById('difficultyGroup');
    this.densityGroup=document.getElementById('densityGroup');
    this.ribbonAlgo=document.getElementById('ribbonAlgo');
    this.ribbonDifficulty=document.getElementById('ribbonDifficulty');
    this.ribbonStatus=document.getElementById('ribbonStatus');
    this.ribbonVisited=document.getElementById('ribbonVisited');
    this.ribbonPath=document.getElementById('ribbonPath');
    this.ribbonLatency=document.getElementById('ribbonLatency');
    this.toastEl=document.getElementById('toast');
    this.isVisualizing=false;
    this.token={cancelled:false};
    this.speedMap=[
      {label:'Instant', delay:0},
      {label:'Fast', delay:3},
      {label:'Normal', delay:15},
      {label:'Slow', delay:40}
    ];
    this.densityPresets={
      dense:{rows:35,cols:75},
      balanced:{rows:25,cols:55},
      spacious:{rows:17,cols:37}
    };
    this.inputHandler=new TouchInputHandler(gridState);
    this.inputHandler.attach(()=>this.isVisualizing);
    this.bindEvents();
    this.updateSpeedLabel();
    this.updateRibbon(0,0,0);
    this.setupResizeObserver();
  }
  getDelay(){ return this.speedMap[Math.max(0,Math.min(3,parseInt(this.speedRange.value,10)||1))].delay; }
  updateSpeedLabel(){ this.speedLabel.textContent=this.speedMap[Math.max(0,Math.min(3,parseInt(this.speedRange.value,10)||1))].label; }
  getDifficulty(){
    const active=this.difficultyGroup.querySelector('.seg.active');
    return active?active.dataset.difficulty:'medium';
  }
  getDensity(){
    const active=this.densityGroup.querySelector('.density-btn.active');
    return active?active.dataset.density:'balanced';
  }
  toast(msg,kind=''){
    this.toastEl.textContent=msg; this.toastEl.className='toast '+kind; this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastEl._t); this.toastEl._t=setTimeout(()=>this.toastEl.classList.add('hidden'),2400);
  }
  setStatus(s){ this.ribbonStatus.textContent=s; }
  updateRibbon(visited, pathLen, latency){
    this.ribbonVisited.textContent=visited;
    this.ribbonPath.textContent=pathLen==null? '0' : String(pathLen);
    this.ribbonLatency.textContent=(latency==null? '0.0ms' : `${latency.toFixed(1)}ms`);
    this.ribbonAlgo.textContent=(this.algoSelect.options[this.algoSelect.selectedIndex]?.textContent||'A*').toUpperCase().replace(' SEARCH','');
    this.ribbonDifficulty.textContent=this.getDifficulty().toUpperCase();
  }
  setControlsEnabled(v){
    this.generateBtn.disabled=!v; this.algoSelect.disabled=!v; this.mazeSelect.disabled=!v;
    this.clearToggle.disabled=!v;
    this.difficultyGroup.querySelectorAll('button').forEach(b=>b.disabled=!v);
    this.densityGroup.querySelectorAll('button').forEach(b=>b.disabled=!v);
    this.visualizeBtn.disabled=false;
    if(v) this.visualizeBtn.classList.remove('pulsing');
  }
  newToken(){ this.token.cancelled=true; this.token={cancelled:false}; return this.token; }
  setupResizeObserver(){
    let timeout=null;
    const debounced=()=>{
      clearTimeout(timeout);
      timeout=setTimeout(()=>this.gs.computeCellSize(), 80);
    };
    window.addEventListener('resize', debounced);
    window.addEventListener('orientationchange', debounced);
    if(window.ResizeObserver){
      const ro=new ResizeObserver(debounced);
      ro.observe(this.gs.stageEl); ro.observe(this.gs.gridEl);
      const nav=document.getElementById('nav'), legend=document.getElementById('legend'), ribbon=document.getElementById('ribbon');
      if(nav) ro.observe(nav); if(legend) ro.observe(legend); if(ribbon) ro.observe(ribbon);
    }
  }
  bindEvents(){
    this.visualizeBtn.addEventListener('click', ()=>this.runVisualization());
    this.generateBtn.addEventListener('click', ()=>this.runMazeGeneration());
    this.clearToggle.addEventListener('click', ()=>this.clearMenu.classList.toggle('hidden'));
    this.clearMenu.addEventListener('click', e=>{
      const btn=e.target.closest('button'); if(!btn) return;
      const act=btn.dataset.clear;
      this.clearMenu.classList.add('hidden');
      if(act==='path'){ if(this.isVisualizing){ this.token.cancelled=true; this.isVisualizing=false; this.setControlsEnabled(true); } this.gs.clearPathState(); this.updateRibbon(0,0,0); this.setStatus('READY'); this.toast('Path cleared','success'); }
      else if(act==='walls'){ this.gs.clearWalls(); this.updateRibbon(0,0,0); this.setStatus('READY'); this.toast('Walls cleared','success'); }
      else if(act==='reset'){ this.fullReset(); this.toast('Full reset','success'); }
    });
    document.addEventListener('click', e=>{ if(!e.target.closest('.dropdown')) this.clearMenu.classList.add('hidden'); });
    this.difficultyGroup.addEventListener('click', e=>{
      const btn=e.target.closest('button'); if(!btn||this.isVisualizing) return;
      this.difficultyGroup.querySelectorAll('button').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
      this.updateRibbon(this.ribbonVisited.textContent, this.ribbonPath.textContent, 0);
    });
    this.densityGroup.addEventListener('click', e=>{
      const btn=e.target.closest('button'); if(!btn||this.isVisualizing) return;
      this.densityGroup.querySelectorAll('button').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
      const preset=this.densityPresets[btn.dataset.density];
      if(preset){ this.gs.init(preset.rows,preset.cols); this.updateRibbon(0,0,0); this.setStatus('READY'); }
    });
    this.speedRange.addEventListener('input', ()=>this.updateSpeedLabel());
    this.algoSelect.addEventListener('change', ()=>this.updateRibbon(this.ribbonVisited.textContent, this.ribbonPath.textContent, 0));
    window.addEventListener('keydown', e=>{
      if(e.code==='Space'){ e.preventDefault(); this.runVisualization(); }
      if(e.key==='Escape'&&this.isVisualizing) this.token.cancelled=true;
    });
  }
  fullReset(){
    if(this.isVisualizing) this.token.cancelled=true;
    this.isVisualizing=false;
    const key=this.getDensity(); const p=this.densityPresets[key]||this.densityPresets.balanced;
    this.gs.init(p.rows,p.cols);
    this.updateRibbon(0,0,0); this.setStatus('READY');
  }
  async runVisualization(){
    if(this.isVisualizing){
      this.token.cancelled=true; this.isVisualizing=false; this.setStatus('READY'); this.setControlsEnabled(true);
      this.visualizeBtn.classList.remove('pulsing');
      this.visualizeBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.2 1.4 L8.8 5.5 L2.2 9.6 Z" fill="currentColor"/></svg><span>Visualize</span>';
      this.toast('Cancelled','error'); return;
    }
    const algo=this.algoSelect.value;
    const runners={
      bfs:(t,d,r)=>this.pe.bfs(t,d,r),
      dfs:(t,d,r)=>this.pe.dfs(t,d,r),
      dijkstra:(t,d,r)=>this.pe.dijkstra(t,d,r),
      astar:(t,d,r)=>this.pe.astar(t,d,r),
      greedy:(t,d,r)=>this.pe.greedy(t,d,r),
      bibfs:(t,d,r)=>this.pe.bibfs(t,d,r),
      biastar:(t,d,r)=>this.pe.biastar(t,d,r),
      jps:(t,d,r)=>this.pe.jps(t,d,r)
    };
    const runner=runners[algo]; if(!runner){ this.toast('Unknown','error'); return; }
    this.gs.clearPathState();
    const token=this.newToken(); this.isVisualizing=true; this.setControlsEnabled(false);
    this.visualizeBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="1.5" width="2.8" height="8" rx="1" fill="currentColor"/><rect x="6.7" y="1.5" width="2.8" height="8" rx="1" fill="currentColor"/></svg><span>Abort</span>';
    this.visualizeBtn.classList.add('pulsing'); this.setStatus('SEARCHING');
    this.gs.renderQueue.clear();
    const ref={count:0}; const t0=performance.now(); this.ribbonVisited.textContent='0'; this.ribbonPath.textContent='0';
    const delay=this.getDelay();
    try{
      const end=await runner(token,delay,ref);
      const t1=performance.now(); this.gs.flushQueue();
      if(token.cancelled) return;
      if(!end){ this.updateRibbon(ref.count,'∞',t1-t0); this.setStatus('UNREACHABLE'); this.toast('Path Unreachable','error'); }
      else{
        let path;
        if(algo==='bibfs'||algo==='biastar') path=this.pe.reconstructBidirectional(end);
        else path=this.pe.reconstruct(end);
        this.setStatus('FOUND');
        await this.pe.animatePath(path,token,delay); if(token.cancelled) return; this.gs.flushQueue();
        const t2=performance.now();
        let cost=0; for(let i=1;i<path.length;i++) cost+=this.gs.nodeCost(path[i]);
        let label=`${path.length-1}`; if((algo==='dijkstra'||algo==='astar'||algo==='biastar'||algo==='jps') && cost!==path.length-1) label=`${path.length-1} (cost ${cost})`;
        this.updateRibbon(ref.count,label,t2-t0); this.toast(`Path • ${label} • ${ref.count} visited`,'success');
      }
    }catch(e){ if(e.message!=='aborted'){ this.toast(e.message,'error'); this.setStatus('ERROR'); } }
    finally{
      if(!token.cancelled){ this.isVisualizing=false; this.setControlsEnabled(true); this.visualizeBtn.classList.remove('pulsing'); this.visualizeBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.2 1.4 L8.8 5.5 L2.2 9.6 Z" fill="currentColor"/></svg><span>Visualize</span>'; }
    }
  }
  async runMazeGeneration(){
    if(this.isVisualizing) return;
    const kind=this.mazeSelect.value;
    const token=this.newToken(); this.isVisualizing=true; this.setControlsEnabled(false); this.gs.clearPathState(); this.setStatus('GENERATING');
    this.gs.renderQueue.clear(); const t0=performance.now(); const delay=this.getDelay();
    const difficulty=this.getDifficulty();
    const map={
      backtracking:(t,d)=>this.mf.backtracking(t,d),
      prim:(t,d)=>this.mf.prims(t,d),
      kruskal:(t,d)=>this.mf.kruskal(t,d),
      division:(t,d)=>this.mf.division(t,d),
      cellular:(t,d)=>this.mf.cellular(t,d),
      spiral:(t,d)=>this.mf.spiral(t,d)
    };
    let runner=map[kind];
    if(!runner) runner=(t,d)=>this.mf.generateByDifficulty(difficulty,t,d);
    if(kind==='backtracking'||kind==='prim'||kind==='kruskal'||kind==='division'||kind==='cellular'||kind==='spiral'){
      // difficulty influences density variation: Easy adds openness, Hard adds walls
      // For now use selected maze directly, but difficulty modulates afterwards if needed
    }
    try{
      // If difficulty is set, sometimes override with difficulty-based generator for "New Maze"
      // Requirement: New Maze generates based on difficulty. So when Generate clicked, use difficulty.
      // We will prioritize difficulty: if user clicks Generate, use difficulty factory 70% of time.
      // To honor both selectors, use mazeSelect when difficulty is medium, otherwise use difficulty.
      let useDifficulty = difficulty !== 'medium';
      if(useDifficulty){
        await this.mf.generateByDifficulty(difficulty, token, delay);
      } else {
        await runner(token,delay);
      }
      if(token.cancelled) return;
      this.gs.flushQueue(); this.gs.syncAllImmediate();
      const dt=performance.now()-t0; this.updateRibbon(0,0,dt); this.setStatus('READY'); this.toast('Maze generated','success');
    }catch(e){ if(e.message!=='aborted') this.toast(e.message,'error'); }
    finally{ if(!token.cancelled){ this.isVisualizing=false; this.setControlsEnabled(true); this.setStatus('READY'); } }
  }
}

const gridState=new GridState(document.getElementById('grid'), document.getElementById('stage'));
const densityPresets={dense:{rows:35,cols:75},balanced:{rows:25,cols:55},spacious:{rows:17,cols:37}};
gridState.init(densityPresets.balanced.rows, densityPresets.balanced.cols);
const mazeFactory=new MazeFactory(gridState);
const pathEngine=new PathfindingEngine(gridState);
const ui=new UIController(gridState, mazeFactory, pathEngine);

// Auto-randomize Medium maze on load
(async()=>{
  const prev=ui.speedRange.value; ui.speedRange.value="0"; ui.updateSpeedLabel();
  const token=ui.newToken(); ui.isVisualizing=true; ui.setStatus('GENERATING'); gridState.renderQueue.clear();
  try{ await mazeFactory.generateByDifficulty('medium', token, 0); }catch(_){}
  finally{ ui.isVisualizing=false; ui.setControlsEnabled(true); ui.setStatus('READY'); ui.speedRange.value=prev; ui.updateSpeedLabel(); gridState.computeCellSize(); }
})();
window.Ariadne={gridState, mazeFactory, pathEngine, ui, PriorityQueue, GridState, MazeFactory, PathfindingEngine, TouchInputHandler};
