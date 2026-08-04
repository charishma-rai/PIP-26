const fs = require('fs');
const path = require('path');

const ROOMS = JSON.parse(fs.readFileSync(path.join(__dirname, './lib/data/rooms.json'), 'utf8'));
const CATS = JSON.parse(fs.readFileSync(path.join(__dirname, './lib/data/categories.json'), 'utf8'));
const PATHWAY = JSON.parse(fs.readFileSync(path.join(__dirname, './lib/data/pathway.json'), 'utf8'));
const COURTYARDS = JSON.parse(fs.readFileSync(path.join(__dirname, './lib/data/courtyards.json'), 'utf8'));

const NODES = {};
const ADJ = {};
function keyOf(x,y){ return Math.round(x)+","+Math.round(y); }
function addNode(x,y){ const id=keyOf(x,y); if(!NODES[id]) NODES[id]={x,y}; return id; }
function addEdge(a,b){
  if(a===b) return;
  const w = Math.hypot(NODES[a].x-NODES[b].x, NODES[a].y-NODES[b].y);
  (ADJ[a]=ADJ[a]||[]).push({to:b,w});
  (ADJ[b]=ADJ[b]||[]).push({to:a,w});
}
function removeEdge(a,b){
  if(ADJ[a]) ADJ[a]=ADJ[a].filter(e=>e.to!==b);
  if(ADJ[b]) ADJ[b]=ADJ[b].filter(e=>e.to!==a);
}
function dist(a,b){ return Math.hypot(NODES[a].x-NODES[b].x, NODES[a].y-NODES[b].y); }

const pwSegments = [];
PATHWAY.forEach(poly=>{
  for(let i=0;i<poly.length-1;i++){
    const [x1,y1]=poly[i], [x2,y2]=poly[i+1];
    const aId=addNode(x1,y1), bId=addNode(x2,y2);
    addEdge(aId,bId);
    pwSegments.push({aId,bId,x1,y1,x2,y2});
  }
});

function nearestOnSegment(px,py, seg){
  const dx=seg.x2-seg.x1, dy=seg.y2-seg.y1;
  const len2 = dx*dx+dy*dy;
  let t = len2===0 ? 0 : ((px-seg.x1)*dx+(py-seg.y1)*dy)/len2;
  t = Math.max(0, Math.min(1,t));
  const x=seg.x1+t*dx, y=seg.y1+t*dy;
  return {x,y,t, d:Math.hypot(px-x,py-y)};
}

const VIS_RECTS = [];
ROOMS.forEach(r=>{ if(!r.virtual && r.x!==null && r.y!==null) VIS_RECTS.push({id:r.id, x:r.x, y:r.y, w:r.w, h:r.h}); });
COURTYARDS.forEach((c,i)=> VIS_RECTS.push({id:'courtyard'+i, x:c.x, y:c.y, w:c.w, h:c.h}));

function segIntersectsRect(x1,y1,x2,y2, rx,ry,rw,rh, shrink=1){
  let rx2=rx+shrink, ry2=ry+shrink, rw2=rw-2*shrink, rh2=rh-2*shrink;
  if(rw2<=0||rh2<=0){ rx2=rx; ry2=ry; rw2=rw; rh2=rh; }
  const xmin=rx2, xmax=rx2+rw2, ymin=ry2, ymax=ry2+rh2;
  const inside=(px,py)=> px>=xmin&&px<=xmax&&py>=ymin&&py<=ymax;
  if(inside(x1,y1)||inside(x2,y2)) return true;
  const ccw=(px,py,qx,qy,rx_,ry_)=> (qx-px)*(ry_-py)-(qy-py)*(rx_-px);
  const segSeg=(ax,ay,bx,by,cx,cy,dx,dy)=>{
    const d1=ccw(cx,cy,dx,dy,ax,ay), d2=ccw(cx,cy,dx,dy,bx,by);
    const d3=ccw(ax,ay,bx,by,cx,cy), d4=ccw(ax,ay,bx,by,dx,dy);
    return ((d1>0&&d2<0)||(d1<0&&d2>0)) && ((d3>0&&d4<0)||(d3<0&&d4>0));
  };
  const edges=[[xmin,ymin,xmax,ymin],[xmax,ymin,xmax,ymax],[xmax,ymax,xmin,ymax],[xmin,ymax,xmin,ymin]];
  for(const [ex1,ey1,ex2,ey2] of edges){ if(segSeg(x1,y1,x2,y2, ex1,ey1,ex2,ey2)) return true; }
  return false;
}

