(function(){
'use strict';

const canvas = document.getElementById('c');
const W = ()=>window.innerWidth, H = ()=>window.innerHeight;

// ── Scene (Toss TDS palette) ─────────────────────────────────────────────────
const BG = 0xf9fafb;
const CLAY = 0x1957c2;    // darker blue
const ACCENT = 0x3182f6;
const WALL_THICKNESS_CM = 0.3; // fixed 3mm

const SIZE_MIN = 0.5;
const SIZE_MAX = 20;
const H_MAX = SIZE_MAX;
const W_MAX = SIZE_MAX;

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
let heightCm = 10, widthCm = 10;
let PHT = heightCm;
const N = 30, SEG = 80;
const MIN_R = 0.05;
const MAX_R = SIZE_MAX / 2;

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
      let shape;
      if (t < 0.1) {
        shape = 0.4 + t * 1.8;
      } else if (t < 0.52) {
        const u = (t - 0.1) / 0.42;
        shape = 0.52 + 0.5 * Math.sin(u * Math.PI);
      } else if (t < 0.8) {
        const u = (t - 0.52) / 0.28;
        shape = 1.02 - u * 0.65;
      } else {
        const u = (t - 0.8) / 0.2;
        shape = 0.37 + 0.1 * Math.sin(u * Math.PI);
      }
      r = baseR * shape;
    } else if (type === 'bowl') {
      let shape;
      if (t < 0.14) {
        shape = 0.36 + t * 1.4;
      } else {
        const u = (t - 0.14) / 0.86;
        shape = 0.55 + 0.48 * (1 - Math.cos(u * Math.PI * 0.55));
      }
      if (t > 0.92) shape *= 0.97;
      r = baseR * Math.min(1.02, shape);
    } else {
      r = baseR;
    }
    out.push({ r: Math.max(MIN_R, r), y });
  }
  return out;
}

let profile = makeProfile('cylinder'), lastPreset = 'cylinder';

// ── Clay meshes: outer + inner wall (5mm) + solid bottom cap ────────────────
const clayMat = new THREE.MeshStandardMaterial({
  color: CLAY, roughness: 0.42, metalness: 0.08,
  emissive: 0x1a5fc7, emissiveIntensity: 0.12
});

let clayGroup = null;
let clayWall = null;
let clayBottom = null;

function innerRadius(outerR) {
  return Math.max(0.02, outerR - WALL_THICKNESS_CM);
}

// Closed cross-section: outer wall → top rim → inner wall → bottom rim (5mm wall)
function makeWallShellPoints() {
  const pts = [];
  profile.forEach(p => pts.push(new THREE.Vector2(p.r, p.y)));
  for (let i = profile.length - 1; i >= 0; i--) {
    pts.push(new THREE.Vector2(innerRadius(profile[i].r), profile[i].y));
  }
  return pts;
}

function disposeClayPart(mesh) {
  if (!mesh) return;
  mesh.geometry.dispose();
  mesh.material.dispose();
}

function getClayPickTargets() {
  return [clayWall, clayBottom].filter(Boolean);
}

function buildClayMeshes() {
  if (clayGroup) {
    scene.remove(clayGroup);
    disposeClayPart(clayWall);
    disposeClayPart(clayBottom);
    clayGroup = null;
  }

  clayGroup = new THREE.Group();

  const wallGeo = new THREE.LatheGeometry(makeWallShellPoints(), SEG);
  wallGeo.computeVertexNormals();
  const wallMat = clayMat.clone();
  wallMat.side = THREE.FrontSide;
  clayWall = new THREE.Mesh(wallGeo, wallMat);

  const yMin = profile.reduce((m, p) => Math.min(m, p.y), Infinity);
  const bottomR = profile.reduce((best, p) => (p.y <= yMin + 1e-6 ? Math.max(best, p.r) : best), 0);
  const bottomMat = clayMat.clone();
  bottomMat.side = THREE.DoubleSide;
  clayBottom = new THREE.Mesh(new THREE.CircleGeometry(bottomR, SEG), bottomMat);
  clayBottom.rotation.x = -Math.PI / 2;
  clayBottom.position.y = yMin - 0.002;

  [clayWall, clayBottom].forEach(m => {
    m.castShadow = true;
    m.receiveShadow = true;
    clayGroup.add(m);
  });

  scene.add(clayGroup);
}

