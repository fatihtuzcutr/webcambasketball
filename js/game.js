// game.js — Game state, physics, collisions

const W = 960, H = 540;

// Settings
let gravity = 0.18;
let currentTheme = 'dark'; // 'dark', 'neon', 'light'
let currentFacing = 'user'; // 'user' = ön, 'environment' = arka
let mirrorCam = true; // ön kamera mirror, arka kamera normal

// Players
const P1 = { id: 0, score: 0, combo: 0, color: '#3b82f6', light: 'rgba(59,130,246,0.35)', el: null };
const P2 = { id: 1, score: 0, combo: 0, color: '#ef4444', light: 'rgba(239,68,68,0.35)', el: null };

// Hoops
const hoops = [
    { x: 80, rimY: 175, w: 75, owner: P1, ns: 0, origW: 75 },
    { x: W - 80, rimY: 175, w: 75, owner: P2, ns: 0, origW: 75 }
];

// Ball
let ball = { x: W / 2, y: H / 2, r: 30, vx: 0, vy: 0, rotation: 0, spin: 0 };
let scoreCooldown = 0;

// Particles & effects
let particles = [];
let confetti = [];
let floatingTexts = [];
let shakeAmount = 0;

// Net pass-through effect
let netBulges = []; // {hoopIdx, progress, startTime, ballVy}

// Pose data
let poses = [];
let prevKps = [[], []];
let playerBounds = [null, null]; // {cx, cy, w, h} for aura

// Stats
let stats = {
    p1: { baskets: 0, attempts: 0, bestStreak: 0 },
    p2: { baskets: 0, attempts: 0, bestStreak: 0 }
};

// Game state
let gameOn = false;
let gameMode = 'normal'; // 'normal', 'training', 'ai'
let timeLeft = 300;
let countdownValue = 0; // 3,2,1,GO
let last10s = false;

// AI Bot
let aiEnabled = false;
let aiDifficulty = 'normal'; // 'easy', 'normal', 'hard'
const AI_CONFIG = {
    easy: { speed: 2.5, react: 0.6, accuracy: 0.5, pushForce: 5 },
    normal: { speed: 4, react: 0.75, accuracy: 0.7, pushForce: 7 },
    hard: { speed: 6, react: 0.9, accuracy: 0.9, pushForce: 9 }
};
let aiHand = { x: W - 120, y: H * 0.4 }; // virtual hand position
let aiTarget = { x: W - 120, y: H * 0.4 };

// Power-ups
let powerups = [];
let activePowerups = []; // {type, player, endTime}
let nextPowerupTime = 0;

const POWERUP_TYPES = [
    { type: 'double', label: '2X', color: '#ffd700', desc: '2x Skor', duration: 10000 },
    { type: 'bigball', label: '🏀', color: '#ff6b35', desc: 'Dev Top', duration: 10000 },
    { type: 'slowmo', label: '🕐', color: '#8b5cf6', desc: 'Yavaş', duration: 5000 },
    { type: 'shrink', label: '🔽', color: '#ef4444', desc: 'Küçük Pota', duration: 10000 }
];

// Body part collision radii
const KPR = {
    nose: 42, left_eye: 18, right_eye: 18, left_ear: 20, right_ear: 20,
    left_shoulder: 38, right_shoulder: 38, left_elbow: 42, right_elbow: 42,
    left_wrist: 58, right_wrist: 58, left_hip: 34, right_hip: 34,
    left_knee: 30, right_knee: 30, left_ankle: 24, right_ankle: 24
};
const MAGNET_RANGE = 65;

// High scores
let highScores = JSON.parse(localStorage.getItem('bbHighScores') || '[]');

function saveHighScore(p1, p2) {
    highScores.push({ p1, p2, date: Date.now() });
    highScores.sort((a, b) => Math.max(b.p1, b.p2) - Math.max(a.p1, a.p2));
    highScores = highScores.slice(0, 10);
    localStorage.setItem('bbHighScores', JSON.stringify(highScores));
}

