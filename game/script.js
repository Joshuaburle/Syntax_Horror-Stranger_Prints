import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

// Configuration
const CONFIG = {
    corridor: { width: 4, height: 3, length: 50 },
    player: { speed: 5, sprintMultiplier: 1.5, hp: 20, maxHp: 20 },
    combat: { dodgeTime: 15, playerSpeed: 200, bulletSpeed: 150 }
};

let gameState = {
    mode: 'exploration',
    hasKnife: false,
    playerHp: CONFIG.player.hp,
    combatActive: false
};

// Initialisation
const viewport = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0505);
scene.fog = new THREE.FogExp2(0x0a0505, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);

// Contrôles
const controls = new PointerLockControls(camera, renderer.domElement);
const keys = { forward: false, backward: false, left: false, right: false, sprint: false, interact: false };

document.addEventListener('click', () => { if (gameState.mode === 'exploration') controls.lock(); });
document.addEventListener('keydown', (e) => {
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

// Couloir
function createCorridor() {
    const corridor = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(${Math.random()*30}, ${Math.random()*20}, ${Math.random()*10}, ${Math.random()*0.5})`;
        ctx.fillRect(Math.random()*256, Math.random()*256, Math.random()*20, Math.random()*20);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.1 });
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.length), material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -CONFIG.corridor.length / 2;
    floor.receiveShadow = true;
    corridor.add(floor);
    
    const ceiling = floor.clone();
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CONFIG.corridor.height;
    corridor.add(ceiling);
    
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.length, CONFIG.corridor.height), material);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-CONFIG.corridor.width/2, CONFIG.corridor.height/2, -CONFIG.corridor.length/2);
    corridor.add(leftWall);
    
    const rightWall = leftWall.clone();
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = CONFIG.corridor.width/2;
    corridor.add(rightWall);
    
    const endWall = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.corridor.width, CONFIG.corridor.height), material);
    endWall.position.set(0, CONFIG.corridor.height/2, -CONFIG.corridor.length);
    corridor.add(endWall);
    
    scene.add(corridor);
    addLights();
}

function addLights() {
    scene.add(new THREE.AmbientLight(0x4a3a3a, 0.1));
    const lightCount = 8;
    const lights = [];
    for (let i = 0; i < lightCount; i++) {
        const light = new THREE.PointLight(0xff8844, 1.5, 12, 2);
        light.position.set(0, CONFIG.corridor.height-0.3, -i*(CONFIG.corridor.length/lightCount)-2);
        light.castShadow = true;
        scene.add(light);
        lights.push(light);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), new THREE.MeshBasicMaterial({color:0xff6633}));
        bulb.position.copy(light.position);
        scene.add(bulb);
    }
    setInterval(() => {
        lights.forEach(light => {
            if (Math.random()<0.05) light.intensity = Math.random()*2;
            else light.intensity += (1.5-light.intensity)*0.1;
        });
    }, 100);
}

// Couteau
function createKnife() {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.3,0.02), new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:0.9,roughness:0.1}));
    blade.position.y = 0.15;
    g.add(blade);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.12,0.025), new THREE.MeshStandardMaterial({color:0x2a1a0a,roughness:0.8}));
    handle.position.y = -0.06;
    g.add(handle);
    g.position.set(0, 1.2, -CONFIG.corridor.length*0.7);
    g.rotation.z = Math.PI/4;
    const light = new THREE.PointLight(0xffaa00, 2, 5);
    light.position.copy(g.position);
    scene.add(light);
    scene.add(g);
    const anim = () => {
        if (!gameState.hasKnife) {
            g.rotation.y += 0.02;
            g.position.y = 1.2 + Math.sin(Date.now()*0.003)*0.1;
            requestAnimationFrame(anim);
        }
    };
    anim();
    return { knife: g, light };
}

// Combat
class CombatSystem {
    constructor() {
        this.canvas = document.getElementById('combat-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.screen = document.getElementById('combat-screen');
        this.message = document.getElementById('combat-message');
        this.box = { x:80, y:80, width:480, height:320 };
        this.player = { x:this.box.x+this.box.width/2, y:this.box.y+this.box.height/2, size:8, speed:CONFIG.combat.playerSpeed };
        this.bullets = [];
        this.time = 0;
        this.dodgeTime = CONFIG.combat.dodgeTime;
        this.active = false;
        this.keys = { up:false, down:false, left:false, right:false };
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
        this.message.textContent = "* Une entité vous attaque ! Esquivez !";
        controls.unlock();
        this.loop();
    }
    spawnBullets() {
        if (this.time % 2 < 0.1) {
            const side = Math.random() < 0.5;
            const y = this.box.y + Math.random()*this.box.height;
            this.bullets.push({ x:side?this.box.x-20:this.box.x+this.box.width+20, y, vx:side?CONFIG.combat.bulletSpeed:-CONFIG.combat.bulletSpeed, vy:0, size:12 });
        }
        if (Math.random() < 0.02) {
            for (let i = 0; i < 3; i++) {
                this.bullets.push({ x:this.box.x+Math.random()*this.box.width, y:this.box.y-20, vx:0, vy:CONFIG.combat.bulletSpeed*0.8, size:10 });
            }
        }
    }
    update(dt) {
        this.time += dt;
        this.dodgeTime -= dt;
        if (this.dodgeTime <= 0) { this.win(); return; }
        if (this.keys.up) this.player.y -= this.player.speed*dt;
        if (this.keys.down) this.player.y += this.player.speed*dt;
        if (this.keys.left) this.player.x -= this.player.speed*dt;
        if (this.keys.right) this.player.x += this.player.speed*dt;
        this.player.x = Math.max(this.box.x+this.player.size, Math.min(this.box.x+this.box.width-this.player.size, this.player.x));
        this.player.y = Math.max(this.box.y+this.player.size, Math.min(this.box.y+this.box.height-this.player.size, this.player.y));
        this.spawnBullets();
        for (let i = this.bullets.length-1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx*dt;
            b.y += b.vy*dt;
            if (b.x<-50||b.x>this.canvas.width+50||b.y<-50||b.y>this.canvas.height+50) { this.bullets.splice(i,1); continue; }
            const dx = b.x-this.player.x, dy = b.y-this.player.y, dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < this.player.size+b.size/2) { this.hit(); this.bullets.splice(i,1); }
        }
    }
    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.box.x,this.box.y,this.box.width,this.box.height);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y-this.player.size/2);
        ctx.lineTo(this.player.x-this.player.size/2, this.player.y);
        ctx.lineTo(this.player.x, this.player.y+this.player.size);
        ctx.lineTo(this.player.x+this.player.size/2, this.player.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        this.bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x,b.y,b.size/2,0,Math.PI*2); ctx.fill(); });
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillText(`Temps: ${Math.ceil(this.dodgeTime)}s`, 20, 40);
    }
    hit() {
        gameState.playerHp -= 5;
        updateHP();
        if (gameState.playerHp <= 0) this.gameOver();
    }
    win() {
        this.active = false;
        this.message.textContent = "* Vous avez survécu...";
        setTimeout(() => { this.screen.hidden = true; showMessage("Vous avez vaincu l'entité...", 3000); }, 2000);
    }
    gameOver() {
        this.active = false;
        this.message.textContent = "* GAME OVER *";
        setTimeout(() => location.reload(), 3000);
    }
    loop() {
        if (!this.active) return;
        const now = performance.now();
        const dt = Math.min((now-(this.lastTime||now))/1000, 0.05);
        this.lastTime = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

const combat = new CombatSystem();

// UI
function showPrompt(text) { document.getElementById('prompt').textContent = text; document.getElementById('prompt').hidden = false; }
function hidePrompt() { document.getElementById('prompt').hidden = true; }
function showMessage(text, duration=2000) { const msg = document.getElementById('message'); msg.textContent = text; msg.hidden = false; setTimeout(() => msg.hidden = true, duration); }
function updateHP() { document.getElementById('hp-fill').style.width = (gameState.playerHp/CONFIG.player.maxHp*100)+'%'; document.getElementById('hp-text').textContent = `${gameState.playerHp} / ${CONFIG.player.maxHp}`; }

// Boucle principale
let lastTime = performance.now();
let knifeObject = null;

function init() {
    createCorridor();
    knifeObject = createKnife();
    updateHP();
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now-lastTime)/1000;
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
        camera.position.x = Math.max(-CONFIG.corridor.width/2+0.5, Math.min(CONFIG.corridor.width/2-0.5, camera.position.x));
        camera.position.z = Math.max(-CONFIG.corridor.length+1, Math.min(1, camera.position.z));
        if (!gameState.hasKnife && knifeObject) {
            const dist = camera.position.distanceTo(knifeObject.knife.position);
            if (dist < 2) {
                showPrompt("Appuyez sur E pour ramasser le couteau");
                if (keys.interact) {
                    gameState.hasKnife = true;
                    scene.remove(knifeObject.knife);
                    scene.remove(knifeObject.light);
                    hidePrompt();
                    showMessage("Vous avez ramassé un couteau ensanglanté...", 3000);
                    keys.interact = false;
                }
            } else hidePrompt();
        }
        if (gameState.hasKnife && camera.position.z < -CONFIG.corridor.length+5 && !gameState.combatActive) {
            gameState.combatActive = true;
            gameState.mode = 'combat';
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
