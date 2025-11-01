import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

const CONFIG = {
    corridor: { width: 6, height: 3.5, length: 60 },
    player: { speed: 6, sprintMultiplier: 1.8, hp: 20, maxHp: 20 },
    combat: { dodgeTime: 20, playerSpeed: 180, bulletSpeed: 120 }
};

let gameState = { mode: 'exploration', hasKnife: false, playerHp: 20, combatActive: false };

const viewport = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.035);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 0);

const controls = new PointerLockControls(camera, renderer.domElement);
const keys = { forward: false, backward: false, left: false, right: false, sprint: false, interact: false };

document.addEventListener('click', () => { if (gameState.mode === 'exploration') controls.lock(); });
document.addEventListener('keydown', (e) => {
    if (gameState.mode !== 'exploration') return;
    switch(e.code) {
        case 'KeyW': case 'KeyZ': case 'ArrowUp': keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': keys.backward = true; break;
        case 'KeyA': case 'KeyQ': case 'ArrowLeft': keys.left = true; break;
        case 'KeyD': case 'ArrowRight': keys.right = true; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
        case 'KeyE': keys.interact = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': case 'KeyZ': case 'ArrowUp': keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': keys.backward = false; break;
        case 'KeyA': case 'KeyQ': case 'ArrowLeft': keys.left = false; break;
        case 'KeyD': case 'ArrowRight': keys.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
    }
});