// ---- UTILS ----
function dist(ax, ay, bx, by) {
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function spawnP(x, y, col, n) {
    for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 10;
        const type = Math.random();
        if (type < 0.4) {
            // Spark — small, fast, bright
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed * 1.5,
                vy: Math.sin(angle) * speed * 1.5 - 2,
                r: Math.random() * 2.5 + 1,
                life: 1,
                color: col,
                type: 'spark',
                trail: []
            });
        } else if (type < 0.7) {
            // Ember — medium, glowing, floaty
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed * 0.7,
                vy: Math.sin(angle) * speed * 0.7 - 1,
                r: Math.random() * 4 + 2,
                life: 1,
                color: col,
                type: 'ember',
                trail: []
            });
        } else {
            // Dust — slow, fading
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 5 - 1,
                r: Math.random() * 6 + 3,
                life: 1,
                color: col,
                type: 'dust',
                trail: []
            });
        }
    }
}

function spawnRimSparks(x, y, col) {
    for (let i = 0; i < 8; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
        const speed = 4 + Math.random() * 8;
        particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: Math.random() * 2 + 0.8,
            life: 1,
            color: col,
            type: 'spark',
            trail: []
        });
    }
    // Impact flash
    particles.push({
        x, y, vx: 0, vy: 0,
        r: 15, life: 0.6,
        color: '#fff',
        type: 'flash',
        trail: []
    });
}

function spawnConfetti(x, y, count) {
    for (let i = 0; i < count; i++) {
        confetti.push({
            x, y,
            vx: (Math.random() - 0.5) * 16,
            vy: -Math.random() * 12 - 2,
            r: Math.random() * 4 + 2,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 15,
            life: 1,
            color: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#3b82f6', '#ffd700'][Math.floor(Math.random() * 7)]
        });
    }
}

function addFloatingText(x, y, text, color, size) {
    floatingTexts.push({ x, y, text, color, size: size || 28, life: 1, vy: -2 });
}

function triggerShake(amount) {
    shakeAmount = amount || 8;
}

function resetBall() {
    ball.x = W / 2;
    ball.y = H * 0.35;
    ball.vx = (Math.random() - 0.5) * 3;
    ball.vy = 0;
    ball.spin = 0;
    ball.r = 30;
    scoreCooldown = 0;
}

// ---- POWER-UPS ----
function spawnPowerup() {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({
        x: W * 0.2 + Math.random() * W * 0.6,
        y: H * 0.2 + Math.random() * H * 0.4,
        type: type.type,
        label: type.label,
        color: type.color,
        r: 22,
        life: 8000,
        spawnTime: Date.now(),
        bobPhase: Math.random() * Math.PI * 2
    });
}

function collectPowerup(pu, player) {
    const def = POWERUP_TYPES.find(t => t.type === pu.type);
    if (!def) return;
    activePowerups.push({
        type: pu.type,
        player: player,
        endTime: Date.now() + def.duration,
        desc: def.desc
    });
    addFloatingText(pu.x, pu.y, def.desc, def.color, 24);
    sndPowerup();

    // Apply immediate effects
    if (pu.type === 'bigball') {
        ball.r = 45;
    }
    if (pu.type === 'shrink') {
        const other = player === P1 ? P2 : P1;
        const hoop = hoops.find(h => h.owner === other);
        if (hoop) hoop.w = hoop.origW * 0.5;
    }
}

// ---- SORTED POSES (cached per frame) ----
let cachedSortedPoses = [];
let lastPoseSortFrame = -1;
let frameTick = 0;

function getSortedPoses() {
    if (lastPoseSortFrame === frameTick) return cachedSortedPoses;
    lastPoseSortFrame = frameTick;
    if (!poses || !poses.length) { cachedSortedPoses = []; return cachedSortedPoses; }
    cachedSortedPoses = poses.slice(0, 2).map(p => {
        const kps = p.keypoints.filter(k => k.score > 0.05);
        const ax = kps.reduce((s, k) => s + (mirrorCam ? W - k.x : k.x), 0) / (kps.length || 1);
        return { pose: p, ax };
    }).sort((a, b) => a.ax - b.ax);
    return cachedSortedPoses;
}

