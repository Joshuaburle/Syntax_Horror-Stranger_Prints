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
    // 0 - mecontent.png
    "* Il fronce les sourcils. Quelque chose cloche...",
    // 1 - colere.png
    "* Sa colère monte. Son regard vous transperce.",
    // 2 - big_mouth.png
    "* Sa mâchoire s'entrouvre. Dents luisantes...",
    // 3 - screamer.png (aspiration + arcs)
    "* Il essaie de vous avaler. Les tirs dessinent des arcs...",
    // 4 - screamer_animated.mp4 (murs qui se referment)
    "* Les murs grincent et se referment. Aucun laser."
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
        const glitchChance = text.includes('̷') ? 0.3 : 0.1; // Plus de glitch pour texte corrompu
        if (glitch && Math.random() < glitchChance) {
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

// Retry button handler
const retryBtn = document.getElementById('retry');
if (retryBtn) {
    retryBtn.addEventListener('click', () => {
        resetGame();
    });
}

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
    // Phase 0 (mécontent): Pointeurs en C (->)
    if (Math.random() < 0.035) {
        const side = Math.random() < 0.5;
        gameState.bullets.push({
            x: side ? dodgeBox.x - 30 : dodgeBox.x + dodgeBox.width + 30,
            y: dodgeBox.y + Math.random() * dodgeBox.height,
            vx: (side ? 1 : -1) * 130,
            vy: 0,
            size: 20,
            shape: 'cpointer'
        });
    }
}

function spawnBulletsPhase1() {
    // Phase 1 (colère): Stylos qui tombent
    if (Math.random() < 0.03) {
        gameState.bullets.push({
            x: dodgeBox.x + 20 + Math.random() * (dodgeBox.width - 40),
            y: dodgeBox.y - 30,
            vx: (Math.random() - 0.5) * 30,
            vy: 140,
            size: 22,
            shape: 'pen',
            angle: Math.random() * Math.PI * 2
        });
    }
}

function spawnBulletsPhase2() {
    // Phase 2 (big mouth): calme avant la tempête (aucun projectile)
}

function spawnBulletsPhase3() {
    // Phase 3 (screamer.png): Aspiration + projectiles en arc (style Flowey) + gouttes
    patternTimer += 1/60;
    const mouthX = 320;
    const mouthY = 70;
    // Salves en arc: un éventail de projectiles qui suivent une trajectoire courbée
    if (Math.random() < 0.04) {
        const mid = Math.PI / 2; // vers le bas (dans l'arène)
        const span = Math.PI * (0.7 + Math.random() * 0.5); // 126° à 216°
        const count = 8 + Math.floor(Math.random() * 5); // 8 à 12 projectiles
        const baseSpeed = 120 + Math.random() * 40;
        const turnSign = Math.random() < 0.5 ? -1 : 1;
        const turnRate = turnSign * (0.8 + Math.random() * 1.2); // rad/s
        for (let i = 0; i < count; i++) {
            const a = mid - span/2 + (i/(count-1)) * span;
            const vx = Math.cos(a) * baseSpeed;
            const vy = Math.sin(a) * baseSpeed;
            gameState.bullets.push({
                x: mouthX,
                y: mouthY,
                vx, vy,
                size: 11 + Math.random() * 3,
                shape: 'circle', // rendu simple, mouvement courbé via turnRate
                turnRate
            });
        }
    }
    // Gouttes sanglantes lentes vers le bas
    if (Math.random() < 0.015) {
        gameState.bullets.push({
            x: mouthX + (Math.random() - 0.5) * 40,
            y: mouthY + 8,
            vx: (Math.random() - 0.5) * 40,
            vy: 80 + Math.random() * 40,
            size: 10 + Math.random() * 4,
            shape: 'blood',
            glitch: Math.random() > 0.5
        });
    }
}

