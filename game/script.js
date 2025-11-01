import * as THREE from 'three';import * as THREE from 'three';

import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';



// ========================================(function(){

// CONFIGURATION & ÉTAT DU JEU  // HUD elements

// ========================================  const promptEl = document.getElementById('prompt');

const CONFIG = {  const msgEl = document.getElementById('msg');

    corridor: {  const fightWrap = document.getElementById('fightWrap');

        width: 4,  const fightCanvas = document.getElementById('fight');

        height: 3,  const fightInfo = document.getElementById('fightInfo');

        length: 50  const fightExit = document.getElementById('fightExit');

    },  const ambToggle = document.getElementById('ambToggle');

    player: {  // Settings UI

        speed: 5,  const uiSpeed = document.getElementById('uiSpeed');

        sprintMultiplier: 1.5,  const uiFov = document.getElementById('uiFov');

        hp: 20,  const uiFog = document.getElementById('uiFog');

        maxHp: 20  const uiAmb = document.getElementById('uiAmb');

    },  const uiXhVis = document.getElementById('uiXhVis');

    combat: {  const uiXhColor = document.getElementById('uiXhColor');

        dodgeTime: 15,  const uiXhSize = document.getElementById('uiXhSize');

        playerSpeed: 200,  const resetPos = document.getElementById('resetPos');

        bulletSpeed: 150

    }  // Renderer in low resolution (PS2-like upscale)

};  const DPRScale = 0.6; // 0.5–0.7 looks good

  const viewport = document.getElementById('viewport');

let gameState = {  const renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:'low-power' });

    mode: 'exploration', // 'exploration' | 'combat'  renderer.setPixelRatio(Math.max(0.5, (window.devicePixelRatio||1) * DPRScale));

    hasKnife: false,  renderer.setSize(window.innerWidth, window.innerHeight);

    playerHp: CONFIG.player.hp,  viewport.appendChild(renderer.domElement);

    combatActive: false

};  // Scene & Camera

  const scene = new THREE.Scene();

// ========================================  scene.fog = new THREE.FogExp2(0x120a0d, 0.006);

// INITIALISATION SCENE & RENDERER  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

// ========================================  camera.position.set(0, 0.8, 0); // Hauteur ajustée pour bien voir

const viewport = document.getElementById('viewport');

const renderer = new THREE.WebGLRenderer({ antialias: false });  // Controls (Pointer Lock)

renderer.setSize(window.innerWidth, window.innerHeight);  const controls = new PointerLockControls(camera, renderer.domElement);

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));  viewport.addEventListener('click', ()=>{ if(!controls.isLocked) controls.lock(); });

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // Movement state

viewport.appendChild(renderer.domElement);  let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false, runPressed=false;

  let interactPressed = false;

const scene = new THREE.Scene();  let speed = 2.6;

scene.background = new THREE.Color(0x0a0505);  const velocity = new THREE.Vector3();

scene.fog = new THREE.FogExp2(0x0a0505, 0.015);

  function onKey(e, down){

const camera = new THREE.PerspectiveCamera(    const set = (code, val)=>{ if(e.code===code) return val; };

    75,    switch(e.code){

    window.innerWidth / window.innerHeight,      case 'KeyW': case 'KeyZ': case 'ArrowUp': moveForward = down; break;

    0.1,      case 'KeyS': case 'ArrowDown': moveBackward = down; break;

    1000      case 'KeyA': case 'KeyQ': case 'ArrowLeft': moveLeft = down; break;

);      case 'KeyD': case 'ArrowRight': moveRight = down; break;

camera.position.set(0, 1.6, 0);      case 'ShiftLeft': case 'ShiftRight': runPressed = down; break;

      case 'KeyE': if(down) interactPressed = true; break;

// ========================================    }

// CONTRÔLES FPS  }

// ========================================  window.addEventListener('keydown', e=>onKey(e,true));

const controls = new PointerLockControls(camera, renderer.domElement);  window.addEventListener('keyup', e=>onKey(e,false));

const keys = {

    forward: false,  // =============================

    backward: false,  // Textures procédurales (panneaux/bruit)

    left: false,  // =============================

    right: false,  function makeTexture(hex = '#2b2422', noise = 0.15) {

    sprint: false,    const cvs = document.createElement('canvas');

    interact: false    cvs.width = cvs.height = 128;

};    const ctx = cvs.getContext('2d');

    ctx.fillStyle = hex;

document.addEventListener('click', () => {    ctx.fillRect(0,0,128,128);

    if (gameState.mode === 'exploration') {    // bruit

        controls.lock();    const img = ctx.getImageData(0,0,128,128);

    }    for(let i=0;i<img.data.length;i+=4){

});      const n = (Math.random()-0.5) * 255 * noise;

      img.data[i]   = Math.max(0, Math.min(255, img.data[i]  + n));

document.addEventListener('keydown', (e) => {      img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1]+ n*0.8));

    switch(e.code) {      img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2]+ n*0.6));

        case 'KeyW': case 'KeyZ': case 'ArrowUp': keys.forward = true; break;    }

        case 'KeyS': case 'ArrowDown': keys.backward = true; break;    ctx.putImageData(img, 0, 0);

        case 'KeyA': case 'KeyQ': case 'ArrowLeft': keys.left = true; break;    // lignes horizontales/verticales (panneaux)

        case 'KeyD': case 'ArrowRight': keys.right = true; break;    ctx.strokeStyle = 'rgba(0,0,0,0.25)';

        case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;    ctx.lineWidth = 1;

        case 'KeyE': keys.interact = true; break;    for(let y=0;y<=128;y+=16){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(128,y); ctx.stroke(); }

    }    for(let x=0;x<=128;x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,128); ctx.stroke(); }

});    const tex = new THREE.CanvasTexture(cvs);

    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

