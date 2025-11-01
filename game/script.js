const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const gameState = {
    phase: 'dodge',
    playerHP: 5,
    bossHP: 5,
    bossPhase: 0,
    bullets: [],
    player: { x: 320, y: 350, size: 12 }
};

const bossImages = ['mecontent.png', 'colere.png', 'big_mouth.png', 'screamer.png'];
const bossImgElements = [];
const bossVideo = document.createElement('video');
bossVideo.src = '../images/screamer_animated.mp4';
bossVideo.loop = true;
bossVideo.muted = true;
bossVideo.autoplay = true;
bossVideo.play();

const messages = [
    "* ...chut... il écoute.",
    "* Ses yeux ne clignent plus.",
    "* Les murs se rapprochent...",
    "* Sa bouche s'ouvre et aspire la lumière.",
    "* IL FAUT FUIR."
];

// Effet dactylographie + léger glitch
function setMessage(text, {speed=22, glitch=true} = {}) {
    const el = document.getElementById('message');
    let i = 0;
    let shown = '';
    const chars = text.split('');
    clearInterval(el._typeInt);
    el.textContent = '';
    el._typeInt = setInterval(() => {
        if (i >= chars.length) {
            clearInterval(el._typeInt);
            el.textContent = shown;
            return;
        }
        shown += chars[i++];
        if (glitch && Math.random() < 0.1) {
            // très léger flicker
            el.style.opacity = '0.7';
            setTimeout(()=>{ el.style.opacity = '1'; }, 40);
        }
        el.textContent = shown;
    }, speed);
}

bossImages.forEach((src, i) => {
    const img = new Image();
    img.src = `../images/${src}`;
    bossImgElements[i] = img;
});

const keys = { up: false, down: false, left: false, right: false, space: false };

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowUp': case 'KeyW': case 'KeyZ': keys.up = true; break;
        case 'ArrowDown': case 'KeyS': keys.down = true; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': keys.left = true; break;
        case 'ArrowRight': case 'KeyD': keys.right = true; break;
        case 'Space': keys.space = true; e.preventDefault(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowUp': case 'KeyW': case 'KeyZ': keys.up = false; break;
        case 'ArrowDown': case 'KeyS': keys.down = false; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': keys.left = false; break;
        case 'ArrowRight': case 'KeyD': keys.right = false; break;
        case 'Space': keys.space = false; break;
    }
});

const dodgeBox = { x: 160, y: 170, width: 320, height: 200 };
let dodgeTime = 0;
let phaseDuration = 8;
let patternTimer = 0;

// Patterns spécifiques par phase
function spawnBulletsPhase0() {
    // Phase 0: Vagues horizontales simples
    if (Math.random() < 0.025) {
        const side = Math.random() < 0.5;
        gameState.bullets.push({
            x: side ? dodgeBox.x - 20 : dodgeBox.x + dodgeBox.width + 20,
            y: dodgeBox.y + Math.random() * dodgeBox.height,
            vx: (side ? 1 : -1) * 100,
            vy: 0,
            size: 14,
            shape: 'circle'
        });
    }
}

function spawnBulletsPhase1() {
    // Phase 1: Pluie verticale en colonnes
    if (Math.random() < 0.02) {
        const col = Math.floor(Math.random() * 4);
        gameState.bullets.push({
            x: dodgeBox.x + 50 + col * 100,
            y: dodgeBox.y - 25,
            vx: 0,
            vy: 120,
            size: 13,
            shape: 'square'
        });
    }
}

function spawnBulletsPhase2() {
    // Phase 2: Croix qui convergent + chevrons/pointers
    if (Math.random() < 0.015) {
        const centerX = dodgeBox.x + dodgeBox.width / 2;
        const centerY = dodgeBox.y + dodgeBox.height / 2;
        const directions = [
            {vx: 80, vy: 0},   // droite
            {vx: -80, vy: 0},  // gauche
            {vx: 0, vy: 80},   // bas
            {vx: 0, vy: -80}   // haut
        ];
        const side = Math.floor(Math.random() * 4);
        const dir = directions[side];
        let startX = centerX, startY = centerY;
        if (dir.vx > 0) startX = dodgeBox.x - 30;
        if (dir.vx < 0) startX = dodgeBox.x + dodgeBox.width + 30;
        if (dir.vy > 0) startY = dodgeBox.y - 30;
        if (dir.vy < 0) startY = dodgeBox.y + dodgeBox.height + 30;
        
        gameState.bullets.push({
            x: startX,
            y: startY,
            vx: dir.vx,
            vy: dir.vy,
            size: 15,
            shape: 'cross'
        });
    }
    // Chevrons rapides (pointeurs)
    if (Math.random() < 0.02) {
        const side = Math.random() < 0.5;
        gameState.bullets.push({
            x: side ? dodgeBox.x - 30 : dodgeBox.x + dodgeBox.width + 30,
            y: dodgeBox.y + Math.random() * dodgeBox.height,
            vx: (side ? 1 : -1) * 140,
            vy: 0,
            size: 18,
            shape: 'chevron'
        });
    }
}