// ---- BODY COLLISIONS ----
function bodyCollisions() {
    if (!poses || !poses.length) return;

    const sorted = getSortedPoses();

    sorted.forEach((ent, pi) => {
        const player = pi === 0 ? P1 : P2;
        const kps = ent.pose.keypoints;
        const prev = prevKps[pi] || [];

        kps.forEach(kp => {
            if (kp.score < 0.05) return;
            const mx = mirrorCam ? W - kp.x : kp.x, my = kp.y;
            const bodyR = KPR[kp.name] || 30;
            const cr = bodyR + ball.r;
            const d = dist(mx, my, ball.x, ball.y);

            const pk = prev.find(p => p.name === kp.name);
            let kvx = 0, kvy = 0;
            if (pk) { kvx = (mirrorCam ? W - kp.x : kp.x) - (mirrorCam ? W - pk.x : pk.x); kvy = kp.y - pk.y; }

            if (d < cr && d > 0) {
                const nx = (ball.x - mx) / d, ny = (ball.y - my) / d;
                ball.x = mx + nx * (cr + 2);
                ball.y = my + ny * (cr + 2);
                ball.vx = nx * 8 + kvx * 2.2;
                ball.vy = ny * 8 + kvy * 2.2;
                // Spin from lateral hit
                ball.spin += (kvx * ny - kvy * nx) * 0.15;
                spawnP(mx, my, player.color, 4);
                sndBounce();
            } else if (d < cr + MAGNET_RANGE && d > 0) {
                const strength = 1 - (d - cr) / MAGNET_RANGE;
                const nx = (ball.x - mx) / d, ny = (ball.y - my) / d;
                const speed = Math.sqrt(kvx * kvx + kvy * kvy);
                if (speed > 1.5) {
                    ball.vx += kvx * strength * 0.8;
                    ball.vy += kvy * strength * 0.8;
                } else {
                    ball.vx += nx * strength * 1.5;
                    ball.vy += ny * strength * 1.5;
                }
            }
        });

        prevKps[pi] = kps.map(k => ({ name: k.name, x: k.x, y: k.y, score: k.score }));
    });
}

// ---- AI BOT ----
function updateAI() {
    if (!aiEnabled || !gameOn) return;
    const cfg = AI_CONFIG[aiDifficulty] || AI_CONFIG.normal;

    // AI plays as P2 (right side)
    const targetHoop = hoops[1]; // P2's hoop is on the right
    const hoopX = targetHoop.x;
    const hoopY = targetHoop.rimY;

    // Decide target: go to ball if ball is on AI's side, else patrol near hoop
    const ballOnAISide = ball.x > W * 0.35;
    const shouldChase = ballOnAISide && Math.random() < cfg.react;

    if (shouldChase) {
        // Predict where ball will be
        const predX = ball.x + ball.vx * 8;
        const predY = ball.y + ball.vy * 5;
        // Add some inaccuracy
        const err = (1 - cfg.accuracy) * 60;
        aiTarget.x = predX + (Math.random() - 0.5) * err;
        aiTarget.y = predY - 20 + (Math.random() - 0.5) * err;
    } else {
        // Patrol near hoop area
        aiTarget.x = hoopX + Math.sin(Date.now() * 0.001) * 60;
        aiTarget.y = hoopY + 80 + Math.sin(Date.now() * 0.0015) * 40;
    }

    // Clamp target
    aiTarget.x = Math.max(W * 0.3, Math.min(W - 30, aiTarget.x));
    aiTarget.y = Math.max(40, Math.min(H - 40, aiTarget.y));

    // Move hand toward target
    const dx = aiTarget.x - aiHand.x;
    const dy = aiTarget.y - aiHand.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 2) {
        aiHand.x += (dx / d) * Math.min(cfg.speed, d);
        aiHand.y += (dy / d) * Math.min(cfg.speed, d);
    }

    // AI hand collision with ball
    const handR = 40;
    const cr = handR + ball.r;
    const bd = dist(aiHand.x, aiHand.y, ball.x, ball.y);

    if (bd < cr && bd > 0) {
        const nx = (ball.x - aiHand.x) / bd;
        const ny = (ball.y - aiHand.y) / bd;
        ball.x = aiHand.x + nx * (cr + 2);
        ball.y = aiHand.y + ny * (cr + 2);

        // Push toward P1's hoop (left side)
        const aimX = hoops[0].x + (Math.random() - 0.5) * 30;
        const aimY = hoops[0].rimY - 10;
        const toHoopX = aimX - ball.x;
        const toHoopY = aimY - ball.y;
        const toHoopD = Math.sqrt(toHoopX * toHoopX + toHoopY * toHoopY);

        if (toHoopD > 0) {
            ball.vx = (toHoopX / toHoopD) * cfg.pushForce + (Math.random() - 0.5) * 2;
            ball.vy = (toHoopY / toHoopD) * cfg.pushForce - 2;
        } else {
            ball.vx = nx * cfg.pushForce;
            ball.vy = ny * cfg.pushForce - 2;
        }

        ball.spin += (Math.random() - 0.5) * 3;
        spawnP(aiHand.x, aiHand.y, P2.color, 4);
        sndBounce();
    } else if (bd < cr + 30 && bd > 0 && shouldChase) {
        // Magnetic zone for AI too
        const strength = 1 - (bd - cr) / 30;
        const nx = (ball.x - aiHand.x) / bd;
        const ny = (ball.y - aiHand.y) / bd;
        ball.vx += nx * strength * 0.5;
        ball.vy += ny * strength * 0.5;
    }

    // Update AI player bounds for aura
    playerBounds[1] = {
        cx: aiHand.x, cy: aiHand.y,
        w: 80, h: 120
    };
}