document.addEventListener('keyup', (e) => {    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.()||4);

    switch(e.code) {    tex.needsUpdate = true;

        case 'KeyW': case 'KeyZ': case 'ArrowUp': keys.forward = false; break;    return tex;

        case 'KeyS': case 'ArrowDown': keys.backward = false; break;  }

        case 'KeyA': case 'KeyQ': case 'ArrowLeft': keys.left = false; break;

        case 'KeyD': case 'ArrowRight': keys.right = false; break;  // Corridor build (wider, long)

        case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;  const corridor = new THREE.Group();

    }  scene.add(corridor);

});  const width = 1.8, height = 1.6, length = 2.0, segments = 15; // Hauteur augmentée



// ========================================  // Texture unifiée pour TOUTES les surfaces (sol, plafond, murs)

// CRÉATION DU COULOIR HORRIFIQUE  const corridorTex = makeTexture('#2b2422', 0.14); 

// ========================================  corridorTex.repeat.set(2, 2); // Répétition pour plus de détails

function createCorridor() {  const corridorMat = new THREE.MeshStandardMaterial({ 

    const corridor = new THREE.Group();    color: 0xffffff, 

        map: corridorTex, 

    // Texture procédurale sale et usée    roughness: 0.85, 

    const canvas = document.createElement('canvas');    metalness: 0.05,

    canvas.width = canvas.height = 256;    side: THREE.DoubleSide

    const ctx = canvas.getContext('2d');  });

    

    // Base gris foncé  const wallThickness = 0.01;

    ctx.fillStyle = '#1a1410';

    ctx.fillRect(0, 0, 256, 256);  for(let i=0;i<segments;i++){

        const z = -i*length;

    // Saleté et taches    // Sol avec la même texture que tout le reste

    for (let i = 0; i < 200; i++) {    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), corridorMat);

        ctx.fillStyle = `rgba(${Math.random() * 30}, ${Math.random() * 20}, ${Math.random() * 10}, ${Math.random() * 0.5})`;    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, z - length/2);

        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 20, Math.random() * 20);    // Plafond

    }    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(width, length), corridorMat);

        ceil.rotation.x = Math.PI/2; ceil.position.set(0, height, z - length/2);

    // Rayures verticales    // Murs

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, length), corridorMat);

    ctx.lineWidth = 2;    leftWall.position.set(-width/2, height/2, z - length/2);

    for (let x = 0; x < 256; x += 16) {    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, length), corridorMat);

        ctx.beginPath();    rightWall.position.set(width/2, height/2, z - length/2);

        ctx.moveTo(x, 0);    corridor.add(floor, ceil, leftWall, rightWall);

        ctx.lineTo(x, 256);

        ctx.stroke();    // Lampes seulement tous les 2 segments pour optimiser

    }    if(i % 2 === 0) {

          const lamp = new THREE.PointLight(0xd4695a, 3.0, 20, 1.5);

    const texture = new THREE.CanvasTexture(canvas);      const lampZ = z - length + 1.0;

    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;      lamp.position.set(0, height-0.3, lampZ);

    texture.repeat.set(4, 4);      lamp.userData.baseIntensity = 3.0;

          lamp.userData.flickerSpeed = 0.3 + Math.random()*0.3;

    const material = new THREE.MeshStandardMaterial({      corridor.add(lamp);

        map: texture,

        roughness: 0.9,      const fixture = new THREE.Group();

        metalness: 0.1      const bodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.04, 8);

    });      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d2a25, roughness: 0.9, metalness: 0.1 });

          const body = new THREE.Mesh(bodyGeo, bodyMat); body.rotation.x = Math.PI/2;

    // Sol      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0xffd2b0 }));

    const floor = new THREE.Mesh(      cap.rotation.x = -Math.PI/2; cap.position.y = -0.02;

        new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.length),      fixture.add(body, cap);

        material      fixture.position.set(0, height-0.28, lampZ);

    );      corridor.add(fixture);

    floor.rotation.x = -Math.PI / 2;    }

    floor.position.z = -CONFIG.corridor.length / 2;  }

    floor.receiveShadow = true;

    corridor.add(floor);  // Porte condamnée derrière le spawn avec chaînes et cadenas

      const sealedDoorZ = 0.5; // Proche derrière le spawn

    // Plafond  

    const ceiling = new THREE.Mesh(  // Cadre de porte en bois sombre

        new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.length),  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a1a15, roughness: 0.95, metalness: 0.0 });

        material  const sealedFrameTop = new THREE.Mesh(new THREE.BoxGeometry(width*0.6, 0.15, 0.1), doorFrameMat);

    );  sealedFrameTop.position.set(0, height*0.85, sealedDoorZ);

    ceiling.rotation.x = Math.PI / 2;  const sealedFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, height*0.9, 0.1), doorFrameMat);

    ceiling.position.y = CONFIG.corridor.height;  sealedFrameLeft.position.set(-width*0.3, height/2, sealedDoorZ);

    ceiling.position.z = -CONFIG.corridor.length / 2;  const sealedFrameRight = sealedFrameLeft.clone();

    corridor.add(ceiling);  sealedFrameRight.position.x = width*0.3;

      corridor.add(sealedFrameTop, sealedFrameLeft, sealedFrameRight);

    // Murs  

    const wallMaterial = material.clone();  // Double porte en bois usé

      const sealedDoorMat = new THREE.MeshStandardMaterial({ 

    const leftWall = new THREE.Mesh(    color: 0x3d2820, 

        new THREE.PlaneGeometry(CONFIG.corridor.length, CONFIG.corridor.height),    map: corridorTex, 

        wallMaterial    roughness: 0.9, 

    );    metalness: 0.0 

    leftWall.rotation.y = Math.PI / 2;  });

    leftWall.position.x = -CONFIG.corridor.width / 2;  const doorWidth = (width*0.6 - 0.12) / 2;

    leftWall.position.y = CONFIG.corridor.height / 2;  const doorHeight = height * 0.85;

    leftWall.position.z = -CONFIG.corridor.length / 2;  const sealedDoorL = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.08), sealedDoorMat);

    corridor.add(leftWall);  sealedDoorL.position.set(-doorWidth/2 - 0.03, height/2, sealedDoorZ);

      const sealedDoorR = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.08), sealedDoorMat);

    const rightWall = leftWall.clone();  sealedDoorR.position.set(doorWidth/2 + 0.03, height/2, sealedDoorZ);

    rightWall.position.x = CONFIG.corridor.width / 2;  corridor.add(sealedDoorL, sealedDoorR);

    rightWall.rotation.y = -Math.PI / 2;  

    corridor.add(rightWall);  // Chaînes qui traversent la porte (réduites à 3 pour performance)

      const chainMat = new THREE.MeshStandardMaterial({ 

    // Mur du fond (avant combat)    color: 0x4a4a4a, 

    const endWall = new THREE.Mesh(    roughness: 0.7, 

        new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.height),    metalness: 0.6 

        wallMaterial  });

    );  for(let i = 0; i < 3; i++) { // Réduit de 4 à 3

    endWall.position.z = -CONFIG.corridor.length;    const chainY = height * 0.3 + i * (height * 0.4 / 2);

    endWall.position.y = CONFIG.corridor.height / 2;    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width*0.65, 6), chainMat); // Réduit segments de 8 à 6

    corridor.add(endWall);    chain.rotation.z = Math.PI/2;

        chain.position.set(0, chainY, sealedDoorZ - 0.05); // Devant la porte

    scene.add(corridor);    corridor.add(chain);

        

    // Lumières vacillantes    // Maillons de chaîne (réduits)

    addCorridorLights();    for(let j = -2; j <= 2; j++) { // Réduit de -3,3 à -2,2

}      const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 10), chainMat); // Réduit segments

      link.rotation.y = Math.PI/2;

