(function(){
'use strict';

const canvas = document.getElementById('c');
const W = ()=>window.innerWidth, H = ()=>window.innerHeight;

// ── Scene (Toss TDS palette) ─────────────────────────────────────────────────
const BG = 0xf9fafb;
const CLAY = 0x1957c2;    // darker blue
const ACCENT = 0x3182f6;
const WALL_THICKNESS_CM = 0.5; // fixed 5mm

const SIZE_MIN = 0.5;
const H_MAX = 50;
const W_MAX = 20;

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.FogExp2(BG, 0.004);

const camera = new THREE.PerspectiveCamera(40, W()/H(), 0.1, 2000);

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setSize(W(), H());
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;

window.addEventListener('resize', ()=>{
  camera.aspect = W()/H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H());
});

// ── Lights ────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 2.4));
const key = new THREE.SpotLight(0xffffff, 4.0, 500, Math.PI/4.2, 0.5, 1.0);
key.position.set(25, 50, 35); key.castShadow = true;
key.shadow.mapSize.set(1024,1024); key.shadow.bias = -0.0008;
scene.add(key); scene.add(key.target);
const fill = new THREE.DirectionalLight(0xe8f3ff, 1.0);
fill.position.set(-25, 15, -10);
scene.add(fill);

// ── Scale: 1 Three.js unit = 1 cm ───────────────────────────────────────────
let heightCm = 5, widthCm = 5;
let PHT = heightCm;
const N = 30, SEG = 80;
const MIN_R = 0.05;
const MAX_R = 30;

function clampDim(cm, min, max) {
  return Math.max(min, Math.min(max, Math.round(cm * 2) / 2));
}

function getActualSize() {
  const ys = profile.map(p => p.y);
  const rs = profile.map(p => p.r);
  const height = Math.max(...ys) - Math.min(...ys);
  const diameter = Math.max(...rs) * 2;
  return { height, diameter, maxR: Math.max(...rs) };
}

// ── Profile ───────────────────────────────────────────────────────────────────
function makeProfile(type) {
  const baseR = widthCm / 2;
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i/(N-1), y = -PHT/2 + t*PHT;
    let r;
    if (type === 'vase') {
      const v = 0.12 + Math.sin(t*Math.PI)*0.68 + Math.sin(t*Math.PI*1.9+0.3)*0.13;
      r = baseR * (v / 0.93);
      if (t > 0.88) r = baseR * 0.22;
    } else if (type === 'bowl') {
      r = baseR * ((0.14 + Math.sin(t*Math.PI*0.82)*0.72) / 0.86);
      if (t > 0.88) r = Math.max(baseR * 0.45, r);
    } else {
      r = baseR;
    }
    out.push({ r: Math.max(MIN_R, r), y });
  }
  return out;
}

let profile = makeProfile('cylinder'), lastPreset = 'cylinder';

// ── Clay meshes ───────────────────────────────────────────────────────────────
const clayMat = new THREE.MeshStandardMaterial({
  color: CLAY, roughness: 0.42, metalness: 0.08,
  emissive: 0x1a5fc7, emissiveIntensity: 0.12
});
let clayMesh = null, bottomCap = null, topCap = null, posAttr = null;

function createSide() {
  if (clayMesh) { scene.remove(clayMesh); clayMesh.geometry.dispose(); }
  const geo = new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p.r,p.y)), SEG);
  clayMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: CLAY, roughness: 0.42, metalness: 0.08,
    emissive: 0x1a5fc7, emissiveIntensity: 0.12,
    side: THREE.DoubleSide
  }));
  clayMesh.castShadow = true; clayMesh.receiveShadow = true;
  scene.add(clayMesh); posAttr = geo.attributes.position;
}

function updateBottomCap() {
  if (bottomCap) { scene.remove(bottomCap); bottomCap.geometry.dispose(); }
  bottomCap = new THREE.Mesh(new THREE.CircleGeometry(profile[0].r, SEG), clayMat);
  bottomCap.rotation.x = -Math.PI/2; bottomCap.position.y = profile[0].y;
  scene.add(bottomCap);
}

function updateTopCap() {
  if (topCap) { scene.remove(topCap); topCap.geometry.dispose(); }
  topCap = new THREE.Mesh(new THREE.CircleGeometry(profile[N-1].r, SEG), clayMat);
  topCap.rotation.x = Math.PI/2; topCap.position.y = profile[N-1].y;
  scene.add(topCap);
}

function createClay() { createSide(); updateBottomCap(); updateTopCap(); updateSizeGuide(); }

function updateClayFast() {
  for (let i=0; i<=SEG; i++) {
    const phi=(i/SEG)*Math.PI*2, s=Math.sin(phi), c=Math.cos(phi);
    for (let j=0; j<N; j++) {
      posAttr.setX(i*N+j, profile[j].r*s);
      posAttr.setZ(i*N+j, profile[j].r*c);
    }
  }
  posAttr.needsUpdate = true;
  clayMesh.geometry.computeVertexNormals();
  updateBottomCap(); updateTopCap(); updateSizeGuide();
}