// ---- MAIN UPDATE ----
function update(showMsg) {
    if (!gameOn || countdownValue > 0) return;
    frameTick++;

    bodyCollisions();
    updateAI();

    // Update player bounds for aura
    updatePlayerBounds();

    // Ball physics
    ball.vy += gravity;
    ball.vx *= 0.995;
    ball.vx += ball.spin * 0.02; // spin affects horizontal
    ball.spin *= 0.98; // spin decay
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ball rotation from velocity + spin
    ball.rotation += (ball.vx * 0.05 + ball.spin * 0.1);

    // Walls
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.7; sndBounce(); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.7; sndBounce(); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) * 0.6; }

    // Floor — realistic bounce
    if (ball.y + ball.r > H - 8) {
        ball.y = H - 8 - ball.r;
        if (Math.abs(ball.vy) > 2) sndBounce();
        ball.vy = -Math.abs(ball.vy) * 0.65;
        ball.vx *= 0.88;
        ball.spin += ball.vx * 0.05; // floor friction adds spin
        if (Math.abs(ball.vy) < 1) ball.vy = 0;
    }

    if (scoreCooldown > 0) { scoreCooldown--; }

    // Hoops
    if (scoreCooldown <= 0) {
        for (const h of hoops) {
            const rl = h.x - h.w / 2, rr = h.x + h.w / 2;

            // Hoop magnet — ball near rim gets gentle pull toward center
            const hoopCenterD = dist(ball.x, ball.y, h.x, h.rimY);
            if (hoopCenterD < 120 && hoopCenterD > 10 && ball.y < h.rimY + 5) {
                const magnetStr = (1 - hoopCenterD / 120) * 0.18;
                const mx = (h.x - ball.x) / hoopCenterD;
                const my = (h.rimY - ball.y) / hoopCenterD;
                ball.vx += mx * magnetStr;
                ball.vy += my * magnetStr * 0.5;
            }

            // Rim collision — softer, more forgiving
            if (ball.y > h.rimY - 16 && ball.y < h.rimY + 16) {
                const dL = dist(ball.x, ball.y, rl, h.rimY);
                const dR = dist(ball.x, ball.y, rr, h.rimY);
                if (dL < ball.r + 6) {
                    const pushDir = ball.x < rl ? -1 : 1;
                    // Softer bounce — redirect inward more
                    const inwardBias = ball.x < h.x ? 1.5 : -0.5;
                    ball.vx = ball.vx * 0.3 + pushDir * 2 + inwardBias;
                    ball.vy *= 0.55;
                    spawnRimSparks(rl, h.rimY, h.owner.color);
                    sndClank();
                    triggerShake(3);
                }
                if (dR < ball.r + 6) {
                    const pushDir = ball.x < rr ? -1 : 1;
                    const inwardBias = ball.x > h.x ? -1.5 : 0.5;
                    ball.vx = ball.vx * 0.3 + pushDir * 2 + inwardBias;
                    ball.vy *= 0.55;
                    spawnRimSparks(rr, h.rimY, h.owner.color);
                    sndClank();
                    triggerShake(3);
                }
            }

            // Score — rakibin potasına atınca puan alırsın (wider zone)
            if (ball.vy > 0.8 && ball.y > h.rimY - 2 && ball.y < h.rimY + 28 && ball.x > rl + 5 && ball.x < rr - 5) {
                const scorer = h.owner === P1 ? P2 : P1;
                const st = scorer === P1 ? stats.p1 : stats.p2;
                scorer.combo++;
                st.baskets++;
                if (scorer.combo > st.bestStreak) st.bestStreak = scorer.combo;
                let pts = scorer.combo >= 3 ? 3 : scorer.combo >= 2 ? 2 : 1;

                // Score multipliers
                if (last10s) pts *= 2;

                scorer.score += pts;
                scorer.el.textContent = scorer.score;

                // Effects
                spawnP(h.x, h.rimY, scorer.color, 25);
                spawnConfetti(h.x, h.rimY, 40);
                triggerShake(10);
                addFloatingText(h.x, h.rimY - 20, '+' + pts, scorer.color, 36);
                h.ns = 1;
                sndSwoosh();

                // Net pass-through bulge effect
                netBulges.push({
                    hoopIdx: hoops.indexOf(h),
                    progress: 0,
                    speed: Math.max(0.03, Math.min(0.07, ball.vy * 0.008)),
                    ballX: ball.x,
                    ballR: ball.r * 0.8
                });

                const other = scorer === P1 ? P2 : P1;
                other.combo = 0;

                if (scorer.combo >= 3) {
                    showMsg('P' + (scorer.id + 1) + ' 🔥 ' + scorer.combo + 'x COMBO!', 800);
                    sndCombo();
                }

                scoreCooldown = 55;
                setTimeout(resetBall, 900);
            }
        }
    }

    // Update effects
    particles = particles.filter(p => {
        // Store trail for sparks
        if (p.type === 'spark' && p.trail) {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.shift();
        }

        p.x += p.vx; p.y += p.vy;

        if (p.type === 'spark') {
            p.vy += 0.15;
            p.vx *= 0.97;
            p.life -= 0.04;
        } else if (p.type === 'ember') {
            p.vy += 0.05;
            p.vx *= 0.96;
            p.life -= 0.018;
            // Slight float
            p.vx += (Math.random() - 0.5) * 0.3;
        } else if (p.type === 'dust') {
            p.vy += 0.03;
            p.vx *= 0.94;
            p.life -= 0.015;
            p.r *= 1.008; // expand
        } else if (p.type === 'flash') {
            p.life -= 0.08;
            p.r *= 1.15; // expand quickly
        } else {
            p.vy += 0.12;
            p.life -= 0.03;
        }
        return p.life > 0;
    });
    confetti = confetti.filter(c => {
        c.x += c.vx; c.y += c.vy; c.vy += 0.08;
        c.vx *= 0.98; c.rotation += c.rotSpeed;
        c.life -= 0.015;
        return c.life > 0;
    });
    floatingTexts = floatingTexts.filter(ft => {
        ft.y += ft.vy; ft.life -= 0.02;
        return ft.life > 0;
    });
    hoops.forEach(h => h.ns *= 0.93);

    // Update net bulges
    netBulges = netBulges.filter(nb => {
        nb.progress += nb.speed;
        return nb.progress < 1.3;
    });

    // Screen shake decay
    if (shakeAmount > 0) shakeAmount *= 0.85;
    if (shakeAmount < 0.5) shakeAmount = 0;
}