function addCorridorLights() {      link.position.set(j * 0.3, chainY, sealedDoorZ - 0.05); // Devant la porte

    // Lumière ambiante très faible      corridor.add(link);

    const ambient = new THREE.AmbientLight(0x4a3a3a, 0.1);    }

    scene.add(ambient);  }

      

    // Lumières ponctuelles le long du couloir  // Cadenas massif au centre

    const lightCount = 8;  const lockMat = new THREE.MeshStandardMaterial({ 

    const lights = [];    color: 0x3a3a3a, 

        roughness: 0.5, 

    for (let i = 0; i < lightCount; i++) {    metalness: 0.8 

        const light = new THREE.PointLight(0xff8844, 1.5, 12, 2);  });

        light.position.set(  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.08), lockMat);

            0,  lockBody.position.set(0, height/2, sealedDoorZ - 0.04); // Devant la porte

            CONFIG.corridor.height - 0.3,  corridor.add(lockBody);

            -i * (CONFIG.corridor.length / lightCount) - 2  

        );  // Anse du cadenas

        light.castShadow = true;  const lockShackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI), lockMat);

        light.shadow.bias = -0.001;  lockShackle.rotation.x = Math.PI/2;

        scene.add(light);  lockShackle.position.set(0, height/2 + 0.12, sealedDoorZ - 0.04); // Devant la porte

        lights.push(light);  corridor.add(lockShackle);

          

        // Ampoule visible  // Trou de serrure (détail noir)

        const bulbGeo = new THREE.SphereGeometry(0.1, 8, 8);  const keyholeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff6633 });  const keyhole = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), keyholeMat);

        const bulb = new THREE.Mesh(bulbGeo, bulbMat);  keyhole.position.set(0, height/2 - 0.02, sealedDoorZ - 0.03); // Devant la porte

        bulb.position.copy(light.position);  corridor.add(keyhole);

        scene.add(bulb);  

    }  // Sol derrière la porte avec texture unifiée

      const backFloor = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, 3), corridorMat);

    // Animation vacillement  backFloor.rotation.x = -Math.PI/2;

    let time = 0;  backFloor.position.set(0, 0, sealedDoorZ + 1.5);

    setInterval(() => {  corridor.add(backFloor);

        time += 0.1;  

        lights.forEach((light, i) => {  // Murs latéraux derrière la porte scellée (collision)

            if (Math.random() < 0.05) {  const backLeftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, 3), corridorMat);

                light.intensity = Math.random() * 2;  backLeftWall.position.set(-width/2, height/2, sealedDoorZ + 1.5);

            } else {  corridor.add(backLeftWall);

                light.intensity += (1.5 - light.intensity) * 0.1;  

            }  const backRightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, 3), corridorMat);

        });  backRightWall.position.set(width/2, height/2, sealedDoorZ + 1.5);

    }, 100);  corridor.add(backRightWall);

}  

  // Plafond derrière la porte