function spawnBulletsPhase3() {
    // Phase 3: Spirales diagonales
    if (Math.random() < 0.012) {
        const corners = [
            {x: dodgeBox.x - 30, y: dodgeBox.y - 30, vx: 90, vy: 90},
            {x: dodgeBox.x + dodgeBox.width + 30, y: dodgeBox.y - 30, vx: -90, vy: 90},
            {x: dodgeBox.x - 30, y: dodgeBox.y + dodgeBox.height + 30, vx: 90, vy: -90},
            {x: dodgeBox.x + dodgeBox.width + 30, y: dodgeBox.y + dodgeBox.height + 30, vx: -90, vy: -90}
        ];
        const corner = corners[Math.floor(Math.random() * 4)];
        gameState.bullets.push({
            x: corner.x,
            y: corner.y,
            vx: corner.vx,
            vy: corner.vy,
            size: 16,
            shape: 'diamond'
        });
    }
}

function spawnBulletsPhase4() {
    // Phase 4: Style Sans - murs/beam + densité
    patternTimer += 1/60;
    
    // Murs horizontaux/verticaux avec trou (beam)
    if (Math.random() < 0.02) {
        const horizontal = Math.random() < 0.5;
        const gapSize = 80;
        const gapPos = horizontal
            ? dodgeBox.x + 40 + Math.random() * (dodgeBox.width - 80)
            : dodgeBox.y + 40 + Math.random() * (dodgeBox.height - 80);

        if (horizontal) {
            // Mur horizontal qui monte
            // Partie gauche du mur
            gameState.bullets.push({ x: dodgeBox.x + (gapPos - dodgeBox.x)/2, y: dodgeBox.y + dodgeBox.height + 20,
                vx: 0, vy: -160, shape: 'warn', w: (gapPos - dodgeBox.x), h: 18, delay: 0.5 });
            // Partie droite du mur
            const rightWidth = (dodgeBox.x + dodgeBox.width) - (gapPos + gapSize);
            gameState.bullets.push({ x: gapPos + gapSize + rightWidth/2, y: dodgeBox.y + dodgeBox.height + 20,
                vx: 0, vy: -160, shape: 'warn', w: rightWidth, h: 18, delay: 0.5 });
        } else {
            // Mur vertical qui va vers la gauche
            // Partie haute
            gameState.bullets.push({ x: dodgeBox.x + dodgeBox.width + 20, y: dodgeBox.y + (gapPos - dodgeBox.y)/2,
                vx: -160, vy: 0, shape: 'warn', w: 18, h: (gapPos - dodgeBox.y), delay: 0.5 });
            // Partie basse
            const bottomHeight = (dodgeBox.y + dodgeBox.height) - (gapPos + gapSize);
            gameState.bullets.push({ x: dodgeBox.x + dodgeBox.width + 20, y: gapPos + gapSize + bottomHeight/2,
                vx: -160, vy: 0, shape: 'warn', w: 18, h: bottomHeight, delay: 0.5 });
        }
    }
    
    // Quelques projectiles rapides pour la pression
    if (Math.random() < 0.03) {
        const side = Math.random() < 0.5;
        gameState.bullets.push({
            x: side ? dodgeBox.x - 20 : dodgeBox.x + dodgeBox.width + 20,
            y: dodgeBox.y + Math.random() * dodgeBox.height,
            vx: (side ? 1 : -1) * 200,
            vy: 0,
            size: 10,
            shape: 'circle'
        });
    }
}

function spawnBullets() {
    switch(gameState.bossPhase) {
        case 0: spawnBulletsPhase0(); break;
        case 1: spawnBulletsPhase1(); break;
        case 2: spawnBulletsPhase2(); break;
        case 3: spawnBulletsPhase3(); break;
        case 4: spawnBulletsPhase4(); break;
    }
}