// ---- PLAYER BOUNDS FOR AURA ----
function updatePlayerBounds() {
    const sorted = getSortedPoses();
    if (!sorted.length) return;

    sorted.forEach((ent, pi) => {
        const kps = ent.pose.keypoints.filter(k => k.score > 0.1);
        if (kps.length < 3) { playerBounds[pi] = null; return; }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        kps.forEach(k => {
            const mx = mirrorCam ? W - k.x : k.x;
            if (mx < minX) minX = mx;
            if (mx > maxX) maxX = mx;
            if (k.y < minY) minY = k.y;
            if (k.y > maxY) maxY = k.y;
        });
        playerBounds[pi] = {
            cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
            w: maxX - minX + 40, h: maxY - minY + 40
        };
    });
}

// ---- RESET GAME ----
function resetGame() {
    P1.score = 0; P1.combo = 0;
    P2.score = 0; P2.combo = 0;
    last10s = false;
    powerups = [];
    activePowerups = [];
    confetti = [];
    floatingTexts = [];
    particles = [];
    netBulges = [];
    shakeAmount = 0;
    hoops.forEach(h => { h.w = h.origW; h.ns = 0; });
    ball.r = 30;
    ball.spin = 0;
    prevKps = [[], []];
    playerBounds = [null, null];
    aiHand = { x: W - 120, y: H * 0.4 };
    aiTarget = { x: W - 120, y: H * 0.4 };
    stats = {
        p1: { baskets: 0, attempts: 0, bestStreak: 0 },
        p2: { baskets: 0, attempts: 0, bestStreak: 0 }
    };
    nextPowerupTime = Date.now() + 5000;
    resetBall();
}