// ========================================  const backCeiling = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, 3), corridorMat);

// COUTEAU (OBJET À RAMASSER)  backCeiling.rotation.x = Math.PI/2;

// ========================================  backCeiling.position.set(0, height, sealedDoorZ + 1.5);

function createKnife() {  corridor.add(backCeiling);

    const knifeGroup = new THREE.Group();  

      // Mur de fond derrière la porte (collision)

    // Lame  const backWallWidth = width * 1.5;

    const bladeGeo = new THREE.BoxGeometry(0.05, 0.3, 0.02);  const backWallHeight = height * 1.5;

    const bladeMat = new THREE.MeshStandardMaterial({  const backWall = new THREE.Mesh(new THREE.BoxGeometry(backWallWidth, backWallHeight, wallThickness), corridorMat);

        color: 0xaaaaaa,  backWall.position.set(0, backWallHeight/2, sealedDoorZ + 0.01);

        metalness: 0.9,  corridor.add(backWall);

        roughness: 0.1

    });  // Mur de fin du couloir (au fond)

    const blade = new THREE.Mesh(bladeGeo, bladeMat);  const corridorEndZ = -(segments-1)*length;

    blade.position.y = 0.15;  const endWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness), corridorMat);

    knifeGroup.add(blade);  endWall.position.set(0, height/2, corridorEndZ);

      corridor.add(endWall);

    // Manche

    const handleGeo = new THREE.BoxGeometry(0.04, 0.12, 0.025);  // Ukulélé à récupérer (style Risk of Rain 2 - low poly coloré)

    const handleMat = new THREE.MeshStandardMaterial({  function makeUkulele() {

        color: 0x2a1a0a,    const group = new THREE.Group();

        roughness: 0.8    

    });    // Corps simplifié en bois clair (style RoR2)

    const handle = new THREE.Mesh(handleGeo, handleMat);    const bodyMat = new THREE.MeshStandardMaterial({ 

    handle.position.y = -0.06;      color: 0xf4b860,

    knifeGroup.add(handle);      roughness: 0.7, 

          metalness: 0.0,

    // Position dans le couloir      flatShading: true // Low poly look

    knifeGroup.position.set(0, 1.2, -CONFIG.corridor.length * 0.7);    });

    knifeGroup.rotation.z = Math.PI / 4;    

        // Corps principal (box arrondi)

    // Lumière autour du couteau    const body = new THREE.Mesh(

    const knifeLight = new THREE.PointLight(0xffaa00, 2, 5);      new THREE.BoxGeometry(0.25, 0.18, 0.08, 1, 1, 1),

    knifeLight.position.copy(knifeGroup.position);      bodyMat

    scene.add(knifeLight);    );

        body.position.set(0, 0, 0);

    scene.add(knifeGroup);    

        // Table d'harmonie (cercle plat orange)

    // Animation rotation    const soundboard = new THREE.Mesh(

    const animateKnife = () => {      new THREE.CircleGeometry(0.08, 8),

        if (!gameState.hasKnife) {      new THREE.MeshStandardMaterial({ 

            knifeGroup.rotation.y += 0.02;        color: 0xe89a3c, 

            knifeGroup.position.y = 1.2 + Math.sin(Date.now() * 0.003) * 0.1;        roughness: 0.8,

            requestAnimationFrame(animateKnife);        flatShading: true 

        }      })

    };    );

    animateKnife();    soundboard.rotation.y = Math.PI / 2;

        soundboard.position.x = 0.041;

    return { knife: knifeGroup, light: knifeLight };    

}    // Trou de résonance (petit cercle noir)

    const hole = new THREE.Mesh(

// ========================================      new THREE.CircleGeometry(0.02, 6),

// SYSTÈME DE COMBAT UNDERTALE      new THREE.MeshBasicMaterial({ color: 0x1a1a1a })

// ========================================    );

class CombatSystem {    hole.rotation.y = Math.PI / 2;

    constructor() {    hole.position.x = 0.042;

        this.canvas = document.getElementById('combat-canvas');    

        this.ctx = this.canvas.getContext('2d');    // Manche (box long brun foncé)

        this.screen = document.getElementById('combat-screen');    const neckMat = new THREE.MeshStandardMaterial({ 

        this.message = document.getElementById('combat-message');      color: 0x6b4423, 

              roughness: 0.8,

        this.box = {      flatShading: true

            x: 80,    });

            y: 80,    const neck = new THREE.Mesh(

            width: 480,      new THREE.BoxGeometry(0.35, 0.03, 0.025, 1, 1, 1),

            height: 320      neckMat

        };    );

            neck.position.set(-0.175, 0.09, 0);

        this.player = {    

            x: this.box.x + this.box.width / 2,    // Tête du manche (triangle stylisé)

            y: this.box.y + this.box.height / 2,    const headstock = new THREE.Mesh(

            size: 8,      new THREE.BoxGeometry(0.06, 0.05, 0.02, 1, 1, 1),

            speed: CONFIG.combat.playerSpeed      neckMat

        };    );

            headstock.position.set(-0.35, 0.09, 0);

        this.bullets = [];    

        this.time = 0;    // 4 cordes (lignes blanches très fines)

        this.dodgeTime = CONFIG.combat.dodgeTime;    const stringMat = new THREE.MeshStandardMaterial({ 

        this.active = false;      color: 0xf0f0f0, 

              roughness: 0.4,

        this.keys = {      metalness: 0.5

            up: false,    });

            down: false,    for(let i = 0; i < 4; i++) {

            left: false,      const string = new THREE.Mesh(

            right: false        new THREE.BoxGeometry(0.35, 0.003, 0.003, 1, 1, 1),

        };        stringMat

              );

        this.setupControls();      string.position.set(-0.175, 0.09, -0.012 + i * 0.008);

    }      group.add(string);

        }

    setupControls() {    

        document.addEventListener('keydown', (e) => {    // Chevalet (petit bloc marron)

            if (!this.active) return;    const bridge = new THREE.Mesh(

            switch(e.code) {      new THREE.BoxGeometry(0.04, 0.01, 0.03, 1, 1, 1),

                case 'ArrowUp': case 'KeyW': case 'KeyZ': this.keys.up = true; break;      new THREE.MeshStandardMaterial({ 

                case 'ArrowDown': case 'KeyS': this.keys.down = true; break;        color: 0x3a2010,

                case 'ArrowLeft': case 'KeyA': case 'KeyQ': this.keys.left = true; break;        flatShading: true 

                case 'ArrowRight': case 'KeyD': this.keys.right = true; break;      })

            }    );

        });    bridge.position.set(0.08, -0.08, 0);

            

        document.addEventListener('keyup', (e) => {    // Mécaniques simplifiées (4 petits cubes gris)

            if (!this.active) return;    const tunerMat = new THREE.MeshStandardMaterial({ 

            switch(e.code) {      color: 0xaaaaaa, 

                case 'ArrowUp': case 'KeyW': case 'KeyZ': this.keys.up = false; break;      metalness: 0.7,

                case 'ArrowDown': case 'KeyS': this.keys.down = false; break;      roughness: 0.3,

                case 'ArrowLeft': case 'KeyA': case 'KeyQ': this.keys.left = false; break;      flatShading: true

                case 'ArrowRight': case 'KeyD': this.keys.right = false; break;    });

            }    for(let i = 0; i < 4; i++) {

        });      const tuner = new THREE.Mesh(

    }        new THREE.BoxGeometry(0.015, 0.015, 0.015, 1, 1, 1),

            tunerMat

    start() {      );

        this.active = true;      tuner.position.set(-0.35, 0.09 + (i < 2 ? 0.015 : -0.015), -0.012 + (i % 2) * 0.008);

        this.screen.hidden = false;      group.add(tuner);

        this.message.textContent = "* Une entité vous attaque ! Esquivez !";    }

        controls.unlock();    

        this.loop();    group.add(body, soundboard, hole, neck, headstock, bridge);

    }    group.rotation.y = Math.PI / 4;

        return group;

    spawnBullets() {  }

        // Pattern 1: Vagues horizontales

        if (this.time % 2 < 0.1) {  const UKULELE_Z = -(segments/2) * length; // Au milieu du couloir

            const side = Math.random() < 0.5 ? 'left' : 'right';  const ukulele = makeUkulele();

            const y = this.box.y + Math.random() * this.box.height;  ukulele.position.set(0.3, 0.6, UKULELE_Z);

            this.bullets.push({  corridor.add(ukulele);

                x: side === 'left' ? this.box.x - 20 : this.box.x + this.box.width + 20,  

                y: y,  // Lumière pour l'ukulélé

                vx: side === 'left' ? CONFIG.combat.bulletSpeed : -CONFIG.combat.bulletSpeed,  const ukuleleLight = new THREE.PointLight(0xffd700, 2.0, 8);

                vy: 0,  ukuleleLight.position.copy(ukulele.position);

                size: 12  corridor.add(ukuleleLight);

            });  

        }  ukulele.userData.baseY = ukulele.position.y;

          

        // Pattern 2: Pluie verticale  // Éclairage ambiant optimisé

        if (Math.random() < 0.02) {  const ambient = new THREE.AmbientLight(0x6a554a, 0.8);

            for (let i = 0; i < 3; i++) {  scene.add(ambient);

                this.bullets.push({  const startLamp = new THREE.PointLight(0xd4695a, 3.5, 20, 1.6);

                    x: this.box.x + Math.random() * this.box.width,  startLamp.position.set(0, 2.2, -2);

                    y: this.box.y - 20,  startLamp.userData.baseIntensity = 3.5;

                    vx: 0,  startLamp.userData.flickerSpeed = 0.35;

                    vy: CONFIG.combat.bulletSpeed * 0.8,  scene.add(startLamp);

                    size: 10  const hemi = new THREE.HemisphereLight(0x8a6a5a, 0x3a2a20, 0.6);

                });  scene.add(hemi);

            }

        }  // Particules de poussière retirées pour optimisation

    }

      // Simple collision with walls (AABB inside corridor)

    update(dt) {  let halfW = (width/2) - 0.4;

        this.time += dt;

        this.dodgeTime -= dt;  let hasUkulele = false;

        

        if (this.dodgeTime <= 0) {  function setPrompt(text){

            this.win();    if(!text){ promptEl.hidden = true; return; }

            return;    promptEl.textContent = text; promptEl.hidden = false;

        }  }

          function flashMsg(text, ms=1400){

        // Déplacement joueur    msgEl.textContent = text; msgEl.hidden = false; setTimeout(()=>{ msgEl.hidden = true; }, ms);

        if (this.keys.up) this.player.y -= this.player.speed * dt;  }

        if (this.keys.down) this.player.y += this.player.speed * dt;

        if (this.keys.left) this.player.x -= this.player.speed * dt;  // Animation loop

        if (this.keys.right) this.player.x += this.player.speed * dt;  let prev = performance.now();

          let gameMode = 'explore'; // 'explore' | 'fight'

        // Contrainte dans la boîte  let frameCount = 0; // Pour optimiser certaines animations

        this.player.x = Math.max(this.box.x + this.player.size, Math.min(this.box.x + this.box.width - this.player.size, this.player.x));

        this.player.y = Math.max(this.box.y + this.player.size, Math.min(this.box.y + this.box.height - this.player.size, this.player.y));  function animate(){

            requestAnimationFrame(animate);

        // Spawn & update bullets    const now = performance.now();

        this.spawnBullets();    const dt = Math.min((now - prev)/1000, 0.05); // clamp delta

            prev = now;

        for (let i = this.bullets.length - 1; i >= 0; i--) {    frameCount++;

            const b = this.bullets[i];

            b.x += b.vx * dt;    // Flicker + clignotement visible sur les lampes (tous les 4 frames - optimisé)

            b.y += b.vy * dt;    if(frameCount % 4 === 0) { // Changé de 3 à 4

                  corridor.children.forEach(obj=>{

            // Suppression hors écran        if(obj.isPointLight){

            if (b.x < -50 || b.x > this.canvas.width + 50 ||           const flicker = obj.userData.flickerSpeed || 0.3;

                b.y < -50 || b.y > this.canvas.height + 50) {          const base = obj.userData.baseIntensity || 1.8;

                this.bullets.splice(i, 1);          // Blink occasional blackout

                continue;          const nowMs = performance.now();

            }          if(!obj.userData.blinkUntil && Math.random() < 0.003){ // Réduit de 0.004 à 0.003

                        obj.userData.blinkUntil = nowMs + 80 + Math.random()*180; // 80-260ms

            // Collision avec joueur          }

            const dx = b.x - this.player.x;          if(obj.userData.blinkUntil && nowMs < obj.userData.blinkUntil){

            const dy = b.y - this.player.y;            obj.intensity += (0 - obj.intensity) * 0.6; // rapid drop

            const dist = Math.sqrt(dx * dx + dy * dy);          } else {

                        obj.userData.blinkUntil = null;

            if (dist < this.player.size + b.size / 2) {            if(Math.random() < flicker * dt * 30){

                this.hit();              obj.intensity = base * (0.3 + Math.random()*0.7);

                this.bullets.splice(i, 1);            } else {

            }              obj.intensity += (base - obj.intensity) * dt * 3;

        }            }

    }          }

            }

    draw() {      });

        const ctx = this.ctx;    }

        

        // Fond noir    // (Particules retirées)

        ctx.fillStyle = '#000';

        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);  // ZQSD (et WASD) movement in local camera space when locked and exploring

            if(controls.isLocked && gameMode === 'explore'){

        // Boîte de combat      const dir = new THREE.Vector3();

        ctx.strokeStyle = '#fff';      camera.getWorldDirection(dir);

        ctx.lineWidth = 4;      dir.y = 0; dir.normalize(); // forward on XZ plane

        ctx.strokeRect(this.box.x, this.box.y, this.box.width, this.box.height);      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).negate();

        

        // Joueur (cœur rouge)      let vx = 0, vz = 0;

        ctx.fillStyle = '#ff0000';      if(moveForward) { vx += dir.x; vz += dir.z; }

        ctx.beginPath();      if(moveBackward){ vx -= dir.x; vz -= dir.z; }

        ctx.moveTo(this.player.x, this.player.y - this.player.size / 2);      if(moveLeft)    { vx += right.x; vz += right.z; }

        ctx.lineTo(this.player.x - this.player.size / 2, this.player.y);      if(moveRight)   { vx -= right.x; vz -= right.z; }

        ctx.lineTo(this.player.x, this.player.y + this.player.size);

        ctx.lineTo(this.player.x + this.player.size / 2, this.player.y);  const mag = Math.hypot(vx, vz) || 1;

        ctx.closePath();  const s = speed * (runPressed ? 1.9 : 1.0);

        ctx.fill();  velocity.set((vx/mag)*s*dt, 0, (vz/mag)*s*dt);

        

        // Bullets (cercles blancs)      camera.position.x += velocity.x;

        ctx.fillStyle = '#fff';      camera.position.z += velocity.z;

        this.bullets.forEach(b => {

            ctx.beginPath();      // Clamp within corridor

            ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);      camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));

            ctx.fill();      

        });      // Empêcher de traverser la porte scellée (collision arrière)

              if(camera.position.z > sealedDoorZ - 0.3) {

        // Timer        camera.position.z = sealedDoorZ - 0.3;

        ctx.fillStyle = '#ff0';      }

        ctx.font = 'bold 24px "Courier New"';      

        ctx.fillText(`Temps: ${Math.ceil(this.dodgeTime)}s`, 20, 40);      // Déclencher le combat au milieu du couloir (si ukulélé récupéré)

    }      const combatTriggerZ = -(segments/2 + 2) * length;

          if(hasUkulele && camera.position.z < combatTriggerZ && gameMode === 'explore') {

    hit() {        startFight();

        gameState.playerHp -= 5;      }

        updateHP();    }

        

        if (gameState.playerHp <= 0) {    // Animation de l'ukulélé

            this.gameOver();    if(ukulele && !hasUkulele) {

        }      ukulele.rotation.y += dt * 0.8;

    }      ukulele.position.y = ukulele.userData.baseY + Math.sin(now * 0.002) * 0.04;

          

    win() {      // Lumière pulsante

        this.active = false;      const glowMat = ukuleleLight.color;

        this.message.textContent = "* Vous avez survécu...";      ukuleleLight.intensity = 2.0 + 0.3 * Math.sin(now * 0.004);

        setTimeout(() => {      

            this.screen.hidden = true;      // Vérifier proximité pour ramassage

            showMessage("Vous avez vaincu l'entité...", 3000);      const d = camera.position.distanceTo(ukulele.position);

        }, 2000);      if(d < 2.0) {

    }        setPrompt('Appuyez sur E pour prendre l\'ukulélé');

            if(interactPressed) {

    gameOver() {          hasUkulele = true;

        this.active = false;          corridor.remove(ukulele);

        this.message.textContent = "* GAME OVER *";          corridor.remove(ukuleleLight);

        setTimeout(() => {          flashMsg('♪ Vous avez récupéré l\'ukulélé ! ♪', 2000);

            location.reload();          setPrompt('');

        }, 3000);          interactPressed = false;

    }        }

          } else {

    loop() {        if(msgEl.textContent.includes('ukulélé')) setPrompt('');

        if (!this.active) return;      }

            }

        const now = performance.now();    

        const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);    interactPressed = false;

        this.lastTime = now;

            renderer.render(scene, camera);

        this.update(dt);  }

        this.draw();  animate();

        

        requestAnimationFrame(() => this.loop());  function onResize(){

    }    camera.aspect = window.innerWidth / window.innerHeight;

}    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

