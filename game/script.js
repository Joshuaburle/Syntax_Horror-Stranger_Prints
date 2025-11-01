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
  renderer.setPixelRatio(Math.max(1, window.devicePixelRatio * DPRScale));
  renderer.setSize(window.innerWidth, window.innerHeight);
  viewport.appendChild(renderer.domElement);

  // Scene & camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0508); // plus sombre, teinte rougeâtre
  scene.fog = new THREE.FogExp2(0x120a0d, 0.008); // brouillard réduit pour mieux voir (était 0.015)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0); // eye height

  // Controls (Pointer Lock)
  const controls = new PointerLockControls(camera, renderer.domElement);
  let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false;
  let velocity = new THREE.Vector3();
  let speed = 2.65; // m/s (UI-controlled)

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

  // Créer textures procédurales pour un look PS2 amélioré
  function makeTexture(color, noise = 0.15) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Couleur de base
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    
    // Ajout de bruit
    const imgData = ctx.getImageData(0, 0, 128, 128);
    for(let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * noise * 255;
      imgData.data[i] += n;
      imgData.data[i+1] += n;
      imgData.data[i+2] += n;
    }
    ctx.putImageData(imgData, 0, 0);
    
    // Lignes de détail
    ctx.strokeStyle = `rgba(0,0,0,${noise * 0.5})`;
    ctx.lineWidth = 1;
    for(let i = 0; i < 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  const wallTex = makeTexture('#1a1416', 0.2);
  const floorTex = makeTexture('#0d0a0b', 0.25);
  const ceilTex = makeTexture('#0f0c0d', 0.2);

  const wallMat = new THREE.MeshLambertMaterial({ color:0x1a1416, map: wallTex }); 
  const floorMat = new THREE.MeshLambertMaterial({ color:0x0d0a0b, map: floorTex }); 
  const ceilMat = new THREE.MeshLambertMaterial({ color:0x0f0c0d, map: ceilTex }); 
  
  // Matériaux pour détails inquiétants
  const stainMat = new THREE.MeshBasicMaterial({ color:0x2a1215, transparent:true, opacity:0.6 }); // taches sombres
  const rustMat = new THREE.MeshStandardMaterial({ color:0x3d2520, metalness:0.4, roughness:0.95 }); // rouille

  const width=4, height=3, length=12, segments=12; // shorten total length ~144m
  const wallGeo = new THREE.BoxGeometry(0.2, height, length);
  const floorGeo = new THREE.PlaneGeometry(width, length);

  // Build corridor with simple door frames every 5 segments
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

    // Ajouter des taches inquiétantes sur les murs (style Observo)
    if(Math.random() < 0.4){
      const stainSize = 0.3 + Math.random() * 0.8;
      const stain = new THREE.Mesh(
        new THREE.CircleGeometry(stainSize, 8),
        stainMat
      );
      stain.position.set(
        (Math.random()<0.5?-1:1) * (width/2 - 0.1),
        0.4 + Math.random() * (height-0.8),
        z - length/2 + (Math.random()-0.5)*length*0.8
      );
      stain.rotation.y = Math.random()<0.5 ? Math.PI/2 : -Math.PI/2;
      corridor.add(stain);
    }

    // Câbles pendants (détails oppressants)
    if(Math.random() < 0.25){
      const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6 + Math.random()*0.4, 6);
      const cableMat = new THREE.MeshLambertMaterial({ color:0x1a1a1a });
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.position.set(
        (Math.random()-0.5) * width * 0.6,
        height - 0.3,
        z - length/2 + (Math.random()-0.5)*length
      );
      corridor.add(cable);
    }

    // Light every few segments (with slight flicker later) - lumière plus forte
    if(i % 3 === 0){
      const lamp = new THREE.PointLight(0xd4695a, 2.8, 22, 1.8); // lumière plus forte
      lamp.position.set(0, height-0.3, z - length + 1.0);
      lamp.userData.baseIntensity = 2.8;
      lamp.userData.flickerSpeed = 0.3 + Math.random()*0.4;
      corridor.add(lamp);
    }

    // Door frame every 5 segments - portes rouillées et inquiétantes
    if(i>0 && i % 5 === 0){
      const barMat = rustMat; // utiliser le matériau rouillé
      const pillarGeo = new THREE.BoxGeometry(0.15, height, 0.6);
      const beamGeo = new THREE.BoxGeometry(width, 0.12, 0.6);
      const zf = z + 0.3;
      const pL = new THREE.Mesh(pillarGeo, barMat); pL.position.set(-width/2+0.15/2, height/2, zf);
      const pR = new THREE.Mesh(pillarGeo, barMat); pR.position.set( width/2-0.15/2, height/2, zf);
      const beam = new THREE.Mesh(beamGeo, barMat); beam.position.set(0, height-0.15/2, zf);
      corridor.add(pL, pR, beam);
    }
  }

  // Éclairage ambiant amélioré pour mieux voir
  const ambient = new THREE.AmbientLight(0x5a4540, 0.8); // augmenté significativement
  scene.add(ambient);
  const startLamp = new THREE.PointLight(0xd4695a, 3.5, 18, 2.0); // lumière de départ plus forte
  startLamp.position.set(0, 2.2, -2);
  startLamp.userData.baseIntensity = 3.5;
  startLamp.userData.flickerSpeed = 0.35;
  scene.add(startLamp);
  // Lumière hémisphérique douce pour meilleure visibilité
  const hemi = new THREE.HemisphereLight(0x8a6a5a, 0x3a2a20, 0.4);
  scene.add(hemi);

  // Particules de poussière pour l'atmosphère
  const dustCount = 200;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for(let i = 0; i < dustCount; i++) {
    dustPos[i*3] = (Math.random() - 0.5) * width * 2;
    dustPos[i*3+1] = Math.random() * height;
    dustPos[i*3+2] = -Math.random() * segments * length;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ 
    color: 0x8a6a6a, 
    size: 0.04, 
    transparent: true, 
    opacity: 0.4,
    sizeAttenuation: true
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Yeux multi-oculaires organiques (clusters d'yeux style biomécanique - OPTIMISÉ)
  const eyes = [];
  
  function createEyeCluster(x, y, z, size = 1) {
    const cluster = new THREE.Group();
    const eyesInCluster = [];
    
    // Nombre d'yeux réduit (2 à 4 au lieu de 3-7)
    const eyeCount = 2 + Math.floor(Math.random() * 3);
    
    // Masse organique centrale plus simple (moins de segments)
    const massGeo = new THREE.SphereGeometry(0.2 * size, 8, 8);
    const massMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a0f12,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x0a0505,
      emissiveIntensity: 0.2
    });
    const mass = new THREE.Mesh(massGeo, massMat);
    cluster.add(mass);
    
    // Créer plusieurs yeux de tailles variées autour
    for(let i = 0; i < eyeCount; i++) {
      const eyeSize = (0.5 + Math.random() * 0.5) * size;
      const angle = (i / eyeCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 0.15 * size + Math.random() * 0.08 * size;
      const eyeX = Math.cos(angle) * radius;
      const eyeY = Math.sin(angle) * radius;
      const eyeZ = (Math.random() - 0.5) * 0.08 * size;
      
      const eyeGroup = new THREE.Group();
      
      // Peau/chair autour de l'œil - géométrie simplifiée
      const skinGeo = new THREE.SphereGeometry(0.12 * eyeSize, 6, 6);
      const skinMat = new THREE.MeshStandardMaterial({ 
        color: 0x8a6c6c,
        roughness: 0.85,
        metalness: 0
      });
      const skin = new THREE.Mesh(skinGeo, skinMat);
      
      // Globe oculaire - géométrie simplifiée
      const eyeballGeo = new THREE.SphereGeometry(0.1 * eyeSize, 8, 8);
      const eyeballMat = new THREE.MeshStandardMaterial({ 
        color: 0xf4e4d8,
        roughness: 0.2,
        metalness: 0.05,
        emissive: 0x1a1212,
        emissiveIntensity: 0.1
      });
      const eyeball = new THREE.Mesh(eyeballGeo, eyeballMat);
      eyeball.position.z = 0.04 * eyeSize;
      
      // Iris (couleur variée - plus visible)
      const irisColors = [0x5a6aaa, 0xaa5a6a, 0x6aaa5a, 0x8a5a8a];
      const irisGeo = new THREE.CircleGeometry(0.06 * eyeSize, 8); // plus grand
      const irisMat = new THREE.MeshStandardMaterial({ 
        color: irisColors[Math.floor(Math.random() * irisColors.length)],
        roughness: 0.3,
        side: THREE.DoubleSide
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.101 * eyeSize; // plus proche de la surface
      
      // Pupille - plus grande et visible
      const pupilGeo = new THREE.CircleGeometry(0.03 * eyeSize, 8);
      const pupilMat = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        side: THREE.DoubleSide
      });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.102 * eyeSize;
      
      // Reflet plus visible
      const highlightGeo = new THREE.CircleGeometry(0.02 * eyeSize, 4);
      const highlightMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(-0.03 * eyeSize, 0.03 * eyeSize, 0.103 * eyeSize);
      
      // Vaisseaux sanguins simplifiés (moins de lignes)
      const veinsGeo = new THREE.BufferGeometry();
      const veinPositions = [];
      for(let v = 0; v < 3; v++) { // réduit de 6 à 3
        const vAngle = (v / 3) * Math.PI * 2;
        const vr = 0.08 * eyeSize;
        veinPositions.push(
          Math.cos(vAngle) * vr * 0.2, Math.sin(vAngle) * vr * 0.2, 0.09 * eyeSize,
          Math.cos(vAngle) * vr, Math.sin(vAngle) * vr, 0.02 * eyeSize
        );
      }
      veinsGeo.setAttribute('position', new THREE.Float32BufferAttribute(veinPositions, 3));
      const veinMat = new THREE.LineBasicMaterial({ 
        color: 0xaa3a3a,
        transparent: true,
        opacity: 0.5
      });
      const veins = new THREE.LineSegments(veinsGeo, veinMat);
      
      eyeGroup.add(skin);
      eyeGroup.add(eyeball);
      eyeGroup.add(veins);
      eyeGroup.add(iris);
      eyeGroup.add(pupil);
      eyeGroup.add(highlight);
      
      eyeGroup.position.set(eyeX, eyeY, eyeZ);
      eyeGroup.rotation.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        0
      );
      
      cluster.add(eyeGroup);
      
      eyesInCluster.push({
        group: eyeGroup,
        iris: iris,
        pupil: pupil,
        highlight: highlight,
        eyeball: eyeball,
        size: eyeSize,
        baseRotation: eyeGroup.rotation.clone()
      });
    }
    
    // Tentacules réduits et simplifiés
    const tentacleCount = 2 + Math.floor(Math.random() * 3); // réduit de 3-7 à 2-4
    for(let t = 0; t < tentacleCount; t++) {
      const angle = (t / tentacleCount) * Math.PI * 2 + Math.random();
      const length = 0.12 + Math.random() * 0.18;
      
      const tentacleGeo = new THREE.CylinderGeometry(
        0.008 * size, 
        0.02 * size, 
        length * size, 
        4 // réduit de 6 à 4 segments
      );
      const tentacleMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a1a1a,
        roughness: 0.9,
        metalness: 0
      });
      const tentacle = new THREE.Mesh(tentacleGeo, tentacleMat);
      
      tentacle.position.set(
        Math.cos(angle) * 0.15 * size,
        Math.sin(angle) * 0.15 * size,
        -length * size * 0.5
      );
      tentacle.rotation.set(
        Math.cos(angle) * Math.PI/3,
        0,
        Math.sin(angle) * Math.PI/3
      );
      
      cluster.add(tentacle);
    }
    
    cluster.position.set(x, y, z);
    
    // Lumière rouge du cluster - moins intensive
    const clusterLight = new THREE.SpotLight(0xcc2222, 0, 18, Math.PI/3, 0.6, 2);
    clusterLight.position.copy(cluster.position);
    clusterLight.position.z += 0.3 * size;
    clusterLight.target.position.set(0, 1.6, z);
    scene.add(clusterLight);
    scene.add(clusterLight.target);
    
    corridor.add(cluster);
    
    eyes.push({
      cluster: cluster,
      mass: mass,
      eyesInCluster: eyesInCluster,
      light: clusterLight,
      lightTarget: clusterLight.target,
      basePos: cluster.position.clone(),
      size: size,
      pulseOffset: Math.random() * Math.PI * 2,
      blinkTimer: Math.random() * 10,
      isWatching: false,
      watchIntensity: 0,
      nervousness: Math.random()
    });
    
    return cluster;
  }
  
  // Placer des clusters d'yeux de manière OPTIMISÉE (moins de clusters, mieux positionnés)
  for(let i = 1; i < segments; i++) {
    const z = -i * length;
    
    // UN SEUL cluster par segment sur les murs (au lieu de 2)
    if(Math.random() < 0.7) { // seulement 70% des segments
      const side = Math.random() < 0.5 ? -1 : 1;
      const wallX = side * (width/2 - 0.35); // PLUS LOIN du mur (0.35 au lieu de 0.2)
      const wallY = 0.5 + Math.random() * 1.8;
      const wallZ = z + (Math.random() - 0.5) * length * 0.6;
      const clusterSize = 0.7 + Math.random() * 0.5;
      const cluster = createEyeCluster(wallX, wallY, wallZ, clusterSize);
      cluster.rotation.y = side > 0 ? -Math.PI/2 : Math.PI/2;
    }
    
    // Clusters au plafond - RÉDUIT
    if(Math.random() < 0.3) { // réduit de 50% à 30%
      const ceilX = (Math.random() - 0.5) * width * 0.5;
      const ceilY = height - 0.25; // plus bas du plafond
      const ceilZ = z + (Math.random() - 0.5) * length * 0.5;
      const clusterSize = 0.5 + Math.random() * 0.5;
      const cluster = createEyeCluster(ceilX, ceilY, ceilZ, clusterSize);
      cluster.rotation.x = Math.PI/2;
    }
    
    // Clusters au sol - ENCORE PLUS RARE
    if(Math.random() < 0.05) { // réduit de 10% à 5%
      const floorX = (Math.random() - 0.5) * width * 0.4;
      const floorY = 0.12;
      const floorZ = z + (Math.random() - 0.5) * length * 0.4;
      const clusterSize = 0.4 + Math.random() * 0.5;
      const cluster = createEyeCluster(floorX, floorY, floorZ, clusterSize);
      cluster.rotation.x = -Math.PI/2;
    }
  }


  // Simple collision with walls (AABB inside corridor)
  let halfW = (width/2) - 0.35; // margin from walls (peut varier avec les yeux)
  let corridorNarrowFactor = 0; // Facteur de rétrécissement du couloir (0 à 1)

  // Knife at far end (low-poly group)
  let hasKnife = false;
  function makeKnife(){
    const g = new THREE.Group();
    // blade
    const bladeGeo = new THREE.BoxGeometry(0.06, 0.01, 0.45);
    const bladeMat = new THREE.MeshStandardMaterial({ color:0xdfe3ea, metalness:0.95, roughness:0.2, emissive:0x1a1a1a, emissiveIntensity:0.3 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.name = 'blade';
    blade.position.set(0, 0.015, 0.1);
    // guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.02), new THREE.MeshStandardMaterial({ color:0x999999, metalness:0.6, roughness:0.5 }));
    guard.position.set(0, 0.01, -0.12);
    // handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.02,0.16,6), new THREE.MeshStandardMaterial({ color:0x5a3a1f, metalness:0.05, roughness:0.9 }));
    handle.rotation.x = Math.PI/2; handle.position.set(0,0.02,-0.2);
    // pommel
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.018,6,6), new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.5, roughness:0.5 }));
    pommel.position.set(0, 0.02, -0.28);
    g.add(blade, guard, handle, pommel);
    return g;
  }
  const knife = makeKnife();
  const bladeMesh = knife.getObjectByName('blade');
  if(bladeMesh) knife.userData.glowMat = bladeMesh.material;
  const endZ = -(segments-2)*length; // a bit before the very end
  knife.position.set(0, 1.0, endZ);
  knife.rotation.y = Math.PI * 0.15;
  const knifeLight = new THREE.PointLight(0xfff2e6, 1.6, 5.5, 2.2);
  knifeLight.position.set(0.1, 1.2, endZ);
  corridor.add(knife);
  corridor.add(knifeLight);
  // animate knife for visibility
  knife.userData.baseY = knife.position.y;

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

    // Simple flicker on lights - OPTIMISÉ (seulement tous les 3 frames)
    if(frameCount % 3 === 0) {
      corridor.children.forEach(obj=>{
        if(obj.isPointLight){
          const flicker = obj.userData.flickerSpeed || 0.3;
          const base = obj.userData.baseIntensity || 1.8;
          if(Math.random() < flicker * dt * 30){
            obj.intensity = base * (0.4 + Math.random()*0.6);
          } else {
            obj.intensity += (base - obj.intensity) * dt * 3;
          }
        }
      });
    }

    // Animer les particules de poussière - OPTIMISÉ (tous les 2 frames)
    if(dust && frameCount % 2 === 0) {
      const positions = dust.geometry.attributes.position.array;
      for(let i = 0; i < positions.length; i += 3) {
        positions[i+1] -= dt * 0.15;
        if(positions[i+1] < 0) positions[i+1] = height;
        positions[i] += Math.sin(now * 0.0003 + i) * dt * 0.05;
      }
      dust.geometry.attributes.position.needsUpdate = true;
      dust.rotation.y += dt * 0.02;
    }

    // Animer les clusters d'yeux - OPTIMISÉ
    eyes.forEach((eyeCluster, clusterIdx) => {
      // Mettre à jour seulement certains clusters par frame pour optimiser
      if(frameCount % 2 === clusterIdx % 2 && gameMode === 'explore') {
        const clusterPos = eyeCluster.cluster.position;
        const playerPos = camera.position;
        
        const distToPlayer = clusterPos.distanceTo(playerPos);
        const watchDistance = 12;
        const closeDistance = 6;
        
        // Pulsation organique de la masse centrale - SIMPLIFIÉ
        const pulse = 1 + Math.sin(now * 0.003 + eyeCluster.pulseOffset) * 0.06;
        eyeCluster.mass.scale.set(pulse, pulse, pulse);
        
        if(distToPlayer < watchDistance) {
          eyeCluster.isWatching = true;
          const proximity = 1 - (distToPlayer / watchDistance);
          eyeCluster.watchIntensity = Math.min(1, eyeCluster.watchIntensity + dt * (1.5 + proximity));
          
          // Yeux du cluster regardent le joueur - SIMPLIFIÉ
          eyeCluster.eyesInCluster.forEach((eye, idx) => {
            const eyeWorldPos = new THREE.Vector3();
            eye.group.getWorldPosition(eyeWorldPos);
            
            const dx = playerPos.x - eyeWorldPos.x;
            const dy = playerPos.y - eyeWorldPos.y;
            
            const maxOffset = 0.08 * eye.size;
            let offsetX = dx * 0.02;
            let offsetY = dy * 0.02;
            
            // Nervosité réduite
            const nervousness = eyeCluster.nervousness * eyeCluster.watchIntensity * 0.5;
            offsetX += Math.sin(now * 0.008 + idx) * 0.01 * nervousness;
            offsetY += Math.cos(now * 0.01 + idx) * 0.01 * nervousness;
            
            const dist = Math.hypot(offsetX, offsetY);
            if(dist > maxOffset) {
              offsetX = (offsetX / dist) * maxOffset;
              offsetY = (offsetY / dist) * maxOffset;
            }
            
            eye.iris.position.x += (offsetX - eye.iris.position.x) * dt * 6;
            eye.iris.position.y += (offsetY - eye.iris.position.y) * dt * 6;
            eye.pupil.position.x = eye.iris.position.x;
            eye.pupil.position.y = eye.iris.position.y;
            
            eye.highlight.position.x = -0.03 * eye.size + eye.iris.position.x * 0.4;
            eye.highlight.position.y = 0.03 * eye.size + eye.iris.position.y * 0.4;
            
            // Dilatation de la pupille simplifiée
            if(distToPlayer < closeDistance) {
              const closeness = 1 - (distToPlayer / closeDistance);
              const dilate = 1 + closeness * 0.6;
              eye.pupil.scale.set(dilate, dilate, 1);
              
              // Globe pulse simplifié
              const fastPulse = 1 + Math.sin(now * 0.006 + idx) * 0.03 * closeness;
              eye.eyeball.scale.set(fastPulse, fastPulse, fastPulse);
            } else {
              eye.pupil.scale.set(1, 1, 1);
              eye.eyeball.scale.set(1, 1, 1);
            }
          });
          
          // Lumière du cluster - OPTIMISÉ
          if(distToPlayer < closeDistance) {
            const closeness = 1 - (distToPlayer / closeDistance);
            eyeCluster.light.intensity = closeness * 4 * eyeCluster.watchIntensity; // réduit de 5 à 4
            eyeCluster.light.distance = 18 + closeness * 15; // réduit la portée
          } else {
            eyeCluster.light.intensity = eyeCluster.watchIntensity * 1.0;
          }
          
          eyeCluster.lightTarget.position.copy(camera.position);
          
          // Rotation du cluster vers le joueur - SIMPLIFIÉ
          const turnToPlayer = Math.atan2(
            playerPos.x - clusterPos.x,
            playerPos.z - clusterPos.z
          );
          eyeCluster.cluster.rotation.y += (turnToPlayer - eyeCluster.cluster.rotation.y) * dt * 0.4;
          
        } else {
          // Mouvement erratique nerveux - SIMPLIFIÉ
          eyeCluster.isWatching = false;
          eyeCluster.watchIntensity = Math.max(0, eyeCluster.watchIntensity - dt * 0.7);
          
          eyeCluster.eyesInCluster.forEach((eye, idx) => {
            const randomAngle = now * 0.0015 * (1 + idx * 0.2);
            const maxWander = 0.05 * eye.size; // réduit le mouvement
            
            const wanderX = Math.cos(randomAngle) * maxWander * Math.sin(now * 0.002 + idx);
            const wanderY = Math.sin(randomAngle * 1.3) * maxWander * Math.cos(now * 0.0018 + idx);
            
            eye.iris.position.x += (wanderX - eye.iris.position.x) * dt * 2.5;
            eye.iris.position.y += (wanderY - eye.iris.position.y) * dt * 2.5;
            eye.pupil.position.x = eye.iris.position.x;
            eye.pupil.position.y = eye.iris.position.y;
            
            eye.highlight.position.x = -0.03 * eye.size + eye.iris.position.x * 0.4;
            eye.highlight.position.y = 0.03 * eye.size + eye.iris.position.y * 0.4;
            
            eye.pupil.scale.set(1, 1, 1);
            eye.eyeball.scale.set(1, 1, 1);
          });
          
          eyeCluster.light.intensity = eyeCluster.watchIntensity * 0.3;
          
          // Ondulation simplifiée
          eyeCluster.cluster.rotation.z = Math.sin(now * 0.0008 + eyeCluster.pulseOffset) * 0.08;
        }
        
        // Clignement synchronisé - SIMPLIFIÉ et moins fréquent
        eyeCluster.blinkTimer -= dt;
        if(eyeCluster.blinkTimer <= 0) {
          const blinkDuration = 0.12;
          const startTime = performance.now();
          
          const blink = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = elapsed / blinkDuration;
            
            eyeCluster.eyesInCluster.forEach(eye => {
              if(progress < 0.5) {
                const close = progress * 2;
                eye.iris.scale.y = 1 - close * 0.95;
                eye.pupil.scale.y = 1 - close * 0.95;
                eye.highlight.scale.y = 1 - close;
              } else if(progress < 1) {
                const open = (progress - 0.5) * 2;
                eye.iris.scale.y = 0.05 + open * 0.95;
                eye.pupil.scale.y = 0.05 + open * 0.95;
                eye.highlight.scale.y = open;
              } else {
                eye.iris.scale.y = 1;
                eye.pupil.scale.y = 1;
                eye.highlight.scale.y = 1;
                return;
              }
            });
            
            if(progress < 1) requestAnimationFrame(blink);
          };
          blink();
          
          // Temps entre clignements augmenté
          eyeCluster.blinkTimer = eyeCluster.isWatching ? 
            (10 + Math.random() * 20) : 
            (3 + Math.random() * 8);
        }
      }
    });
    
    // Rétrécissement basé sur les clusters - OPTIMISÉ
    if(frameCount % 5 === 0) { // calculer seulement tous les 5 frames
      let maxWatchIntensity = 0;
      let watchingClustersCount = 0;
      eyes.forEach(cluster => {
        if(cluster.isWatching) {
          watchingClustersCount++;
          if(cluster.watchIntensity > maxWatchIntensity) {
            maxWatchIntensity = cluster.watchIntensity;
          }
        }
      });
      
      const narrowAmount = Math.min(watchingClustersCount / 8, 1) * maxWatchIntensity * 0.6;
      corridorNarrowFactor += (narrowAmount - corridorNarrowFactor) * dt * 0.8;
      halfW = (width/2) - 0.35 - corridorNarrowFactor;
      
      // Brouillard rouge intense
      if(maxWatchIntensity > 0.4) {
        const redIntensity = Math.floor(maxWatchIntensity * 40);
        scene.fog.color.setHex(0x120a0d + redIntensity * 0x010000);
      } else {
        scene.fog.color.setHex(0x120a0d);
      }
    }

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
      velocity.set((vx/mag)*speed*dt, 0, (vz/mag)*speed*dt);

      camera.position.x += velocity.x;
      camera.position.z += velocity.z;

      // Clamp within corridor
      camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));
    }

    // Knife bob/rotate visual
    if(gameMode === 'explore' && knife.parent){
      knife.rotation.y += dt * 1.0;
      knife.position.y = knife.userData.baseY + Math.sin(now*0.003) * 0.05;
      const glowMat = knife.userData.glowMat;
      if(glowMat && glowMat.emissiveIntensity!=null){
        glowMat.emissiveIntensity = 0.25 + 0.1*Math.sin(now*0.005);
      }
    }

    // Knife pickup proximity (press E)
    if(gameMode === 'explore' && !hasKnife){
      const d = camera.position.distanceTo(knife.position);
      if(d < 2.0){
        setPrompt('Appuyez sur E pour saisir l\'arme');
        if(interactPressed){
          hasKnife = true;
          knife.parent?.remove(knife);
          flashMsg('Vous sentez son poids... et sa malédiction', 2200);
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
  try{ flashMsg('Les ténèbres vous observent...', 2400); }catch(e){}

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
  resetPos?.addEventListener('click', ()=>{ camera.position.set(0,1.6,0); });

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

    let last = performance.now();
    let acc = 0;
    let spawnAcc = 0;
    let phaseAcc = 0;
    let attackFlash = 0;

    const keys = new Set();
    function kdn(e){ 
      keys.add(e.code);
      // Attaquer avec ESPACE pendant la phase d'attaque
      if(e.code === 'Space' && phase === 'attack' && attackReady) {
        bossHP = Math.max(0, bossHP - 1);
        attackFlash = 0.5;
        attackReady = false;
        if(bossHP > 0) {
          // Retour en phase d'esquive
          phase = 'dodge';
          phaseTimer = 15;
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
          attackReady = true;
        }
      } else if(phase === 'attack') {
        if(phaseTimer <= 0 && attackReady) {
          // Rate l'attaque, retour en dodge
          phase = 'dodge';
          phaseTimer = 15;
          attackReady = false;
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
      
      // bullets
      ctx.fillStyle = '#ffffff';
      for(const b of bullets){ ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h); }
      
      // telegraphs (warning lines)
      ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 1;
      telegraphs.forEach(t=>{ ctx.beginPath(); ctx.moveTo(t.x, box.y); ctx.lineTo(t.x, box.y+box.h); ctx.stroke(); });
      
      // HUD (timer + hearts + barre de vie boss)
      const timerText = phase === 'dodge' ? `ESQUIVE: ${phaseTimer.toFixed(1)}s` : `ATTAQUE: ${phaseTimer.toFixed(1)}s`;
      document.getElementById('fightTimer').textContent = timerText;
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