function updateDodge(dt) {
    dodgeTime += dt;
    
    if (dodgeTime >= phaseDuration) {
        switchToAttack();
        return;
    }
    
    const speed = 200;
    if (keys.up) gameState.player.y -= speed * dt;
    if (keys.down) gameState.player.y += speed * dt;
    if (keys.left) gameState.player.x -= speed * dt;
    if (keys.right) gameState.player.x += speed * dt;
    
    // Phase 3: aspiration vers la bouche (point en haut-centre)
    if (gameState.bossPhase === 3) {
        const mouthX = canvas.width / 2;
        const mouthY = 70;
        const dx = mouthX - gameState.player.x;
        const dy = mouthY - gameState.player.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const pull = 140; // force d'aspiration
        gameState.player.x += (dx / dist) * pull * dt;
        gameState.player.y += (dy / dist) * pull * dt;
    }
    
    gameState.player.x = Math.max(dodgeBox.x + 10, Math.min(dodgeBox.x + dodgeBox.width - 10, gameState.player.x));
    gameState.player.y = Math.max(dodgeBox.y + 10, Math.min(dodgeBox.y + dodgeBox.height - 10, gameState.player.y));
    
    spawnBullets();
    
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const b = gameState.bullets[i];
        // Gestion des warnings qui deviennent beams
        if (b.shape === 'warn') {
            b.delay -= dt;
            if (b.delay <= 0) {
                b.shape = 'beam';
            }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        
        if (b.x < -50 || b.x > 690 || b.y < -50 || b.y > 530) {
            gameState.bullets.splice(i, 1);
            continue;
        }
        
        // Collision par type
        let hit = false;
        if (b.shape === 'beam') {
            const px = gameState.player.x, py = gameState.player.y;
            const left = b.x - b.w/2, right = b.x + b.w/2;
            const top = b.y - b.h/2, bottom = b.y + b.h/2;
            if (px >= left && px <= right && py >= top && py <= bottom) hit = true;
        } else if (b.shape !== 'warn') {
            const dx = b.x - gameState.player.x;
            const dy = b.y - gameState.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < gameState.player.size / 2 + (b.size || 12) / 2) hit = true;
        }
        if (hit) {
            playerHit();
            gameState.bullets.splice(i, 1);
        }
    }
}