const combat = new CombatSystem();  }

  window.addEventListener('resize', onResize);

// ========================================

// UI & HELPERS  // Pas de HUD au démarrage: ne pas afficher de message initial

// ========================================  // (HUD uniquement pendant le combat)

function showPrompt(text) {  try{ msgEl.hidden = true; promptEl.hidden = true; }catch(e){}

    const prompt = document.getElementById('prompt');

    prompt.textContent = text;  // =============================

    prompt.hidden = false;  // Settings wiring

}  // =============================

  uiSpeed?.addEventListener('input', ()=>{ speed = parseFloat(uiSpeed.value); });

function hidePrompt() {  uiFov?.addEventListener('input', ()=>{ camera.fov = parseFloat(uiFov.value); camera.updateProjectionMatrix(); });

    document.getElementById('prompt').hidden = true;  uiFog?.addEventListener('input', ()=>{ const d = parseFloat(uiFog.value); scene.fog.density = d; });

}  uiAmb?.addEventListener('input', ()=>{ ambient.intensity = parseFloat(uiAmb.value); });

  uiXhVis?.addEventListener('change', ()=>{ document.getElementById('crosshair').style.display = uiXhVis.checked ? 'block' : 'none'; });

function showMessage(text, duration = 2000) {  uiXhColor?.addEventListener('input', ()=>{ document.getElementById('crosshair').style.setProperty('--xh-color', uiXhColor.value); });

    const msg = document.getElementById('message');  uiXhSize?.addEventListener('input', ()=>{ document.getElementById('crosshair').style.setProperty('--xh-size', uiXhSize.value+'px'); });

    msg.textContent = text;  resetPos?.addEventListener('click', ()=>{ camera.position.set(0,0.8,0); }); // Hauteur ajustée

    msg.hidden = false;

    setTimeout(() => { msg.hidden = true; }, duration);  // =============================

}  // Simple Undertale-like fight EN PHASES

  // =============================

