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
  // Settings UI
  const uiSpeed = document.getElementById('uiSpeed');
  const uiFov = document.getElementById('uiFov');
  const uiFog = document.getElementById('uiFog');
  const uiAmb = document.getElementById('uiAmb');
  const uiXhVis = document.getElementById('uiXhVis');
  const uiXhColor = document.getElementById('uiXhColor');
  const uiXhSize = document.getElementById('uiXhSize');
  const resetPos = document.getElementById('resetPos');

  // Renderer in low resolution (PS2-like upscale)
  const DPRScale = 0.6; // 0.5–0.7 looks good
  const viewport = document.getElementById('viewport');
  const renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.max(0.5, (window.devicePixelRatio||1) * DPRScale));
  renderer.setSize(window.innerWidth, window.innerHeight);
  viewport.appendChild(renderer.domElement);

  // Scene & Camera
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x120a0d, 0.006);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.8, 0); // Hauteur ajustée pour bien voir

  // Controls (Pointer Lock)
  const controls = new PointerLockControls(camera, renderer.domElement);
  viewport.addEventListener('click', ()=>{ if(!controls.isLocked) controls.lock(); });

  // Movement state
  let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false, runPressed=false;
  let interactPressed = false;
  let speed = 2.6;
  const velocity = new THREE.Vector3();

  function onKey(e, down){
    const set = (code, val)=>{ if(e.code===code) return val; };
    switch(e.code){
      case 'KeyW': case 'KeyZ': case 'ArrowUp': moveForward = down; break;
      case 'KeyS': case 'ArrowDown': moveBackward = down; break;
      case 'KeyA': case 'KeyQ': case 'ArrowLeft': moveLeft = down; break;
      case 'KeyD': case 'ArrowRight': moveRight = down; break;
      case 'ShiftLeft': case 'ShiftRight': runPressed = down; break;
      case 'KeyE': if(down) interactPressed = true; break;
    }
  }
  window.addEventListener('keydown', e=>onKey(e,true));
  window.addEventListener('keyup', e=>onKey(e,false));

  // =============================
  // Textures procédurales (panneaux/bruit)
  // =============================
  function makeTexture(hex = '#2b2422', noise = 0.15) {
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0,0,128,128);
    // bruit
    const img = ctx.getImageData(0,0,128,128);
    for(let i=0;i<img.data.length;i+=4){
      const n = (Math.random()-0.5) * 255 * noise;
      img.data[i]   = Math.max(0, Math.min(255, img.data[i]  + n));
      img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1]+ n*0.8));
      img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2]+ n*0.6));
    }
    ctx.putImageData(img, 0, 0);
    // lignes horizontales/verticales (panneaux)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for(let y=0;y<=128;y+=16){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(128,y); ctx.stroke(); }
    for(let x=0;x<=128;x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,128); ctx.stroke(); }
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.()||4);
    tex.needsUpdate = true;
    return tex;
  }

  // Corridor build (wider, long)
  const corridor = new THREE.Group();
  scene.add(corridor);
  const width = 1.8, height = 1.6, length = 2.0, segments = 15; // Hauteur augmentée

  // Texture unifiée pour TOUTES les surfaces (sol, plafond, murs)
  const corridorTex = makeTexture('#2b2422', 0.14); 
  corridorTex.repeat.set(2, 2); // Répétition pour plus de détails
  const corridorMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    map: corridorTex, 
    roughness: 0.85, 
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const wallThickness = 0.01;

  for(let i=0;i<segments;i++){
    const z = -i*length;
    // Sol avec la même texture que tout le reste
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), corridorMat);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, z - length/2);
    // Plafond
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(width, length), corridorMat);
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, height, z - length/2);
    // Murs
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, length), corridorMat);
    leftWall.position.set(-width/2, height/2, z - length/2);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, length), corridorMat);
    rightWall.position.set(width/2, height/2, z - length/2);
    corridor.add(floor, ceil, leftWall, rightWall);

    // Lampes seulement tous les 2 segments pour optimiser
    if(i % 2 === 0) {
      const lamp = new THREE.PointLight(0xd4695a, 3.0, 20, 1.5);
      const lampZ = z - length + 1.0;
      lamp.position.set(0, height-0.3, lampZ);
      lamp.userData.baseIntensity = 3.0;
      lamp.userData.flickerSpeed = 0.3 + Math.random()*0.3;
      corridor.add(lamp);

      const fixture = new THREE.Group();
      const bodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.04, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d2a25, roughness: 0.9, metalness: 0.1 });
      const body = new THREE.Mesh(bodyGeo, bodyMat); body.rotation.x = Math.PI/2;
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0xffd2b0 }));
      cap.rotation.x = -Math.PI/2; cap.position.y = -0.02;
      fixture.add(body, cap);
      fixture.position.set(0, height-0.28, lampZ);
      corridor.add(fixture);
    }
  }

  // Porte condamnée derrière le spawn avec chaînes et cadenas
  const sealedDoorZ = 0.5; // Proche derrière le spawn
  
  // Cadre de porte en bois sombre
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a1a15, roughness: 0.95, metalness: 0.0 });
  const sealedFrameTop = new THREE.Mesh(new THREE.BoxGeometry(width*0.6, 0.15, 0.1), doorFrameMat);
  sealedFrameTop.position.set(0, height*0.85, sealedDoorZ);
  const sealedFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, height*0.9, 0.1), doorFrameMat);
  sealedFrameLeft.position.set(-width*0.3, height/2, sealedDoorZ);
  const sealedFrameRight = sealedFrameLeft.clone();
  sealedFrameRight.position.x = width*0.3;
  corridor.add(sealedFrameTop, sealedFrameLeft, sealedFrameRight);
  
  // Double porte en bois usé
  const sealedDoorMat = new THREE.MeshStandardMaterial({ 
    color: 0x3d2820, 
    map: corridorTex, 
    roughness: 0.9, 
    metalness: 0.0 
  });
  const doorWidth = (width*0.6 - 0.12) / 2;
  const doorHeight = height * 0.85;
  const sealedDoorL = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.08), sealedDoorMat);
  sealedDoorL.position.set(-doorWidth/2 - 0.03, height/2, sealedDoorZ);
  const sealedDoorR = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.08), sealedDoorMat);
  sealedDoorR.position.set(doorWidth/2 + 0.03, height/2, sealedDoorZ);
  corridor.add(sealedDoorL, sealedDoorR);
  
  // Chaînes qui traversent la porte (réduites à 3 pour performance)
  const chainMat = new THREE.MeshStandardMaterial({ 
    color: 0x4a4a4a, 
    roughness: 0.7, 
    metalness: 0.6 
  });
  for(let i = 0; i < 3; i++) { // Réduit de 4 à 3
    const chainY = height * 0.3 + i * (height * 0.4 / 2);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width*0.65, 6), chainMat); // Réduit segments de 8 à 6
    chain.rotation.z = Math.PI/2;
    chain.position.set(0, chainY, sealedDoorZ - 0.05); // Devant la porte
    corridor.add(chain);
    
    // Maillons de chaîne (réduits)
    for(let j = -2; j <= 2; j++) { // Réduit de -3,3 à -2,2
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 10), chainMat); // Réduit segments
      link.rotation.y = Math.PI/2;
      link.position.set(j * 0.3, chainY, sealedDoorZ - 0.05); // Devant la porte
      corridor.add(link);
    }
  }
  
  // Cadenas massif au centre
  const lockMat = new THREE.MeshStandardMaterial({ 
    color: 0x3a3a3a, 
    roughness: 0.5, 
    metalness: 0.8 
  });
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.08), lockMat);
  lockBody.position.set(0, height/2, sealedDoorZ - 0.04); // Devant la porte
  corridor.add(lockBody);
  
  // Anse du cadenas
  const lockShackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI), lockMat);
  lockShackle.rotation.x = Math.PI/2;
  lockShackle.position.set(0, height/2 + 0.12, sealedDoorZ - 0.04); // Devant la porte
  corridor.add(lockShackle);
  
  // Trou de serrure (détail noir)
  const keyholeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const keyhole = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), keyholeMat);
  keyhole.position.set(0, height/2 - 0.02, sealedDoorZ - 0.03); // Devant la porte
  corridor.add(keyhole);
  
  // Sol derrière la porte avec texture unifiée
  const backFloor = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, 3), corridorMat);
  backFloor.rotation.x = -Math.PI/2;
  backFloor.position.set(0, 0, sealedDoorZ + 1.5);
  corridor.add(backFloor);
  
  // Murs latéraux derrière la porte scellée (collision)
  const backLeftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, 3), corridorMat);
  backLeftWall.position.set(-width/2, height/2, sealedDoorZ + 1.5);
  corridor.add(backLeftWall);
  
  const backRightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, 3), corridorMat);
  backRightWall.position.set(width/2, height/2, sealedDoorZ + 1.5);
  corridor.add(backRightWall);
  
  // Plafond derrière la porte
  const backCeiling = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, 3), corridorMat);
  backCeiling.rotation.x = Math.PI/2;
  backCeiling.position.set(0, height, sealedDoorZ + 1.5);
  corridor.add(backCeiling);
  
  // Mur de fond derrière la porte (collision)
  const backWallWidth = width * 1.5;
  const backWallHeight = height * 1.5;
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(backWallWidth, backWallHeight, wallThickness), corridorMat);
  backWall.position.set(0, backWallHeight/2, sealedDoorZ + 0.01);
  corridor.add(backWall);

  // Mur de fin du couloir (au fond)
  const corridorEndZ = -(segments-1)*length;
  const endWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness), corridorMat);
  endWall.position.set(0, height/2, corridorEndZ);
  corridor.add(endWall);

  // Ukulélé à récupérer (style Risk of Rain 2 - low poly coloré)
  function makeUkulele() {
    const group = new THREE.Group();
    
    // Corps simplifié en bois clair (style RoR2)
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0xf4b860,
      roughness: 0.7, 
      metalness: 0.0,
      flatShading: true // Low poly look
    });
    
    // Corps principal (box arrondi)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.18, 0.08, 1, 1, 1),
      bodyMat
    );
    body.position.set(0, 0, 0);
    
    // Table d'harmonie (cercle plat orange)
    const soundboard = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0xe89a3c, 
        roughness: 0.8,
        flatShading: true 
      })
    );
    soundboard.rotation.y = Math.PI / 2;
    soundboard.position.x = 0.041;
    
    // Trou de résonance (petit cercle noir)
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 6),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    );
    hole.rotation.y = Math.PI / 2;
    hole.position.x = 0.042;
    
    // Manche (box long brun foncé)
    const neckMat = new THREE.MeshStandardMaterial({ 
      color: 0x6b4423, 
      roughness: 0.8,
      flatShading: true
    });
    const neck = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.03, 0.025, 1, 1, 1),
      neckMat
    );
    neck.position.set(-0.175, 0.09, 0);
    
    // Tête du manche (triangle stylisé)
    const headstock = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, 0.02, 1, 1, 1),
      neckMat
    );
    headstock.position.set(-0.35, 0.09, 0);
    
    // 4 cordes (lignes blanches très fines)
    const stringMat = new THREE.MeshStandardMaterial({ 
      color: 0xf0f0f0, 
      roughness: 0.4,
      metalness: 0.5
    });
    for(let i = 0; i < 4; i++) {
      const string = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.003, 0.003, 1, 1, 1),
        stringMat
      );
      string.position.set(-0.175, 0.09, -0.012 + i * 0.008);
      group.add(string);
    }
    
    // Chevalet (petit bloc marron)
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.01, 0.03, 1, 1, 1),
      new THREE.MeshStandardMaterial({ 
        color: 0x3a2010,
        flatShading: true 
      })
    );
    bridge.position.set(0.08, -0.08, 0);
    
    // Mécaniques simplifiées (4 petits cubes gris)
    const tunerMat = new THREE.MeshStandardMaterial({ 
      color: 0xaaaaaa, 
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true
    });
    for(let i = 0; i < 4; i++) {
      const tuner = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.015, 0.015, 1, 1, 1),
        tunerMat
      );
      tuner.position.set(-0.35, 0.09 + (i < 2 ? 0.015 : -0.015), -0.012 + (i % 2) * 0.008);
      group.add(tuner);
    }
    
    group.add(body, soundboard, hole, neck, headstock, bridge);
    group.rotation.y = Math.PI / 4;
    return group;
  }

  const UKULELE_Z = -(segments/2) * length; // Au milieu du couloir
  const ukulele = makeUkulele();
  ukulele.position.set(0.3, 0.6, UKULELE_Z);
  corridor.add(ukulele);
  
  // Lumière pour l'ukulélé
  const ukuleleLight = new THREE.PointLight(0xffd700, 2.0, 8);
  ukuleleLight.position.copy(ukulele.position);
  corridor.add(ukuleleLight);
  
  ukulele.userData.baseY = ukulele.position.y;
  
  // Éclairage ambiant optimisé
  const ambient = new THREE.AmbientLight(0x6a554a, 0.8);
  scene.add(ambient);
  const startLamp = new THREE.PointLight(0xd4695a, 3.5, 20, 1.6);
  startLamp.position.set(0, 2.2, -2);
  startLamp.userData.baseIntensity = 3.5;
  startLamp.userData.flickerSpeed = 0.35;
  scene.add(startLamp);
  const hemi = new THREE.HemisphereLight(0x8a6a5a, 0x3a2a20, 0.6);
  scene.add(hemi);

  // Particules de poussière retirées pour optimisation

  // Simple collision with walls (AABB inside corridor)
  let halfW = (width/2) - 0.4;

  let hasUkulele = false;

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
  let frameCount = 0; // Pour optimiser certaines animations

  function animate(){
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - prev)/1000, 0.05); // clamp delta
    prev = now;
    frameCount++;

    // Flicker + clignotement visible sur les lampes (tous les 4 frames - optimisé)
    if(frameCount % 4 === 0) { // Changé de 3 à 4
      corridor.children.forEach(obj=>{
        if(obj.isPointLight){
          const flicker = obj.userData.flickerSpeed || 0.3;
          const base = obj.userData.baseIntensity || 1.8;
          // Blink occasional blackout
          const nowMs = performance.now();
          if(!obj.userData.blinkUntil && Math.random() < 0.003){ // Réduit de 0.004 à 0.003
            obj.userData.blinkUntil = nowMs + 80 + Math.random()*180; // 80-260ms
          }
          if(obj.userData.blinkUntil && nowMs < obj.userData.blinkUntil){
            obj.intensity += (0 - obj.intensity) * 0.6; // rapid drop
          } else {
            obj.userData.blinkUntil = null;
            if(Math.random() < flicker * dt * 30){
              obj.intensity = base * (0.3 + Math.random()*0.7);
            } else {
              obj.intensity += (base - obj.intensity) * dt * 3;
            }
          }
        }
      });
    }

    // (Particules retirées)

  // ZQSD (et WASD) movement in local camera space when locked and exploring
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
  const s = speed * (runPressed ? 1.9 : 1.0);
  velocity.set((vx/mag)*s*dt, 0, (vz/mag)*s*dt);

      camera.position.x += velocity.x;
      camera.position.z += velocity.z;

      // Clamp within corridor
      camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));
      
      // Empêcher de traverser la porte scellée (collision arrière)
      if(camera.position.z > sealedDoorZ - 0.3) {
        camera.position.z = sealedDoorZ - 0.3;
      }
      
      // Déclencher le combat au milieu du couloir (si ukulélé récupéré)
      const combatTriggerZ = -(segments/2 + 2) * length;
      if(hasUkulele && camera.position.z < combatTriggerZ && gameMode === 'explore') {
        startFight();
      }
    }

    // Animation de l'ukulélé
    if(ukulele && !hasUkulele) {
      ukulele.rotation.y += dt * 0.8;
      ukulele.position.y = ukulele.userData.baseY + Math.sin(now * 0.002) * 0.04;
      
      // Lumière pulsante
      const glowMat = ukuleleLight.color;
      ukuleleLight.intensity = 2.0 + 0.3 * Math.sin(now * 0.004);
      
      // Vérifier proximité pour ramassage
      const d = camera.position.distanceTo(ukulele.position);
      if(d < 2.0) {
        setPrompt('Appuyez sur E pour prendre l\'ukulélé');
        if(interactPressed) {
          hasUkulele = true;
          corridor.remove(ukulele);
          corridor.remove(ukuleleLight);
          flashMsg('♪ Vous avez récupéré l\'ukulélé ! ♪', 2000);
          setPrompt('');
          interactPressed = false;
        }
      } else {
        if(msgEl.textContent.includes('ukulélé')) setPrompt('');
      }
    }
    
    interactPressed = false;

    renderer.render(scene, camera);
  }
  animate();

  function onResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // Pas de HUD au démarrage: ne pas afficher de message initial
  // (HUD uniquement pendant le combat)
  try{ msgEl.hidden = true; promptEl.hidden = true; }catch(e){}

  // =============================
  // Settings wiring
  // =============================
  uiSpeed?.addEventListener('input', ()=>{ speed = parseFloat(uiSpeed.value); });
  uiFov?.addEventListener('input', ()=>{ camera.fov = parseFloat(uiFov.value); camera.updateProjectionMatrix(); });
  uiFog?.addEventListener('input', ()=>{ const d = parseFloat(uiFog.value); scene.fog.density = d; });
  uiAmb?.addEventListener('input', ()=>{ ambient.intensity = parseFloat(uiAmb.value); });
  uiXhVis?.addEventListener('change', ()=>{ document.getElementById('crosshair').style.display = uiXhVis.checked ? 'block' : 'none'; });
  uiXhColor?.addEventListener('input', ()=>{ document.getElementById('crosshair').style.setProperty('--xh-color', uiXhColor.value); });
  uiXhSize?.addEventListener('input', ()=>{ document.getElementById('crosshair').style.setProperty('--xh-size', uiXhSize.value+'px'); });
  resetPos?.addEventListener('click', ()=>{ camera.position.set(0,0.8,0); }); // Hauteur ajustée

  // =============================
  // Simple Undertale-like fight EN PHASES
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
    let bossHP = 3; // Boss meurt après 3 attaques
    const maxBossHP = 3;
    let phase = 'dodge'; // 'dodge' ou 'attack'
    let phaseTimer = 15; // 15 secondes d'esquive
    const bullets = [];
    const telegraphs = [];
    let iframes = 0;
    let attackReady = false;

    // Spawn simple horizontal bullets
    function spawnWave(){
      const dir = Math.random()<0.5 ? -1 : 1;
      const y = box.y + 8 + Math.random()*(box.h-16);
      bullets.push({ x: dir<0? box.x+box.w+10 : box.x-10, y, vx: 80*dir, vy: 0, w: 10, h: 2 });
    }

      function spawnVerticalWall(){
        // several thin rectangles moving downwards
        const count = 5 + Math.floor(Math.random()*3);
        for(let i=0;i<count;i++){
          const x = box.x + 8 + Math.random()*(box.w-16);
          bullets.push({ x, y: box.y-8, vx:0, vy: 90, w: 4, h: 10 });
        }
      }
      function spawnBoneSweep(dir){
        // horizontal sweep across the box
        const rows = 3;
        for(let r=0;r<rows;r++){
          const y = box.y + 12 + r*(box.h-24)/(rows-1);
          const vx = dir>0? 130 : -130;
          bullets.push({ x: dir>0? box.x-12 : box.x+box.w+12, y, vx, vy:0, w: 12, h: 6 });
        }
      }
      function spawnSine(dir){
        const baseY = box.y + box.h/2;
        const vx = dir>0? 100 : -100;
        for(let k=0;k<5;k++){
          const phase = k*0.8;
          bullets.push({ x: dir>0? box.x-10 : box.x+box.w+10, y: baseY, vx, vy:0, w: 6, h: 3, sine:{amp:16, freq:2.6, phase} });
        }
      }
      function telegraphBeam(x, duration=0.6){
        // warn then spawn a vertical beam
        telegraphs.push({ x, ttl: duration });
        setTimeout(()=>{
          bullets.push({ x, y: box.y+box.h/2, vx:0, vy:0, w: 8, h: box.h+8, life:0.5, beam:true });
        }, duration*1000);
      }

      // Projectiles en forme de pointeur (chevron ">")
      function spawnPointers(side){
        const count = 3 + Math.floor(Math.random()*3);
        for(let i=0;i<count;i++){
          const y = box.y + 12 + Math.random()*(box.h-24);
          const dir = side>0? 1 : -1;
          const size = 14;
          // Ajouter w/h pour collisions approx rectangulaires; le rendu sera un triangle
          bullets.push({ pointer:true, x: dir>0? box.x-16 : box.x+box.w+16, y, vx: 120*dir, vy: 0, size, w: size, h: size*0.7 });
        }
      }

    let last = performance.now();
    let acc = 0;
    let spawnAcc = 0;
    let phaseAcc = 0;
    let attackFlash = 0;

    const keys = new Set();
    // Barre d'attaque Undertale (curseur qui parcourt une jauge)
    let attackBar = { active:false, pos:0, speed:0.9, dir:1 };
    function kdn(e){ 
      keys.add(e.code);
      // Attaquer avec ESPACE pendant la phase d'attaque
      if(e.code === 'Space' && phase === 'attack' && attackReady) {
        // Calculer dégâts selon proximité du centre de la jauge
        const q = attackBar.active ? (1 - Math.min(1, Math.abs(attackBar.pos - 0.5)/0.5)) : 0;
        const dmg = q > 0.85 ? 2 : (q > 0.25 ? 1 : 0);
        if(dmg>0) bossHP = Math.max(0, bossHP - dmg);
        attackFlash = 0.5;
        attackReady = false; attackBar.active = false;
        if(bossHP > 0) {
          // Retour en phase d'esquive
          phase = 'dodge';
          phaseTimer = 12;
          bullets.length = 0;
          telegraphs.length = 0;
          spawnAcc = 0;
          phaseAcc = 0;
        }
      }
    }
    function kup(e){ keys.delete(e.code); }
    window.addEventListener('keydown', kdn);
    window.addEventListener('keyup', kup);

    function loop(){
      if(!fightRunning) return;
      const now = performance.now();
      const dt = Math.min((now-last)/1000, 0.05); last = now;
      acc += dt; spawnAcc += dt; phaseAcc += dt; 
      phaseTimer = Math.max(0, phaseTimer - dt);
      if(iframes>0) iframes = Math.max(0, iframes - dt);
      if(attackFlash>0) attackFlash = Math.max(0, attackFlash - dt);

      // Gestion des phases
      if(phase === 'dodge') {
        if(phaseTimer <= 0) {
          // Passer en phase d'attaque
          phase = 'attack';
          phaseTimer = 5; // 5 secondes pour attaquer
          bullets.length = 0;
          telegraphs.length = 0;
          attackReady = true; attackBar.active = true; attackBar.pos = 0; attackBar.dir = 1;
        }
      } else if(phase === 'attack') {
        if(phaseTimer <= 0 && attackReady) {
          // Rate l'attaque, retour en dodge
          phase = 'dodge';
          phaseTimer = 15;
          attackReady = false; attackBar.active = false;
          spawnAcc = 0;
          phaseAcc = 0;
        }
      }

      // Player move (seulement en phase dodge)
      if(phase === 'dodge') {
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
      }

      // Spawn patterns by phase (seulement en phase dodge)
      if(phase === 'dodge') {
        if(phaseAcc < 6){
          if(spawnAcc > 0.25){ spawnAcc = 0; spawnWave(); if(Math.random()<0.4) spawnWave(); }
        } else if(phaseAcc < 12){
          if(spawnAcc > 0.7){ spawnAcc = 0; spawnVerticalWall(); }
          if(Math.random()<0.02){ spawnBoneSweep(Math.random()<0.5?1:-1); }
        } else {
          if(spawnAcc > 0.9){ spawnAcc = 0; spawnSine(Math.random()<0.5?1:-1); }
          if(Math.random()<0.03){
            const x = box.x + 12 + Math.random()*(box.w-24);
            telegraphBeam(x, 0.5+Math.random()*0.4);
          }
          if(Math.random()<0.06){ spawnPointers(Math.random()<0.5?1:-1); }
        }
      }

      // Update telegraphs
      for(let i=telegraphs.length-1;i>=0;i--){
        telegraphs[i].ttl -= dt;
        if(telegraphs[i].ttl<=0) telegraphs.splice(i,1);
      }

      // Update bullets (seulement en phase dodge)
      if(phase === 'dodge') {
        for(let i=bullets.length-1;i>=0;i--){
          const b = bullets[i];
          b.x += (b.vx||0)*dt; b.y += (b.vy||0)*dt;
          if(b.sine){ b.y = (box.y+box.h/2) + b.sine.amp * Math.sin(b.sine.freq*acc + b.sine.phase); }
          if(b.life!=null){ b.life -= dt; if(b.life<=0){ bullets.splice(i,1); continue; } }
          if(b.x < box.x-20 || b.x > box.x+box.w+20 || b.y < box.y-20 || b.y > box.y+box.h+20) bullets.splice(i,1);
        }
      }

      // Met à jour la barre d'attaque (curseur) pendant la phase d'attaque
      if(phase === 'attack' && attackBar.active){
        attackBar.pos += attackBar.speed * dt * attackBar.dir;
        if(attackBar.pos >= 1){ attackBar.pos = 1; attackBar.dir = -1; }
        if(attackBar.pos <= 0){ attackBar.pos = 0; attackBar.dir = 1; }
      }

      // Collisions (seulement en phase dodge)
      if(phase === 'dodge' && iframes<=0){
        for(const b of bullets){
          if(player.x > b.x - b.w/2 - player.r && player.x < b.x + b.w/2 + player.r &&
             player.y > b.y - b.h/2 - player.r && player.y < b.y + b.h/2 + player.r){
            hp = Math.max(0, hp-1);
            iframes = 0.7;
            player.x += Math.sign(player.x - b.x) * 6;
            player.y += Math.sign(player.y - b.y) * 3;
            break;
          }
        }
      }

  // Draw
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
      
      // Fond différent selon la phase
      if(phase === 'attack') {
        ctx.fillStyle = attackFlash > 0 ? 'rgba(255,50,50,0.3)' : 'rgba(30,10,10,0.15)';
        ctx.fillRect(0,0,W,H);
      }
      
      // box
      ctx.strokeStyle = phase === 'attack' ? '#ff5555' : '#fff';
      ctx.lineWidth = 2; 
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      
      // player (seulement visible en phase dodge)
      if(phase === 'dodge') {
        ctx.fillStyle = iframes>0? '#ffaaaa' : '#ff5555';
        ctx.beginPath(); 
        ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); 
        ctx.fill();
      } else {
        // En phase attaque, afficher un curseur de cible
        ctx.strokeStyle = '#ff5555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W/2, H/2, 15, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W/2-20, H/2);
        ctx.lineTo(W/2+20, H/2);
        ctx.moveTo(W/2, H/2-20);
        ctx.lineTo(W/2, H/2+20);
        ctx.stroke();
      }

      // Barre d'attaque Undertale (affichée en phase attaque)
      if(phase === 'attack'){
        const barW = box.w * 0.7;
        const barH = 12;
        const barX = box.x + (box.w - barW)/2;
        const barY = box.y + box.h - 28;
        // Fond de la jauge
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#ff7777';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);
        // Zone parfaite au centre
        const perfectW = Math.max(6, barW*0.06);
        const perfectX = barX + barW/2 - perfectW/2;
        ctx.fillStyle = 'rgba(255,50,50,0.35)';
        ctx.fillRect(perfectX, barY, perfectW, barH);
        // Graduations légères
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        for(let k=0;k<=10;k++){
          const gx = barX + (k/10)*barW;
          ctx.beginPath();
          ctx.moveTo(gx, barY);
          ctx.lineTo(gx, barY+barH);
          ctx.stroke();
        }
        // Curseur mobile
        if(attackBar.active){
          const cx = barX + attackBar.pos * barW;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, barY-6);
          ctx.lineTo(cx, barY+barH+6);
          ctx.stroke();
        }
      }
      
      // bullets
      ctx.fillStyle = '#ffffff';
      for(const b of bullets){
        if(b.pointer){
          // Dessiner un chevron (triangle) pointant vers la direction de vx
          const s = b.size || Math.max(b.w||8, b.h||6);
          ctx.beginPath();
          if((b.vx||0) >= 0){
            // vers la droite
            ctx.moveTo(b.x - s*0.6, b.y - s*0.5);
            ctx.lineTo(b.x - s*0.6, b.y + s*0.5);
            ctx.lineTo(b.x + s*0.6, b.y);
          } else {
            // vers la gauche
            ctx.moveTo(b.x + s*0.6, b.y - s*0.5);
            ctx.lineTo(b.x + s*0.6, b.y + s*0.5);
            ctx.lineTo(b.x - s*0.6, b.y);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h);
        }
      }
      
      // telegraphs (warning lines)
      ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 1;
      telegraphs.forEach(t=>{ ctx.beginPath(); ctx.moveTo(t.x, box.y); ctx.lineTo(t.x, box.y+box.h); ctx.stroke(); });
      
  // HUD combat (phase + timer + hearts + barre de vie boss)
  const timerEl = document.getElementById('fightTimer');
  const phaseEl = document.getElementById('fightPhase');
  if(timerEl) timerEl.textContent = `${phaseTimer.toFixed(1)}s`;
  if(phaseEl) phaseEl.textContent = (phase === 'dodge' ? 'ESQUIVE' : 'ATTAQUE');
      const hearts = '❤'.repeat(hp) + '♡'.repeat(5-hp);
      document.getElementById('fightHearts').innerHTML = hearts.split('').map(ch=>`<span class="heart">${ch}</span>`).join('');
      
      // Barre de vie du boss (maintenant visible)
      const bossBar = document.getElementById('fightBossHP');
      if(bossBar) {
        const pct = (bossHP / maxBossHP) * 100;
        bossBar.style.width = pct + '%';
      }

      // Check fin de combat
      if(hp <= 0){
        // MORT -> SCREAMER
        fightRunning = false;
        window.removeEventListener('keydown', kdn);
        window.removeEventListener('keyup', kup);
        showScreamer();
        return;
      }
      
      if(bossHP <= 0){
        // VICTOIRE
        fightRunning = false;
        window.removeEventListener('keydown', kdn);
        window.removeEventListener('keyup', kup);
        fightExit.hidden = false;
        fightInfo.textContent = 'L\'entité a été vaincue... pour l\'instant';
        return;
      }

      requestAnimationFrame(loop);
    }
    fightExit.hidden = true;
  fightInfo.textContent = 'Esquivez puis attaquez (ESPACE) - 3 coups pour vaincre';
    requestAnimationFrame(loop);

    fightExit.onclick = ()=>{
      fightWrap.hidden = true;
      gameMode = 'explore';
      // pointer can be relocked by clicking the 3D viewport again
    };
  }

  // =============================
  // SCREAMER sur mort (style The Boiled One)
  // =============================
  function showScreamer() {
    // Créer overlay de screamer
    const screamer = document.createElement('div');
    screamer.id = 'screamer';
    screamer.style.cssText = `
      position: fixed;
      inset: 0;
      background: #000;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: screamerGlitch 0.1s infinite;
    `;
    
    // Canvas pour dessiner le visage horrifiant
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.cssText = 'width: 100vw; height: 100vh; object-fit: contain; image-rendering: pixelated;';
    
    const ctx = canvas.getContext('2d');
    
    // Fond noir avec bruit rouge
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
    
    const imgData = ctx.getImageData(0, 0, 800, 600);
    for(let i = 0; i < imgData.data.length; i += 4) {
      const noise = Math.random() * 40;
      imgData.data[i] = noise * 2.5;
      imgData.data[i+1] = noise * 0.2;
      imgData.data[i+2] = noise * 0.2;
      imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    
    // Visage horrifiant style The Boiled One
    ctx.save();
    ctx.translate(400, 300);
    
    // Tête déformée
    ctx.fillStyle = '#0f0808';
    ctx.beginPath();
    ctx.ellipse(0, 0, 150, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ombres profondes
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.ellipse(-50, -30, 55, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(50, -30, 55, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Yeux blancs fixes immenses (style The Boiled One)
    ctx.fillStyle = '#eeeeee';
    ctx.beginPath();
    ctx.ellipse(-50, -25, 35, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(50, -25, 35, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupilles noires qui fixent
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-50, -15, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(50, -15, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // Bouche béante horrifiante
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 70, 65, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Dents cassées irrégulières
    ctx.fillStyle = '#c4c4c4';
    for(let i = 0; i < 9; i++) {
      const x = -50 + i * 12;
      const h1 = 15 + Math.random() * 10;
      const h2 = 12 + Math.random() * 8;
      ctx.fillRect(x, 40, 9, h1);
      ctx.fillRect(x, 85, 9, h2);
    }
    
    ctx.restore();
    
    // Texte glitché "JEAN MICHEL"
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    
    for(let i = 0; i < 5; i++) {
      const offset = (Math.random() - 0.5) * 12;
      ctx.globalAlpha = 0.3 + Math.random() * 0.7;
      ctx.fillText('JEAN MICHEL', 400 + offset, 520);
    }
    ctx.globalAlpha = 1;
    
    // Vignette rouge intense
    const grad = ctx.createRadialGradient(400, 300, 150, 400, 300, 550);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(100,0,0,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);
    
    screamer.appendChild(canvas);
    
    // Son de screamer (basse fréquence inquiétante)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 55; // Note grave
      gain.gain.value = 0.4;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      
      // Fade out progressif
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 3);
      setTimeout(() => osc.stop(), 3000);
    } catch(e) {}
    
    document.body.appendChild(screamer);
    
    // Retirer après 4 secondes et permettre de recommencer
    setTimeout(() => {
      screamer.remove();
      fightWrap.hidden = false;
      fightExit.hidden = false;
      fightInfo.textContent = 'Vous avez succombé aux ténèbres...';
    }, 4000);
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
