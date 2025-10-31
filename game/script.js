import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

(function(){
  // HUD elements
  const promptEl = document.getElementById('prompt');
  const msgEl = document.getElementById('msg');
  const fightWrap = document.getElementById('fightWrap');
  const fightCanvas = document.getElementById('fight');
  const fightInfo = document.getElementById('fightInfo');
  const fightExit = document.getElementById('fightExit');
  const ambToggle = document.getElementById('ambToggle');

  // Renderer in low resolution (PS2-like upscale)
  const DPRScale = 0.6; // 0.5–0.7 looks good
  const viewport = document.getElementById('viewport');
  const renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.max(1, window.devicePixelRatio * DPRScale));
  renderer.setSize(window.innerWidth, window.innerHeight);
  viewport.appendChild(renderer.domElement);

  // Scene & camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.fog = new THREE.FogExp2(0x06070a, 0.012); // lighter fog for visibility

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0); // eye height

  // Controls (Pointer Lock)
  const controls = new PointerLockControls(camera, renderer.domElement);
  let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false;
  let velocity = new THREE.Vector3();
  const speed = 2.65; // m/s

  renderer.domElement.addEventListener('click', ()=>{
    controls.lock();
  });

  document.addEventListener('keydown', (e)=>{
    switch(e.code){
      case 'ArrowUp': case 'KeyW': case 'KeyZ': moveForward = true; break; // Z for AZERTY
      case 'ArrowLeft': case 'KeyA': case 'KeyQ': moveLeft = true; break;   // Q for AZERTY
      case 'ArrowDown': case 'KeyS': moveBackward = true; break;
      case 'ArrowRight': case 'KeyD': moveRight = true; break;
    }
  });
  document.addEventListener('keyup', (e)=>{
    switch(e.code){
      case 'ArrowUp': case 'KeyW': case 'KeyZ': moveForward = false; break;
      case 'ArrowLeft': case 'KeyA': case 'KeyQ': moveLeft = false; break;
      case 'ArrowDown': case 'KeyS': moveBackward = false; break;
      case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
  });

  // Interaction key (E) for pickups
  let interactPressed = false;
  document.addEventListener('keydown', (e)=>{
    if(e.code === 'KeyE') interactPressed = true;
  });
  document.addEventListener('keyup', (e)=>{
    if(e.code === 'KeyE') interactPressed = false;
  });

  // Corridor builder
  const corridor = new THREE.Group();
  scene.add(corridor);

  const wallMat = new THREE.MeshLambertMaterial({ color:0x2a2b35 });
  const floorMat = new THREE.MeshLambertMaterial({ color:0x1a1a22 });
  const ceilMat = new THREE.MeshLambertMaterial({ color:0x181820 });

  const width=4, height=3, length=12, segments=20; // total ~240m
  const wallGeo = new THREE.BoxGeometry(0.2, height, length);
  const floorGeo = new THREE.PlaneGeometry(width, length);

  for(let i=0;i<segments;i++){
    const z = -i*length;
    // Left wall
    const wl = new THREE.Mesh(wallGeo, wallMat); wl.position.set(-width/2, height/2, z - length/2); corridor.add(wl);
    // Right wall
    const wr = new THREE.Mesh(wallGeo, wallMat); wr.position.set(width/2, height/2, z - length/2); corridor.add(wr);
    // Floor
    const f = new THREE.Mesh(floorGeo, floorMat); f.rotation.x = -Math.PI/2; f.position.set(0, 0, z - length/2); corridor.add(f);
    // Ceiling
    const c = new THREE.Mesh(floorGeo, ceilMat); c.rotation.x = Math.PI/2; c.position.set(0, height, z - length/2); corridor.add(c);

    // Light every few segments (with slight flicker later)
    if(i % 3 === 0){
      const lamp = new THREE.PointLight(0x8890a8, 2.2, 18, 1.5);
      lamp.position.set(0, height-0.3, z - length + 1.0);
      corridor.add(lamp);
    }
  }

  // Brighter ambient + starter light near origin for visibility
  scene.add(new THREE.AmbientLight(0x404040, 0.7));
  const startLamp = new THREE.PointLight(0x8890a8, 2.5, 10, 2.0);
  startLamp.position.set(0, 2.2, -2);
  scene.add(startLamp);

  // Debug: small emissive cube ahead to confirm rendering
  const dbgMat = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0x404060, emissiveIntensity:1.5 });
  const dbg = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2), dbgMat);
  dbg.position.set(0, 1.6, -1.5);
  scene.add(dbg);

  // Simple collision with walls (AABB inside corridor)
  const halfW = (width/2) - 0.35; // margin from walls

  // Knife at far end
  let hasKnife = false;
  const knifeGeo = new THREE.BoxGeometry(0.1, 0.02, 0.5);
  const knifeMat = new THREE.MeshStandardMaterial({ color:0xcccccc, metalness:0.8, roughness:0.3, emissive:0x000000 });
  const knife = new THREE.Mesh(knifeGeo, knifeMat);
  const endZ = -(segments-2)*length; // a bit before the very end
  knife.position.set(0, 1.0, endZ);
  knife.rotation.y = Math.PI * 0.15;
  const knifeLight = new THREE.PointLight(0xffeeee, 1.2, 4, 2.0);
  knifeLight.position.set(0.1, 1.2, endZ);
  corridor.add(knife);
  corridor.add(knifeLight);

  function setPrompt(text){
    if(!text){ promptEl.hidden = true; return; }
    promptEl.textContent = text; promptEl.hidden = false;
  }
  function flashMsg(text, ms=1400){
    msgEl.textContent = text; msgEl.hidden = false; setTimeout(()=>{ msgEl.hidden = true; }, ms);
  }

  // Animation loop
  let prev = performance.now();
  let gameMode = 'explore'; // 'explore' | 'fight'

  function animate(){
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - prev)/1000, 0.05); // clamp delta
    prev = now;

    // Simple flicker on lights
    corridor.children.forEach(obj=>{
      if(obj.isPointLight && Math.random()<0.02){
        obj.intensity = 1.9 + Math.random()*0.6;
      }
    });

    // WASD movement in local camera space when locked and exploring
    if(controls.isLocked && gameMode === 'explore'){
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0; dir.normalize(); // forward on XZ plane
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).negate();

      let vx = 0, vz = 0;
      if(moveForward) { vx += dir.x; vz += dir.z; }
      if(moveBackward){ vx -= dir.x; vz -= dir.z; }
      if(moveLeft)    { vx += right.x; vz += right.z; }
      if(moveRight)   { vx -= right.x; vz -= right.z; }

      const mag = Math.hypot(vx, vz) || 1;
      velocity.set((vx/mag)*speed*dt, 0, (vz/mag)*speed*dt);

      camera.position.x += velocity.x;
      camera.position.z += velocity.z;

      // Clamp within corridor
      camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));
    }

    // Knife pickup proximity
    if(gameMode === 'explore' && !hasKnife){
      const d = camera.position.distanceTo(knife.position);
      if(d < 1.4){
        setPrompt('Appuyez sur E pour prendre le couteau');
        if(interactPressed){
          hasKnife = true;
          knife.parent?.remove(knife);
          flashMsg('Vous avez pris le couteau');
          setPrompt('');
        }
      } else if(d < 3){
        setPrompt(''); // near but not close enough
      } else {
        setPrompt('');
      }
    }

    // Trigger fight when reaching near the end and hasKnife
    if(gameMode === 'explore' && hasKnife && camera.position.z < endZ - 6){
      startFight();
    }

    renderer.render(scene, camera);
  }
  animate();

  function onResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // Startup message
  try{ flashMsg('Jeu prêt — cliquez pour regarder', 1800); }catch(e){}

  // =============================
  // Simple Undertale-like fight
  // =============================
  let fightRunning = false;
  function startFight(){
    gameMode = 'fight';
    fightRunning = true;
    controls.unlock();
    fightWrap.hidden = false;

    const ctx = fightCanvas.getContext('2d');
    const W = fightCanvas.width, H = fightCanvas.height;
    const box = { x:20, y:24, w:W-40, h:H-44 };
    const player = { x:W/2, y:H/2, r:4, speed:120 };
    let hp = 5;
    let timeLeft = 15; // seconds to survive
    const bullets = [];

    // Spawn simple horizontal bullets
    function spawnWave(){
      const dir = Math.random()<0.5 ? -1 : 1;
      const y = box.y + 8 + Math.random()*(box.h-16);
      bullets.push({ x: dir<0? box.x+box.w+10 : box.x-10, y, vx: 80*dir, vy: 0, w: 10, h: 2 });
    }

    let last = performance.now();
    let acc = 0;
    let spawnAcc = 0;

    const keys = new Set();
    function kdn(e){ keys.add(e.code); }
    function kup(e){ keys.delete(e.code); }
    window.addEventListener('keydown', kdn);
    window.addEventListener('keyup', kup);

    function loop(){
      if(!fightRunning) return;
      const now = performance.now();
      const dt = Math.min((now-last)/1000, 0.05); last = now;
      acc += dt; spawnAcc += dt; timeLeft = Math.max(0, timeLeft - dt);

      // Player move
      let sx=0, sy=0;
      if(keys.has('ArrowLeft')||keys.has('KeyA')||keys.has('KeyQ')) sx-=1;
      if(keys.has('ArrowRight')||keys.has('KeyD')) sx+=1;
      if(keys.has('ArrowUp')||keys.has('KeyW')||keys.has('KeyZ')) sy-=1;
      if(keys.has('ArrowDown')||keys.has('KeyS')) sy+=1;
      const sm = Math.hypot(sx,sy)||1;
      player.x += (sx/sm)*player.speed*dt;
      player.y += (sy/sm)*player.speed*dt;
      // clamp inside box
      player.x = Math.max(box.x+player.r, Math.min(box.x+box.w-player.r, player.x));
      player.y = Math.max(box.y+player.r, Math.min(box.y+box.h-player.r, player.y));

      // Spawn bullets
      if(spawnAcc > 0.25){ spawnAcc = 0; spawnWave(); if(Math.random()<0.3) spawnWave(); }
      // Update bullets
      for(let i=bullets.length-1;i>=0;i--){
        const b = bullets[i];
        b.x += b.vx*dt; b.y += b.vy*dt;
        if(b.x < box.x-20 || b.x > box.x+box.w+20) bullets.splice(i,1);
      }

      // Collisions
      for(const b of bullets){
        if(player.x > b.x - b.w/2 - player.r && player.x < b.x + b.w/2 + player.r &&
           player.y > b.y - b.h/2 - player.r && player.y < b.y + b.h/2 + player.r){
          hp = Math.max(0, hp-1);
          // knockback a bit
          player.x += Math.sign(player.x - b.x) * 6;
          player.y += Math.sign(player.y - b.y) * 3;
        }
      }

      // Draw
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
      // box
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(box.x, box.y, box.w, box.h);
      // player
      ctx.fillStyle = '#ff5555';
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
      // bullets
      ctx.fillStyle = '#ffffff';
      for(const b of bullets){ ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h); }
      // UI text
      fightInfo.textContent = `HP: ${hp}  |  Temps: ${timeLeft.toFixed(1)}s`;

      if(hp <= 0 || timeLeft <= 0){
        fightRunning = false;
        window.removeEventListener('keydown', kdn);
        window.removeEventListener('keyup', kup);
        fightExit.hidden = false;
        fightInfo.textContent += hp<=0 ? '  — Défaite' : '  — Victoire';
        return;
      }

      requestAnimationFrame(loop);
    }
    fightExit.hidden = true;
    fightInfo.textContent = 'HP: 5  |  Temps: 15.0s';
    requestAnimationFrame(loop);

    fightExit.onclick = ()=>{
      fightWrap.hidden = true;
      gameMode = 'explore';
      // pointer can be relocked by clicking the 3D viewport again
    };
  }

  // =============================
  // Procedural ambience (WebAudio)
  // =============================
  let ambCtx = null, ambMaster = null, ambLFO = null, ambOsc1 = null, ambOsc2 = null;
  let ambOn = false;
  function startAmb(){
    if(ambOn) return; ambOn = true;
    if(!ambCtx){ ambCtx = new (window.AudioContext||window.webkitAudioContext)(); }
    const ctx = ambCtx;
    ambMaster = ctx.createGain(); ambMaster.gain.value = 0.03; ambMaster.connect(ctx.destination);
    // slow LFO modulating gain
    ambLFO = ctx.createOscillator(); ambLFO.type = 'sine'; ambLFO.frequency.value = 0.18;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.015;
    ambLFO.connect(lfoGain).connect(ambMaster.gain);
    // two detuned oscillators for a low drone
    ambOsc1 = ctx.createOscillator(); ambOsc1.type = 'sawtooth'; ambOsc1.frequency.value = 48; ambOsc1.detune.value = -6;
    ambOsc2 = ctx.createOscillator(); ambOsc2.type = 'triangle'; ambOsc2.frequency.value = 62; ambOsc2.detune.value = +7;
    ambOsc1.connect(ambMaster); ambOsc2.connect(ambMaster);
    ambOsc1.start(); ambOsc2.start(); ambLFO.start();
  }
  function stopAmb(){
    ambOn = false;
    try{ ambOsc1?.stop(); ambOsc2?.stop(); ambLFO?.stop(); }catch(e){}
    ambOsc1 = ambOsc2 = ambLFO = null;
    try{ ambMaster?.disconnect(); }catch(e){}
    ambMaster = null;
  }
  ambToggle?.addEventListener('click', async()=>{
    if(!ambOn){
      try{ await ambCtx?.resume(); }catch(e){}
      startAmb(); ambToggle.textContent = 'Ambiance: ON';
    } else {
      stopAmb(); ambToggle.textContent = 'Ambiance: OFF';
    }
  });
})();