// Floor + cm grid (scaled to model size)
const FLOOR_BASE = 80;
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(FLOOR_BASE, 64),
  new THREE.MeshStandardMaterial({ color:0xf2f4f6, roughness:1 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(FLOOR_BASE, 80, 0xc9e2ff, 0xe5e8eb);
grid.position.y = 0.01;
scene.add(grid);

function updateFloor() {
  const span = getObjectSpan();
  const floorSize = Math.max(FLOOR_BASE, span * 5);
  const s = floorSize / FLOOR_BASE;
  floor.scale.set(s, 1, s);
  grid.scale.set(s, 1, s);
  const y = -PHT / 2 - 0.15;
  floor.position.y = y;
  grid.position.y = y + 0.01;
}

updateFloor();

// Size guide — wireframe box matching heightCm × widthCm exactly
let sizeGuide = null;
function updateSizeGuide() {
  if (sizeGuide) { scene.remove(sizeGuide); sizeGuide.geometry.dispose(); }
  const { height, diameter } = getActualSize();
  const box = new THREE.BoxGeometry(diameter, height, diameter);
  box.translate(0, 0, 0);
  const edges = new THREE.EdgesGeometry(box);
  sizeGuide = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: ACCENT, transparent: true, opacity: 0.3
  }));
  scene.add(sizeGuide);
}

// Highlight ring
const hlMat = new THREE.MeshBasicMaterial({ color:ACCENT, transparent:true, opacity:0 });
const hlRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 72), hlMat);
hlRing.rotation.x = Math.PI/2; scene.add(hlRing);

createClay();

// ── Camera orbit ──────────────────────────────────────────────────────────────
const orbit = { theta:0, phi:1.1, radius:14, targetY:0, zoomMin:6, zoomMax:120 };

function getObjectSpan() {
  const { height, diameter } = getActualSize();
  return Math.max(height, diameter, SIZE_MIN);
}

function fitCamera() {
  const span = getObjectSpan();
  orbit.radius = span * 3.5;
  orbit.zoomMin = span * 1.5;
  orbit.zoomMax = span * 15;
  updateFloor();
  updateCamera();
}

function updateCamera() {
  const s = Math.sin(orbit.phi);
  camera.position.set(
    orbit.radius * s * Math.sin(orbit.theta),
    orbit.targetY + orbit.radius * Math.cos(orbit.phi),
    orbit.radius * s * Math.cos(orbit.theta)
  );
  camera.lookAt(0, orbit.targetY, 0);
}
fitCamera();

// ── Interaction ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
let mode = 'idle'; // 'sculpt' | 'orbit'
let selRing = -1, lastClientX = 0, orbitLast = {x:0,y:0};

const statusEl = document.getElementById('status');
const barDotEl = document.getElementById('barDot');
const VBAR_H   = 220;

function setStatus(text, active = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('active', active);
}

const READY_STATUS = `준비됨 · 벽두께 ${(WALL_THICKNESS_CM * 10).toFixed(0)}mm`;

function getRing(wy) {
  let best=0, bestD=Infinity;
  profile.forEach((p,i)=>{ const d=Math.abs(p.y-wy); if(d<bestD){bestD=d;best=i;} });
  return best;
}

function applyEdit(idx, delta) {
  const sig = 2.9;
  profile.forEach((p,i)=>{
    const w = Math.exp(-((i-idx)*(i-idx))/(2*sig*sig));
    p.r = Math.max(MIN_R, Math.min(MAX_R, p.r + delta*w));
  });
  updateClayFast(); updateHighlight(); drawProfile();
}

function updateHighlight() {
  if (selRing<0) { hlMat.opacity=0; barDotEl.style.opacity='0'; return; }
  const p = profile[selRing];
  hlRing.position.y = p.y; hlRing.scale.set(p.r, 1, p.r); hlMat.opacity=0.5;
  const t = selRing/(N-1);
  barDotEl.style.top = ((1-t)*VBAR_H)+'px'; barDotEl.style.opacity='1';
}