function updateHP() {  let fightRunning = false;

    const hpFill = document.getElementById('hp-fill');  function startFight(){

    const hpText = document.getElementById('hp-text');    gameMode = 'fight';

    const percent = (gameState.playerHp / CONFIG.player.maxHp) * 100;    fightRunning = true;

    hpFill.style.width = percent + '%';    controls.unlock();

    hpText.textContent = `${gameState.playerHp} / ${CONFIG.player.maxHp}`;    fightWrap.hidden = false;

}

    const ctx = fightCanvas.getContext('2d');

// ========================================    const W = fightCanvas.width, H = fightCanvas.height;

// BOUCLE PRINCIPALE    const box = { x:20, y:24, w:W-40, h:H-44 };

// ========================================    const player = { x:W/2, y:H/2, r:4, speed:120 };

let lastTime = performance.now();    let hp = 5;

let knifeObject = null;    let bossHP = 3; // Boss meurt après 3 attaques

    const maxBossHP = 3;

function init() {    let phase = 'dodge'; // 'dodge' ou 'attack'

    createCorridor();    let phaseTimer = 15; // 15 secondes d'esquive

    knifeObject = createKnife();    const bullets = [];

    updateHP();    const telegraphs = [];

    animate();    let iframes = 0;

}    let attackReady = false;



function animate() {    // Spawn simple horizontal bullets

    requestAnimationFrame(animate);    function spawnWave(){

          const dir = Math.random()<0.5 ? -1 : 1;

    const now = performance.now();      const y = box.y + 8 + Math.random()*(box.h-16);

    const delta = (now - lastTime) / 1000;      bullets.push({ x: dir<0? box.x+box.w+10 : box.x-10, y, vx: 80*dir, vy: 0, w: 10, h: 2 });

    lastTime = now;    }

    

    if (gameState.mode === 'exploration' && controls.isLocked) {      function spawnVerticalWall(){

        // Mouvement        // several thin rectangles moving downwards

        const direction = new THREE.Vector3();        const count = 5 + Math.floor(Math.random()*3);

        camera.getWorldDirection(direction);        for(let i=0;i<count;i++){

        direction.y = 0;          const x = box.x + 8 + Math.random()*(box.w-16);

        direction.normalize();          bullets.push({ x, y: box.y-8, vx:0, vy: 90, w: 4, h: 10 });

                }

        const right = new THREE.Vector3();      }

        right.crossVectors(camera.up, direction).normalize();      function spawnBoneSweep(dir){

                // horizontal sweep across the box

        const speed = CONFIG.player.speed * (keys.sprint ? CONFIG.player.sprintMultiplier : 1) * delta;        const rows = 3;

                for(let r=0;r<rows;r++){

        if (keys.forward) camera.position.addScaledVector(direction, -speed);          const y = box.y + 12 + r*(box.h-24)/(rows-1);

        if (keys.backward) camera.position.addScaledVector(direction, speed);          const vx = dir>0? 130 : -130;

        if (keys.left) camera.position.addScaledVector(right, speed);          bullets.push({ x: dir>0? box.x-12 : box.x+box.w+12, y, vx, vy:0, w: 12, h: 6 });

        if (keys.right) camera.position.addScaledVector(right, -speed);        }

              }

        // Contraintes du couloir      function spawnSine(dir){

        camera.position.x = Math.max(-CONFIG.corridor.width/2 + 0.5, Math.min(CONFIG.corridor.width/2 - 0.5, camera.position.x));        const baseY = box.y + box.h/2;

        camera.position.z = Math.max(-CONFIG.corridor.length + 1, Math.min(1, camera.position.z));        const vx = dir>0? 100 : -100;

                for(let k=0;k<5;k++){

        // Ramassage couteau          const phase = k*0.8;

        if (!gameState.hasKnife && knifeObject) {          bullets.push({ x: dir>0? box.x-10 : box.x+box.w+10, y: baseY, vx, vy:0, w: 6, h: 3, sine:{amp:16, freq:2.6, phase} });

            const dist = camera.position.distanceTo(knifeObject.knife.position);        }

                  }

            if (dist < 2) {      function telegraphBeam(x, duration=0.6){

                showPrompt("Appuyez sur E pour ramasser le couteau");        // warn then spawn a vertical beam

                        telegraphs.push({ x, ttl: duration });

                if (keys.interact) {        setTimeout(()=>{

                    gameState.hasKnife = true;          bullets.push({ x, y: box.y+box.h/2, vx:0, vy:0, w: 8, h: box.h+8, life:0.5, beam:true });

                    scene.remove(knifeObject.knife);        }, duration*1000);

                    scene.remove(knifeObject.light);      }

                    hidePrompt();

                    showMessage("Vous avez ramassé un couteau ensanglanté...", 3000);      // Projectiles en forme de pointeur (chevron ">")

                    keys.interact = false;      function spawnPointers(side){

                }        const count = 3 + Math.floor(Math.random()*3);

            } else {        for(let i=0;i<count;i++){

                hidePrompt();          const y = box.y + 12 + Math.random()*(box.h-24);

            }          const dir = side>0? 1 : -1;

        }          const size = 14;

                  // Ajouter w/h pour collisions approx rectangulaires; le rendu sera un triangle

        // Déclenchement combat          bullets.push({ pointer:true, x: dir>0? box.x-16 : box.x+box.w+16, y, vx: 120*dir, vy: 0, size, w: size, h: size*0.7 });

        if (gameState.hasKnife && camera.position.z < -CONFIG.corridor.length + 5 && !gameState.combatActive) {        }

            gameState.combatActive = true;      }

            gameState.mode = 'combat';

            combat.start();    let last = performance.now();

        }    let acc = 0;

    }    let spawnAcc = 0;

        let phaseAcc = 0;

    renderer.render(scene, camera);    let attackFlash = 0;

}

    const keys = new Set();

// Gestion fenêtre    // Barre d'attaque Undertale (curseur qui parcourt une jauge)

window.addEventListener('resize', () => {    let attackBar = { active:false, pos:0, speed:0.9, dir:1 };

    camera.aspect = window.innerWidth / window.innerHeight;    function kdn(e){ 

    camera.updateProjectionMatrix();      keys.add(e.code);

    renderer.setSize(window.innerWidth, window.innerHeight);      // Attaquer avec ESPACE pendant la phase d'attaque

});      if(e.code === 'Space' && phase === 'attack' && attackReady) {

        // Calculer dégâts selon proximité du centre de la jauge

// Démarrage        const q = attackBar.active ? (1 - Math.min(1, Math.abs(attackBar.pos - 0.5)/0.5)) : 0;

init();        const dmg = q > 0.85 ? 2 : (q > 0.25 ? 1 : 0);

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