function updateActualSizeDisplay() {
  const actualWidthEl = document.getElementById('actualWidth');
  const actualHeightEl = document.getElementById('actualHeight');
  if (!actualWidthEl || !actualHeightEl) return;
  const { diameter, height } = getActualSize();
  actualWidthEl.textContent = diameter.toFixed(1);
  actualHeightEl.textContent = height.toFixed(1);
}

function syncUI() {
  const hS = document.getElementById('heightSlider');
  const hI = document.getElementById('heightInput');
  const wS = document.getElementById('widthSlider');
  const wI = document.getElementById('widthInput');
  if (hS && hI) {
    hS.value = heightCm;
    hI.value = heightCm;
    hS.style.setProperty('--pct', ((heightCm - SIZE_MIN) / (H_MAX - SIZE_MIN) * 100).toFixed(1) + '%');
  }
  if (wS && wI) {
    wS.value = widthCm;
    wI.value = widthCm;
    wS.style.setProperty('--pct', ((widthCm - SIZE_MIN) / (W_MAX - SIZE_MIN) * 100).toFixed(1) + '%');
  }
  updateActualSizeDisplay();
}

function createClay() {
  buildClayMeshes();
  updateSizeGuide();
  updateActualSizeDisplay();
}

function updateClayFast() {
  buildClayMeshes();
  updateSizeGuide();
  updateActualSizeDisplay();
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

// Sculpt grip indicator (ring + marker on surface)
const hlMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
const hlMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
const hlRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 20, 72), hlMat);
hlRing.rotation.x = Math.PI / 2;
const hlMarker = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), hlMarkerMat);
scene.add(hlRing, hlMarker);

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
let mode = 'idle'; // 'sculpt' | 'orbit' | 'pinch'
let selRing = -1, lastClientX = 0, orbitLast = {x:0,y:0};
let pinchDist0 = 0, pinchRadius0 = 0;

const statusEl = document.getElementById('status');
const barDotEl = document.getElementById('barDot');

function getVbarH() {
  const wrap = document.getElementById('vSliderWrap');
  return wrap ? wrap.offsetHeight : 220;
}

function getTouchSpan(touches) {
  if (touches.length < 2) return 0;
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

function ndcFromClient(clientX, clientY) {
  return new THREE.Vector2((clientX / W()) * 2 - 1, -(clientY / H()) * 2 + 1);
}

function endInteraction() {
  mode = 'idle';
  selRing = -1;
  canvas.style.cursor = 'crosshair';
  hlMat.opacity = 0;
  hlMarkerMat.opacity = 0;
  barDotEl.style.opacity = '0';
  barDotEl.classList.remove('active');
  setStatus(READY_STATUS);
}

function applyOrbitDrag(clientX, clientY) {
  orbit.theta -= (clientX - orbitLast.x) * 0.008;
  orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi - (clientY - orbitLast.y) * 0.008));
  orbitLast = { x: clientX, y: clientY };
  updateCamera();
}

function applySculptDrag(clientX, isTouch) {
  const dx = clientX - lastClientX;
  lastClientX = clientX;
  const sign = isTouch ? -1 : 1;
  applyEdit(selRing, dx * 0.02 * sign);
}

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
  updateClayFast(); updateHighlight(); updateActualSizeDisplay();
}

function updateHighlight() {
  if (selRing < 0) {
    hlMat.opacity = 0;
    hlMarkerMat.opacity = 0;
    barDotEl.style.opacity = '0';
    return;
  }
  const p = profile[selRing];
  const grip = Math.max(0.35, p.r * 1.1);
  const markerSize = Math.max(0.45, p.r * 0.2);

  hlRing.position.y = p.y;
  hlRing.scale.set(grip, grip, grip);
  hlMat.opacity = 0.88;

  hlMarker.position.set(p.r * 1.03, p.y, 0);
  hlMarker.scale.set(markerSize, markerSize, markerSize);
  hlMarkerMat.opacity = 0.95;

  const t = selRing / (N - 1);
  barDotEl.style.top = ((1 - t) * getVbarH()) + 'px';
  barDotEl.style.opacity = '1';
  barDotEl.classList.add('active');
}