// Unified pointer down: try sculpt → fallback to orbit
canvas.addEventListener('mousedown', e=>{
  if (e.button !== 0) return;
  const ndc = new THREE.Vector2((e.clientX/W())*2-1, -(e.clientY/H())*2+1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([clayMesh, bottomCap, topCap].filter(Boolean));
  if (hits.length) {
    mode = 'sculpt';
    selRing = getRing(hits[0].point.y); lastClientX = e.clientX;
    canvas.style.cursor = 'ew-resize';
    setStatus(`조각 중 · ${selRing + 1}번째 줄`, true);
    updateHighlight();
  } else {
    mode = 'orbit';
    orbitLast = {x:e.clientX, y:e.clientY};
    canvas.style.cursor = 'grab';
    setStatus('회전 중', true);
  }
});

canvas.addEventListener('mousemove', e=>{
  if (mode === 'sculpt') {
    const dx = e.clientX - lastClientX; lastClientX = e.clientX;
    applyEdit(selRing, dx * 0.02);
  } else if (mode === 'orbit') {
    orbit.theta -= (e.clientX - orbitLast.x) * 0.008;
    orbit.phi = Math.max(0.05, Math.min(Math.PI-0.05, orbit.phi - (e.clientY-orbitLast.y)*0.008));
    orbitLast = {x:e.clientX, y:e.clientY};
    updateCamera();
  }
});

canvas.addEventListener('mouseup', ()=>{
  mode='idle'; selRing=-1; canvas.style.cursor='crosshair';
  hlMat.opacity=0; barDotEl.style.opacity='0';
  setStatus(READY_STATUS);
});
canvas.addEventListener('mouseleave', ()=>{
  mode='idle'; selRing=-1; hlMat.opacity=0; barDotEl.style.opacity='0';
  setStatus(READY_STATUS);
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  orbit.radius = Math.max(orbit.zoomMin, Math.min(orbit.zoomMax, orbit.radius + e.deltaY*0.012));
  updateCamera();
}, {passive:false});

// Touch
canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  const t = e.touches[0];
  const ndc = new THREE.Vector2((t.clientX/W())*2-1, -(t.clientY/H())*2+1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([clayMesh,bottomCap,topCap].filter(Boolean));
  if (hits.length) {
    mode='sculpt'; selRing=getRing(hits[0].point.y); lastClientX=t.clientX;
    setStatus(`조각 중 · ${selRing + 1}번째 줄`, true);
    updateHighlight();
  } else {
    mode='orbit'; orbitLast={x:t.clientX,y:t.clientY};
    setStatus('회전 중', true);
  }
},{passive:false});
canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  const t = e.touches[0];
  if (mode==='sculpt') { const dx=t.clientX-lastClientX; lastClientX=t.clientX; applyEdit(selRing,dx*0.02); }
  else if (mode==='orbit') {
    orbit.theta -= (t.clientX-orbitLast.x)*0.008;
    orbit.phi = Math.max(0.05,Math.min(Math.PI-0.05, orbit.phi-(t.clientY-orbitLast.y)*0.008));
    orbitLast={x:t.clientX,y:t.clientY}; updateCamera();
  }
},{passive:false});
canvas.addEventListener('touchend', ()=>{
  mode='idle'; selRing=-1; hlMat.opacity=0; barDotEl.style.opacity='0';
  setStatus(READY_STATUS);
});

// ── Height & Width controls ───────────────────────────────────────────────────
function applyHeightChange(cm) {
  const newCm = clampDim(cm, SIZE_MIN, H_MAX);
  const scale = newCm / heightCm;
  profile.forEach(p=>{ p.y *= scale; });
  PHT = newCm; heightCm = newCm;
  orbit.targetY = 0;
  createClay(); drawProfile(); syncUI(); fitCamera();
}

function applyWidthChange(cm) {
  const newCm = clampDim(cm, SIZE_MIN, W_MAX);
  const scale = newCm / widthCm;
  profile.forEach(p=>{ p.r = Math.max(MIN_R, p.r * scale); });
  widthCm = newCm;
  updateClayFast(); drawProfile(); syncUI(); fitCamera();
}

function syncUI() {
  const hS=document.getElementById('heightSlider'), hI=document.getElementById('heightInput');
  const wS=document.getElementById('widthSlider'),  wI=document.getElementById('widthInput');
  hS.value=heightCm; hI.value=heightCm;
  hS.style.setProperty('--pct', ((heightCm-SIZE_MIN)/(H_MAX-SIZE_MIN)*100).toFixed(1)+'%');
  wS.value=widthCm;  wI.value=widthCm;
  wS.style.setProperty('--pct', ((widthCm-SIZE_MIN)/(W_MAX-SIZE_MIN)*100).toFixed(1)+'%');
}

const pctH = (v)=>((v-SIZE_MIN)/(H_MAX-SIZE_MIN)*100).toFixed(1)+'%';
const pctW = (v)=>((v-SIZE_MIN)/(W_MAX-SIZE_MIN)*100).toFixed(1)+'%';

const hSl=document.getElementById('heightSlider'), hIn=document.getElementById('heightInput');
hSl.addEventListener('input',  ()=>{ hIn.value=hSl.value; hSl.style.setProperty('--pct',pctH(+hSl.value)); applyHeightChange(+hSl.value); });
hIn.addEventListener('change', ()=>applyHeightChange(+hIn.value));
hIn.addEventListener('keydown',e=>{ if(e.key==='Enter')hIn.blur(); });