function createPS2Texture(baseColor, graininess = 50) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < graininess; i++) {
        const brightness = Math.random() * 60 - 30;
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${Math.random() * 0.4})`;
        ctx.fillRect(Math.random() * 64, Math.random() * 64, Math.random() * 8 + 2, Math.random() * 8 + 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function createCorridor() {
    const corridor = new THREE.Group();
    const floorTex = createPS2Texture('#1a1410', 80);
    floorTex.repeat.set(8, 8);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0 });
    const wallTex = createPS2Texture('#2a1a15', 100);
    wallTex.repeat.set(6, 3);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0 });
    const ceilingTex = createPS2Texture('#0a0505', 60);
    ceilingTex.repeat.set(6, 8);
    const ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 1, metalness: 0 });
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.length, 8, 8), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -CONFIG.corridor.length / 2;
    floor.receiveShadow = true;
    corridor.add(floor);
    
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.length, 8, 8), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CONFIG.corridor.height, -CONFIG.corridor.length / 2);
    corridor.add(ceiling);
    
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.length, CONFIG.corridor.height, 8, 4), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-CONFIG.corridor.width/2, CONFIG.corridor.height/2, -CONFIG.corridor.length/2);
    leftWall.receiveShadow = true;
    corridor.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.length, CONFIG.corridor.height, 8, 4), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(CONFIG.corridor.width/2, CONFIG.corridor.height/2, -CONFIG.corridor.length/2);
    rightWall.receiveShadow = true;
    corridor.add(rightWall);
    
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.height), wallMat);
    backWall.position.set(0, CONFIG.corridor.height/2, 2);
    backWall.rotation.y = Math.PI;
    corridor.add(backWall);
    
    const endWallTex = createPS2Texture('#1a0a0a', 40);
    const endWall = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.height), new THREE.MeshStandardMaterial({ map: endWallTex, roughness: 0.8 }));
    endWall.position.set(0, CONFIG.corridor.height/2, -CONFIG.corridor.length);
    corridor.add(endWall);
    
    scene.add(corridor);
}

function addLights() {
    scene.add(new THREE.AmbientLight(0x332211, 0.15));
    const lightCount = 12;
    const lights = [];
    for (let i = 0; i < lightCount; i++) {
        const z = -i * (CONFIG.corridor.length / lightCount) - 3;
        const light = new THREE.PointLight(0xff6622, 1.8, 10, 1.8);
        light.position.set(0, CONFIG.corridor.height - 0.4, z);
        light.castShadow = true;
        light.shadow.mapSize.width = 256;
        light.shadow.mapSize.height = 256;
        scene.add(light);
        lights.push(light);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xff8833 }));
        bulb.position.copy(light.position);
        scene.add(bulb);
    }
    setInterval(() => {
        lights.forEach(light => {
            if (Math.random() < 0.08) light.intensity = Math.random() < 0.5 ? 0 : Math.random() * 2.5;
            else light.intensity = 1.8;
        });
    }, 120);
}

function createKnife() {
    const knife = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.02), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 }));
    blade.position.y = 0.175;
    knife.add(blade);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.03), new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.9 }));
    handle.position.y = -0.075;
    knife.add(handle);
    knife.position.set(0, 1.3, -CONFIG.corridor.length + 8);
    knife.rotation.set(0.2, 0, 0.3);
    const light = new THREE.PointLight(0xffcc00, 2, 6);
    light.position.copy(knife.position);
    scene.add(light);
    scene.add(knife);
    let time = 0;
    const anim = () => {
        if (!gameState.hasKnife) {
            time += 0.02;
            knife.rotation.y = time;
            knife.position.y = 1.3 + Math.sin(time * 2) * 0.15;
            light.intensity = 2 + Math.sin(time * 3) * 0.8;
            requestAnimationFrame(anim);
        }
    };
    anim();
    return { knife, light };
}

class UndertaleComba {
    constructor() {
        this.canvas = document.getElementById('combat-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.screen = document.getElementById('combat-screen');
        this.message = document.getElementById('combat-message');
        this.box = { x: 100, y: 120, width: 440, height: 280 };
        this.player = { x: this.box.x + this.box.width / 2, y: this.box.y + this.box.height / 2, size: 12, speed: CONFIG.combat.playerSpeed };
        this.bullets = [];
        this.time = 0;
        this.dodgeTime = CONFIG.combat.dodgeTime;
        this.active = false;
        this.keys = { up: false, down: false, left: false, right: false };
        this.setupControls();
    }
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.active) return;
            switch(e.code) {
                case 'ArrowUp': case 'KeyW': case 'KeyZ': this.keys.up = true; break;
                case 'ArrowDown': case 'KeyS': this.keys.down = true; break;
                case 'ArrowLeft': case 'KeyA': case 'KeyQ': this.keys.left = true; break;
                case 'ArrowRight': case 'KeyD': this.keys.right = true; break;
            }
        });
        document.addEventListener('keyup', (e) => {
            if (!this.active) return;
            switch(e.code) {
                case 'ArrowUp': case 'KeyW': case 'KeyZ': this.keys.up = false; break;
                case 'ArrowDown': case 'KeyS': this.keys.down = false; break;
                case 'ArrowLeft': case 'KeyA': case 'KeyQ': this.keys.left = false; break;
                case 'ArrowRight': case 'KeyD': this.keys.right = false; break;
            }
        });
    }
    start() {
        this.active = true;
        this.screen.hidden = false;
        this.message.textContent = "* Une présence vous attaque...";
        controls.unlock();
        gameState.mode = 'combat';
        this.loop();
    }
    spawnBullets() {
        if (Math.floor(this.time * 10) % 20 === 0 && this.time % 2 < 0.1) {
            const side = Math.random() < 0.5;
            const y = this.box.y + 50 + Math.random() * 180;
            this.bullets.push({ x: side ? this.box.x - 20 : this.box.x + this.box.width + 20, y: y, vx: (side ? 1 : -1) * CONFIG.combat.bulletSpeed, vy: 0, size: 14, color: '#ffffff' });
        }
        if (Math.random() < 0.015) {
            for (let i = 0; i < 4; i++) {
                this.bullets.push({ x: this.box.x + 60 + i * 100, y: this.box.y - 25, vx: 0, vy: CONFIG.combat.bulletSpeed * 0.9, size: 12, color: '#ffffff' });
            }
        }
        if (this.time > 10 && Math.random() < 0.008) {
            const startX = Math.random() < 0.5 ? this.box.x - 30 : this.box.x + this.box.width + 30;
            const startY = this.box.y - 30;
            const dirX = startX < this.box.x ? 1 : -1;
            this.bullets.push({ x: startX, y: startY, vx: dirX * CONFIG.combat.bulletSpeed * 0.7, vy: CONFIG.combat.bulletSpeed * 0.7, size: 16, color: '#ff4444' });
        }
    }
    update(dt) {
        this.time += dt;
        this.dodgeTime -= dt;
        if (this.dodgeTime <= 0) { this.win(); return; }
        if (this.keys.up) this.player.y -= this.player.speed * dt;
        if (this.keys.down) this.player.y += this.player.speed * dt;
        if (this.keys.left) this.player.x -= this.player.speed * dt;
        if (this.keys.right) this.player.x += this.player.speed * dt;
        const margin = this.player.size;
        this.player.x = Math.max(this.box.x + margin, Math.min(this.box.x + this.box.width - margin, this.player.x));
        this.player.y = Math.max(this.box.y + margin, Math.min(this.box.y + this.box.height - margin, this.player.y));
        this.spawnBullets();
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < -50 || b.x > 700 || b.y < -50 || b.y > 550) { this.bullets.splice(i, 1); continue; }
            const dx = b.x - this.player.x;
            const dy = b.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.player.size / 2 + b.size / 2) { this.hit(); this.bullets.splice(i, 1); }
        }
    }
    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.strokeRect(this.box.x, this.box.y, this.box.width, this.box.height);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        const s = this.player.size / 2;
        ctx.moveTo(this.player.x, this.player.y - s * 0.6);
        ctx.lineTo(this.player.x - s, this.player.y + s * 0.2);
        ctx.lineTo(this.player.x, this.player.y + s);
        ctx.lineTo(this.player.x + s, this.player.y + s * 0.2);
        ctx.closePath();
        ctx.fill();
        this.bullets.forEach(b => { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "Courier New"';
        ctx.fillText(`${Math.ceil(this.dodgeTime)}s`, 30, 50);
    }
    hit() {
        gameState.playerHp -= 5;
        updateHP();
        if (gameState.playerHp <= 0) this.gameOver();
    }
    win() {
        this.active = false;
        this.message.textContent = "* Vous avez survécu...";
        setTimeout(() => { this.screen.hidden = true; showMessage("La présence s'estompe...", 4000); gameState.mode = 'exploration'; }, 2500);
    }
    gameOver() {
        this.active = false;
        this.message.textContent = "* GAME OVER *";
        setTimeout(() => location.reload(), 3000);
    }
    loop() {
        if (!this.active) return;
        const now = performance.now();
        const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
        this.lastTime = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

const combat = new UndertaleComba();

function showPrompt(text) { document.getElementById('prompt').textContent = text; document.getElementById('prompt').hidden = false; }
function hidePrompt() { document.getElementById('prompt').hidden = true; }
function showMessage(text, duration = 2000) { const msg = document.getElementById('message'); msg.textContent = text; msg.hidden = false; setTimeout(() => msg.hidden = true, duration); }
function updateHP() { document.getElementById('hp-fill').style.width = (gameState.playerHp/CONFIG.player.maxHp*100)+'%'; document.getElementById('hp-text').textContent = `${gameState.playerHp} / ${CONFIG.player.maxHp}`; }

let lastTime = performance.now();
let knifeObject = null;

function init() {
    createCorridor();
    addLights();
    knifeObject = createKnife();
    updateHP();
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    if (gameState.mode === 'exploration' && controls.isLocked) {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(camera.up, direction).normalize();
        const speed = CONFIG.player.speed * (keys.sprint ? CONFIG.player.sprintMultiplier : 1) * delta;
        if (keys.forward) camera.position.addScaledVector(direction, -speed);
        if (keys.backward) camera.position.addScaledVector(direction, speed);
        if (keys.left) camera.position.addScaledVector(right, speed);
        if (keys.right) camera.position.addScaledVector(right, -speed);
        camera.position.x = Math.max(-CONFIG.corridor.width/2 + 0.5, Math.min(CONFIG.corridor.width/2 - 0.5, camera.position.x));
        camera.position.z = Math.max(-CONFIG.corridor.length + 2, Math.min(2, camera.position.z));
        if (!gameState.hasKnife && knifeObject) {
            const dist = camera.position.distanceTo(knifeObject.knife.position);
            if (dist < 2.5) {
                showPrompt("Appuyez sur E pour ramasser le couteau");
                if (keys.interact) {
                    gameState.hasKnife = true;
                    scene.remove(knifeObject.knife);
                    scene.remove(knifeObject.light);
                    hidePrompt();
                    showMessage("Couteau récupéré...", 2500);
                    keys.interact = false;
                }
            } else hidePrompt();
        }
        if (gameState.hasKnife && camera.position.z < -CONFIG.corridor.length + 6 && !gameState.combatActive) {
            gameState.combatActive = true;
            combat.start();
        }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