// Unified pointer down: try sculpt → fallback to orbit
canvas.addEventListener('mousedown', e=>{
  if (e.button !== 0) return;
  const ndc = new THREE.Vector2((e.clientX/W())*2-1, -(e.clientY/H())*2+1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(getClayPickTargets());
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
  if (mode === 'sculpt') applySculptDrag(e.clientX, false);
  else if (mode === 'orbit') applyOrbitDrag(e.clientX, e.clientY);
});

canvas.addEventListener('mouseup', endInteraction);
canvas.addEventListener('mouseleave', endInteraction);
canvas.addEventListener('contextmenu', e=>e.preventDefault());
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  orbit.radius = Math.max(orbit.zoomMin, Math.min(orbit.zoomMax, orbit.radius + e.deltaY*0.012));
  updateCamera();
}, {passive:false});

// Touch (pinch zoom + sculpt/orbit)
canvas.addEventListener('touchstart', e=>{
  if (e.touches.length >= 2) {
    e.preventDefault();
    mode = 'pinch';
    pinchDist0 = getTouchSpan(e.touches);
    pinchRadius0 = orbit.radius;
    setStatus('확대/축소 중', true);
    return;
  }
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const t = e.touches[0];
  raycaster.setFromCamera(ndcFromClient(t.clientX, t.clientY), camera);
  const hits = raycaster.intersectObjects(getClayPickTargets());
  if (hits.length) {
    mode = 'sculpt';
    selRing = getRing(hits[0].point.y);
    lastClientX = t.clientX;
    setStatus(`조각 중 · ${selRing + 1}번째 줄`, true);
    updateHighlight();
  } else {
    mode = 'orbit';
    orbitLast = { x: t.clientX, y: t.clientY };
    setStatus('회전 중', true);
  }
}, { passive: false });

canvas.addEventListener('touchmove', e=>{
  if (e.touches.length >= 2) {
    e.preventDefault();
    const dist = getTouchSpan(e.touches);
    if (mode !== 'pinch') {
      mode = 'pinch';
      pinchDist0 = dist;
      pinchRadius0 = orbit.radius;
      setStatus('확대/축소 중', true);
      return;
    }
    if (pinchDist0 > 0 && dist > 0) {
      orbit.radius = Math.max(
        orbit.zoomMin,
        Math.min(orbit.zoomMax, pinchRadius0 * (pinchDist0 / dist))
      );
      updateCamera();
    }
    return;
  }
  if (e.touches.length !== 1 || mode === 'pinch') return;
  e.preventDefault();
  const t = e.touches[0];
  if (mode === 'sculpt') applySculptDrag(t.clientX, true);
  else if (mode === 'orbit') applyOrbitDrag(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchend', e=>{
  if (e.touches.length >= 2) {
    mode = 'pinch';
    pinchDist0 = getTouchSpan(e.touches);
    pinchRadius0 = orbit.radius;
    return;
  }
  if (e.touches.length === 1) {
    endInteraction();
    return;
  }
  if (e.touches.length === 0) endInteraction();
}, { passive: false });

canvas.addEventListener('touchcancel', endInteraction);

// ── Height & Width controls ───────────────────────────────────────────────────
function applyHeightChange(cm) {
  const newCm = clampDim(cm, SIZE_MIN, H_MAX);
  const scale = newCm / heightCm;
  profile.forEach(p=>{ p.y *= scale; });
  PHT = newCm; heightCm = newCm;
  orbit.targetY = 0;
  createClay(); syncUI(); fitCamera();
}

function applyWidthChange(cm) {
  const newCm = clampDim(cm, SIZE_MIN, W_MAX);
  const scale = newCm / widthCm;
  profile.forEach(p=>{ p.r = Math.max(MIN_R, p.r * scale); });
  widthCm = newCm;
  updateClayFast(); syncUI(); fitCamera();
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
  createClay(); syncUI(); fitCamera();
}
document.getElementById('btnSmooth').addEventListener('click',()=>{
  profile=profile.map((p,i,a)=>({...p,r:i===0||i===N-1?p.r:a[i-1].r*0.25+p.r*0.5+a[i+1].r*0.25}));
  updateClayFast();
});
document.getElementById('btnVase' ).addEventListener('click',()=>loadPreset('vase'));
document.getElementById('btnBowl' ).addEventListener('click',()=>loadPreset('bowl'));
document.getElementById('btnCyl'  ).addEventListener('click',()=>loadPreset('cylinder'));
document.getElementById('btnReset').addEventListener('click',()=>{
  heightCm=10; widthCm=10; PHT=10;
  loadPreset('cylinder');
});

syncUI(); setStatus(READY_STATUS);

// ── Animate (no rotation) ─────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

})();