function drawDodge() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Boss display - use video for phase 4 (screamer)
    if (gameState.bossPhase === 4 && bossVideo.readyState >= 2) {
        ctx.drawImage(bossVideo, 220, 20, 200, 100);
    } else if (bossImgElements[gameState.bossPhase].complete) {
        ctx.drawImage(bossImgElements[gameState.bossPhase], 220, 20, 200, 100);
    }
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.strokeRect(dodgeBox.x, dodgeBox.y, dodgeBox.width, dodgeBox.height);
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    const s = gameState.player.size / 2;
    ctx.moveTo(gameState.player.x, gameState.player.y - s * 0.6);
    ctx.lineTo(gameState.player.x - s, gameState.player.y + s * 0.2);
    ctx.lineTo(gameState.player.x, gameState.player.y + s);
    ctx.lineTo(gameState.player.x + s, gameState.player.y + s * 0.2);
    ctx.closePath();
    ctx.fill();
    
    // Effet visuel d'aspiration phase 3
    if (gameState.bossPhase === 3) {
        const mouthX = canvas.width / 2;
        const mouthY = 70;
        for (let k = 0; k < 12; k++) {
            const angle = (k / 12) * Math.PI * 2;
            const len = 40 + (k % 3) * 10;
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.moveTo(mouthX, mouthY);
            ctx.lineTo(mouthX + Math.cos(angle) * len, mouthY + Math.sin(angle) * len);
            ctx.stroke();
        }
    }

    // Balles avec formes différentes
    gameState.bullets.forEach(b => {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        switch(b.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(b.x - b.size/2, b.y - b.size/2, b.size, b.size);
                break;
            case 'cross':
                ctx.beginPath();
                const cs = b.size / 2;
                ctx.moveTo(b.x, b.y - cs);
                ctx.lineTo(b.x, b.y + cs);
                ctx.moveTo(b.x - cs, b.y);
                ctx.lineTo(b.x + cs, b.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(b.x, b.y, cs/2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'diamond':
                ctx.beginPath();
                const ds = b.size / 2;
                ctx.moveTo(b.x, b.y - ds);
                ctx.lineTo(b.x + ds, b.y);
                ctx.lineTo(b.x, b.y + ds);
                ctx.lineTo(b.x - ds, b.y);
                ctx.closePath();
                ctx.fill();
                break;
            case 'star':
                ctx.beginPath();
                const ss = b.size / 2;
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                    const radius = i % 2 === 0 ? ss : ss / 2;
                    const px = b.x + Math.cos(angle) * radius;
                    const py = b.y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 'beam':
                ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
                break;
            case 'warn':
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
                break;
            case 'chevron':
                // Dessiner un chevron > ou < selon vx
                ctx.beginPath();
                const c = b.size;
                if (b.vx > 0) { // >
                    ctx.moveTo(b.x - c/2, b.y - c/2);
                    ctx.lineTo(b.x + c/2, b.y);
                    ctx.lineTo(b.x - c/2, b.y + c/2);
                } else { // <
                    ctx.moveTo(b.x + c/2, b.y - c/2);
                    ctx.lineTo(b.x - c/2, b.y);
                    ctx.lineTo(b.x + c/2, b.y + c/2);
                }
                ctx.closePath();
                ctx.fill();
                break;
        }
    });
    
    // Compteur retiré
}

let attackCursorPos = 0;
let attackCursorSpeed = 300;
let attackTargetPos = 0;
let attackTargetWidth = 60;
let attackPhaseActive = false;
let attackProcessed = false;

function switchToAttack() {
    gameState.phase = 'attack';
    gameState.bullets = [];
    dodgeTime = 0;
    attackPhaseActive = true;
    
    document.getElementById('attack-phase').classList.remove('hidden');
    
    const barWidth = document.querySelector('.attack-bar').offsetWidth;
    const margin = 40;
    attackTargetPos = Math.floor(margin + Math.random() * (barWidth - attackTargetWidth - margin * 2));
    document.getElementById('target').style.left = attackTargetPos + 'px';
    document.getElementById('target').style.width = attackTargetWidth + 'px';
    
    attackCursorPos = Math.floor(barWidth / 2); // spawn au centre
    document.getElementById('cursor').style.left = attackCursorPos + 'px';
    setMessage("* Test d'habileté: frappe au bon moment.");
}

function updateAttack(dt) {
    if (!attackPhaseActive) return;
    
    attackCursorPos += attackCursorSpeed * dt;
    const barWidth = document.querySelector('.attack-bar').offsetWidth;
    
    if (attackCursorPos >= barWidth) {
        attackCursorPos = 0;
    }
    
    document.getElementById('cursor').style.left = attackCursorPos + 'px';
    
    // Une seule tentative par tour
    if (keys.space && !attackProcessed) {
        attackProcessed = true;
        
        const hitZoneStart = attackTargetPos;
        const hitZoneEnd = attackTargetPos + attackTargetWidth;
        
        if (attackCursorPos >= hitZoneStart && attackCursorPos <= hitZoneEnd) {
            bossHit();
            setMessage("* Touché !");
        } else {
            setMessage("* Raté... Aucun dégât infligé.");
        }
        
        // Retour à la phase esquive après 1.5s
        setTimeout(() => {
            attackPhaseActive = false;
            document.getElementById('attack-phase').classList.add('hidden');
            attackCursorPos = 0;
            attackProcessed = false;
            gameState.phase = 'dodge';
            patternTimer = 0;
            if (gameState.phase !== 'win' && gameState.phase !== 'gameover') {
                setMessage(messages[gameState.bossPhase]);
            }
        }, 1500);
    }
}

function bossHit() {
    gameState.bossHP--;
    updateBossHP();
    
    if (gameState.bossHP > 0) {
        gameState.bossPhase++;
        document.getElementById('canvas').classList.add('shake');
        setTimeout(() => document.getElementById('canvas').classList.remove('shake'), 300);
    } else {
        gameState.phase = 'win';
        setMessage("* Vous avez vaincu Jean-Michel !", {speed: 10, glitch: false});
    }
}

function playerHit() {
    gameState.playerHP--;
    updatePlayerHP();
    spawnRmRf();
    
    if (gameState.playerHP <= 0) {
        gameState.phase = 'gameover';
        setMessage("* GAME OVER", {speed: 30, glitch: true});
    }
}

function spawnRmRf() {
    const ui = document.getElementById('ui');
    const tag = document.createElement('div');
    tag.className = 'rmrf';
    tag.textContent = 'rm -rf';
    ui.appendChild(tag);
    setTimeout(() => tag.remove(), 1200);
}

function updatePlayerHP() {
    for (let i = 1; i <= 5; i++) {
        const heart = document.getElementById('heart' + i);
        if (i <= gameState.playerHP) {
            heart.classList.add('filled');
            heart.classList.remove('empty');
        } else {
            heart.classList.remove('filled');
            heart.classList.add('empty');
        }
    }
}

function updateBossHP() {
    const percent = (gameState.bossHP / 5) * 100;
    document.getElementById('boss-hp').style.width = percent + '%';
}

let lastTime = performance.now();

function gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    
    if (gameState.phase === 'dodge') {
        updateDodge(dt);
        drawDodge();
    } else if (gameState.phase === 'attack') {
        updateAttack(dt);
        drawDodge();
    } else if (gameState.phase === 'win' || gameState.phase === 'gameover') {
        drawDodge();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.phase === 'win' ? 'VICTOIRE !' : 'GAME OVER', canvas.width/2, canvas.height/2);
        ctx.textAlign = 'left';
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
// Message initial
setMessage(messages[0]);