function spawnBulletsPhase4() {
    // Phase 4 (screamer animé): Murs qui rétrécissent l'arène (sans lasers)
    patternTimer += 1/60;
    // Les "murs" avancent lentement des 4 côtés
    if (Math.random() < 0.012) {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // haut
            gameState.bullets.push({
                x: dodgeBox.x + dodgeBox.width/2, y: dodgeBox.y - 20,
                vx: 0, vy: 70, shape: 'wall', w: dodgeBox.width, h: 20
            });
        } else if (side === 1) { // bas
            gameState.bullets.push({
                x: dodgeBox.x + dodgeBox.width/2, y: dodgeBox.y + dodgeBox.height + 20,
                vx: 0, vy: -70, shape: 'wall', w: dodgeBox.width, h: 20
            });
        } else if (side === 2) { // gauche
            gameState.bullets.push({
                x: dodgeBox.x - 20, y: dodgeBox.y + dodgeBox.height/2,
                vx: 70, vy: 0, shape: 'wall', w: 20, h: dodgeBox.height
            });
        } else { // droite
            gameState.bullets.push({
                x: dodgeBox.x + dodgeBox.width + 20, y: dodgeBox.y + dodgeBox.height/2,
                vx: -70, vy: 0, shape: 'wall', w: 20, h: dodgeBox.height
            });
        }
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
    
        // Phase 3 (screamer.png): aspiration gore vers la bouche
        if (gameState.bossPhase === 3) {
        const mouthX = canvas.width / 2;
        const mouthY = 70;
        const dx = mouthX - gameState.player.x;
        const dy = mouthY - gameState.player.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
            const pull = 180 + Math.sin(Date.now() / 100) * 40; // force chaotique
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
        
            // Rotation des dents
            if (b.shape === 'teeth') {
                b.angle += dt * 3;
            }
        // Courbure pour les projectiles de type arc (Flowey)
        if (b.turnRate) {
            const ang = b.turnRate * dt;
            const cosA = Math.cos(ang), sinA = Math.sin(ang);
            const vx = b.vx, vy = b.vy;
            b.vx = vx * cosA - vy * sinA;
            b.vy = vx * sinA + vy * cosA;
        }
        
        if (b.x < -50 || b.x > 690 || b.y < -50 || b.y > 530) {
            gameState.bullets.splice(i, 1);
            continue;
        }
        
        // Collision par type
        let hit = false;
        if (b.shape === 'beam' || b.shape === 'wall') {
            const px = gameState.player.x, py = gameState.player.y;
            const left = b.x - b.w/2, right = b.x + b.w/2;
            const top = b.y - b.h/2, bottom = b.y + b.h/2;
            if (px >= left && px <= right && py >= top && py <= bottom) hit = true;
        } else if (b.shape !== 'warn') {
                // Collision circulaire pour circle, teeth, blood, cpointer, pen
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
    
    // Léger jitter visuel en phase 3 (aspiration)
    let didJitter = false;
    if (gameState.bossPhase === 3 && Math.random() > 0.9) {
        didJitter = true;
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }
    
    // Effet de glitch en phase 4
    if (gameState.bossPhase === 4 && Math.random() > 0.85) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }
    
    // Boss display - use video for phase 4 (screamer)
    if (gameState.bossPhase === 4 && bossVideo.readyState >= 2) {
        ctx.drawImage(bossVideo, 220, 20, 200, 100);
        // Effet de glitch chromatic aberration
        if (Math.random() > 0.7) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.15;
            ctx.drawImage(bossVideo, 218, 20, 200, 100);
            ctx.drawImage(bossVideo, 222, 20, 200, 100);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    } else if (bossImgElements[gameState.bossPhase].complete) {
        ctx.drawImage(bossImgElements[gameState.bossPhase], 220, 20, 200, 100);
    }
    
    if (gameState.bossPhase === 4 && Math.random() > 0.85) {
        ctx.restore();
    }
    if (didJitter) {
        ctx.restore();
    }
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.strokeRect(dodgeBox.x, dodgeBox.y, dodgeBox.width, dodgeBox.height);
    
        // Phase 3: effet de murs qui se rapprochent (overlay rouge)
        if (gameState.bossPhase === 3) {
            const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(150, 0, 0, ${0.1 + pulse * 0.05})`;
            // Ombres depuis les bords
            const grad = ctx.createLinearGradient(dodgeBox.x, 0, dodgeBox.x + 40, 0);
            grad.addColorStop(0, 'rgba(100,0,0,0.3)');
            grad.addColorStop(1, 'rgba(100,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(dodgeBox.x, dodgeBox.y, 40, dodgeBox.height);
        
            const grad2 = ctx.createLinearGradient(dodgeBox.x + dodgeBox.width, 0, dodgeBox.x + dodgeBox.width - 40, 0);
            grad2.addColorStop(0, 'rgba(100,0,0,0.3)');
            grad2.addColorStop(1, 'rgba(100,0,0,0)');
            ctx.fillStyle = grad2;
            ctx.fillRect(dodgeBox.x + dodgeBox.width - 40, dodgeBox.y, 40, dodgeBox.height);
        }
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    const s = gameState.player.size / 2;
    ctx.moveTo(gameState.player.x, gameState.player.y - s * 0.6);
    ctx.lineTo(gameState.player.x - s, gameState.player.y + s * 0.2);
    ctx.lineTo(gameState.player.x, gameState.player.y + s);
    ctx.lineTo(gameState.player.x + s, gameState.player.y + s * 0.2);
    ctx.closePath();
    ctx.fill();
    
        // Effet visuel d'aspiration phase 3 (gore, chaotique)
        if (gameState.bossPhase === 3) {
        const mouthX = canvas.width / 2;
        const mouthY = 70;
            for (let k = 0; k < 18; k++) {
            const angle = (k / 12) * Math.PI * 2;
                const len = 40 + (k % 3) * 10 + Math.sin(Date.now() / 50 + k) * 15;
                ctx.strokeStyle = Math.random() > 0.3 ? 'rgba(255,50,50,0.12)' : 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 2 + Math.random() * 2;
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
                case 'teeth':
                    // Dents (triangles dentelés)
                    ctx.save();
                    ctx.translate(b.x, b.y);
                    ctx.rotate(b.angle);
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const a = (i / 6) * Math.PI * 2;
                        const r = i % 2 === 0 ? b.size/2 : b.size/4;
                        const px = Math.cos(a) * r;
                        const py = Math.sin(a) * r;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                    break;
                case 'blood':
                    // Projectiles sanglants (rouge, glitchy)
                    ctx.save();
                    if (b.glitch && Math.random() > 0.5) {
                        ctx.translate(b.x + (Math.random() - 0.5) * 6, b.y + (Math.random() - 0.5) * 6);
                    } else {
                        ctx.translate(b.x, b.y);
                    }
                    ctx.fillStyle = `rgba(${200 + Math.random() * 55}, ${Math.random() * 30}, ${Math.random() * 30}, ${0.7 + Math.random() * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, b.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    // Trainée
                    if (Math.random() > 0.6) {
                        ctx.fillStyle = 'rgba(180,20,20,0.3)';
                        ctx.fillRect(-b.size/2, -2, -8, 4);
                    }
                    ctx.restore();
                    break;
            case 'cpointer':
                // Pointeur C: ->
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.vx > 0 ? 0 : Math.PI);
                ctx.beginPath();
                // Trait horizontal
                ctx.moveTo(-b.size/2, 0);
                ctx.lineTo(b.size/3, 0);
                // Pointe de flèche
                ctx.moveTo(b.size/3 - 8, -6);
                ctx.lineTo(b.size/3, 0);
                ctx.lineTo(b.size/3 - 8, 6);
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
                break;
            case 'pen':
                // Stylo (rectangle allongé avec rotation)
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle);
                ctx.fillStyle = '#4488ff';
                ctx.fillRect(-3, -b.size/2, 6, b.size);
                ctx.fillStyle = '#222';
                ctx.fillRect(-3, -b.size/2, 6, 6);
                ctx.restore();
                break;
            case 'wall':
                // Mur (rectangle blanc semi-opaque)
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
                break;
            case 'beam':
                ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
                break;
            case 'warn':
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
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
        setMessage("* GAME OVER — appuyez sur Réessayer", {speed: 25, glitch: true});
        const btn = document.getElementById('retry');
        if (btn) btn.classList.remove('hidden');
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

function resetGame() {
    // Clear entities
    gameState.bullets = [];
    // Remove floating rmrf tags
    document.querySelectorAll('#ui .rmrf').forEach(n => n.remove());
    
    // Reset core state
    gameState.phase = 'dodge';
    gameState.playerHP = 5;
    gameState.bossHP = 5;
    gameState.bossPhase = 0;
    gameState.player.x = 320;
    gameState.player.y = 350;
    dodgeTime = 0;
    patternTimer = 0;
    attackPhaseActive = false;
    attackProcessed = false;
    const atk = document.getElementById('attack-phase');
    if (atk) atk.classList.add('hidden');
    
    // UI refresh
    updatePlayerHP();
    updateBossHP();
    setMessage(messages[0]);
    const btn = document.getElementById('retry');
    if (btn) btn.classList.add('hidden');
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