function hasClearLOS(x1,y1,x2,y2, excludeId){
  for(const rect of VIS_RECTS){
    if(rect.id===excludeId) continue;
    if(segIntersectsRect(x1,y1,x2,y2, rect.x,rect.y,rect.w,rect.h)) return false;
  }
  return true;
}

const roomProjections = {};
ROOMS.forEach(r=>{
  const [px,py]=r.node;
  let best=null, bestSeg=-1;
  pwSegments.forEach((seg,i)=>{
    const p = nearestOnSegment(px,py,seg);
    if(best && p.d >= best.d) return;
    if(hasClearLOS(px,py,p.x,p.y,r.id)){ best=p; bestSeg=i; }
  });
  if(bestSeg>=0) (roomProjections[bestSeg] = roomProjections[bestSeg] || []).push({roomId:r.id, t:best.t, x:best.x, y:best.y});
});

pwSegments.forEach((seg,i)=>{
  const rooms = roomProjections[i];
  if(!rooms || !rooms.length) return;
  rooms.sort((a,b)=>a.t-b.t);
  removeEdge(seg.aId, seg.bId);
  let prevId = seg.aId;
  rooms.forEach(rp=>{
    let nodeId;
    if(rp.t<=0.015) nodeId=seg.aId;
    else if(rp.t>=0.985) nodeId=seg.bId;
    else nodeId=addNode(rp.x, rp.y);
    if(nodeId!==prevId) addEdge(prevId, nodeId);
    if(!NODES[rp.roomId]){
      const rm = ROOMS.find(r=>r.id===rp.roomId);
      NODES[rp.roomId] = {x:rm.node[0], y:rm.node[1]};
    }
    addEdge(rp.roomId, nodeId);
    prevId = nodeId;
  });
  if(prevId!==seg.bId) addEdge(prevId, seg.bId);
});

ROOMS.forEach(r=>{ if(!NODES[r.id]) NODES[r.id]={x:r.node[0], y:r.node[1]}; });

function astar(start, goal){
  const open = new Set([start]);
  const cameFrom = {};
  const g = {[start]:0};
  const h = id => Math.hypot(NODES[id].x-NODES[goal].x, NODES[id].y-NODES[goal].y);
  const f = {[start]: h(start)};
  while(open.size){
    let cur=null, best=Infinity;
    for(const n of open){ if((f[n]??Infinity) < best){best=f[n]; cur=n;} }
    if(cur===goal){
      const path=[cur];
      while(cameFrom[cur]){ cur=cameFrom[cur]; path.unshift(cur); }
      return path;
    }
    open.delete(cur);
    for(const {to,w} of (ADJ[cur]||[])){
      const tentative = g[cur]+w;
      if(tentative < (g[to]??Infinity)){
        cameFrom[to]=cur; g[to]=tentative; f[to]=tentative+h(to);
        open.add(to);
      }
    }
  }
  return null;
}

const testRoutes = [
  ["lounge", "comp_lab5"],
  ["foundation_office", "aiml_lab2"],
  ["board_room", "dept_library"]
];

console.log("Testing 3 sample routes:");
testRoutes.forEach(([from, to]) => {
  const path = astar(from, to);
  if (!path) {
    console.error(`FAILED: No route found between ${from} and ${to}`);
    process.exit(1);
  }
  let distPx = 0;
  for(let i=1;i<path.length;i++) distPx += dist(path[i-1], path[i]);
  console.log(`✓ Route ${from} -> ${to}: ${path.length} waypoints, distance=${Math.round(distPx)}px (~${Math.round(distPx/22)}m)`);
});

// Also test that all non-stair rooms are reachable
const nonStairRooms = ROOMS.filter(r => r.cat !== 'stair');
let unreachables = 0;
for (let i = 0; i < nonStairRooms.length; i++) {
  for (let j = i + 1; j < nonStairRooms.length; j++) {
    const p = astar(nonStairRooms[i].id, nonStairRooms[j].id);
    if (!p) {
      console.error(`UNREACHABLE: ${nonStairRooms[i].id} -> ${nonStairRooms[j].id}`);
      unreachables++;
    }
  }
}

if (unreachables === 0) {
  console.log(`✓ ALL ${nonStairRooms.length} non-stair rooms/entrances are mutually reachable!`);
} else {
  console.error(`FAILED: ${unreachables} pairs are unreachable!`);
  process.exit(1);
}