const wSl=document.getElementById('widthSlider'),  wIn=document.getElementById('widthInput');
wSl.addEventListener('input',  ()=>{ wIn.value=wSl.value; wSl.style.setProperty('--pct',pctW(+wSl.value)); applyWidthChange(+wSl.value); });
wIn.addEventListener('change', ()=>applyWidthChange(+wIn.value));
wIn.addEventListener('keydown',e=>{ if(e.key==='Enter')wIn.blur(); });

// ── Buttons ───────────────────────────────────────────────────────────────────
function loadPreset(type) {
  lastPreset=type; profile=makeProfile(type);
  createClay(); drawProfile(); fitCamera();
}
document.getElementById('btnSmooth').addEventListener('click',()=>{
  profile=profile.map((p,i,a)=>({...p,r:i===0||i===N-1?p.r:a[i-1].r*0.25+p.r*0.5+a[i+1].r*0.25}));
  updateClayFast(); drawProfile();
});
document.getElementById('btnVase' ).addEventListener('click',()=>loadPreset('vase'));
document.getElementById('btnBowl' ).addEventListener('click',()=>loadPreset('bowl'));
document.getElementById('btnCyl'  ).addEventListener('click',()=>loadPreset('cylinder'));
document.getElementById('btnReset').addEventListener('click',()=>{
  heightCm=5; widthCm=5; PHT=5;
  loadPreset('cylinder');
  syncUI();
});

// ── Profile 2D canvas ─────────────────────────────────────────────────────────
const pCanvas=document.getElementById('profileCanvas');
const pCtx=pCanvas.getContext('2d');
const PW=pCanvas.width, PC_H=pCanvas.height, PM=6;

function drawProfile() {
  pCtx.clearRect(0,0,PW,PC_H);
  const yMin = Math.min(...profile.map(p => p.y));
  const yMax = Math.max(...profile.map(p => p.y));
  const actualH = yMax - yMin;
  const refR = widthCm / 2;
  const scale = Math.min((PW / 2 - PM) / refR, (PC_H - 2 * PM) / actualH);

  pCtx.beginPath(); pCtx.moveTo(PW/2,PM); pCtx.lineTo(PW/2,PC_H-PM);
  pCtx.setLineDash([2,3]); pCtx.strokeStyle='rgba(139,149,161,.25)'; pCtx.lineWidth=.5; pCtx.stroke(); pCtx.setLineDash([]);

  pCtx.beginPath();
  profile.forEach((p,i)=>{
    const x=PW/2+p.r*scale;
    const y=PC_H-PM-(p.y-yMin)*scale;
    i===0?pCtx.moveTo(x,y):pCtx.lineTo(x,y);
  });
  for(let i=N-1;i>=0;i--){
    const x=PW/2-profile[i].r*scale;
    const y=PC_H-PM-(profile[i].y-yMin)*scale;
    pCtx.lineTo(x,y);
  }
  pCtx.closePath(); pCtx.fillStyle='rgba(49,130,246,.08)'; pCtx.fill();

  [[0,yMin],[N-1,yMax]].forEach(([ri])=>{
    const ly=PC_H-PM-(profile[ri].y-yMin)*scale;
    const lx=PW/2+profile[ri].r*scale;
    pCtx.beginPath(); pCtx.moveTo(PW/2-profile[ri].r*scale,ly); pCtx.lineTo(lx,ly);
    pCtx.strokeStyle='rgba(49,130,246,.45)'; pCtx.lineWidth=1.3; pCtx.stroke();
  });

  pCtx.beginPath();
  profile.forEach((p,i)=>{ const x=PW/2+p.r*scale, y=PC_H-PM-(p.y-yMin)*scale; i===0?pCtx.moveTo(x,y):pCtx.lineTo(x,y); });
  pCtx.strokeStyle='rgba(49,130,246,.7)'; pCtx.lineWidth=1.4; pCtx.stroke();

  pCtx.beginPath();
  profile.forEach((p,i)=>{ const x=PW/2-p.r*scale, y=PC_H-PM-(p.y-yMin)*scale; i===0?pCtx.moveTo(x,y):pCtx.lineTo(x,y); });
  pCtx.strokeStyle='rgba(49,130,246,.25)'; pCtx.lineWidth=.8; pCtx.stroke();

  if(selRing>=0){
    const y=PC_H-PM-(profile[selRing].y-yMin)*scale;
    pCtx.beginPath(); pCtx.moveTo(0,y); pCtx.lineTo(PW,y);
    pCtx.strokeStyle='rgba(49,130,246,.85)'; pCtx.lineWidth=1.2; pCtx.stroke();
  }
}

drawProfile(); syncUI(); setStatus(READY_STATUS);

// ── Animate (no rotation) ─────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

})();
