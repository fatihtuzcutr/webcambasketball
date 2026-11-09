// render.js — All drawing functions

// Theme configs
const THEMES = {
    dark: { bg: '#0f0f23', courtLine: 'rgba(255,255,255,0.25)', rimGlow: 0.4, overlay: null },
    neon: { bg: '#0a0a1a', courtLine: 'rgba(0,255,200,0.35)', rimGlow: 0.8, overlay: 'rgba(0,255,200,0.03)' },
    light: { bg: '#e8e0d0', courtLine: 'rgba(80,60,40,0.3)', rimGlow: 0.3, overlay: 'rgba(255,255,255,0.05)' }
};

// Ball skins
const BALL_SKINS = {
    basketball: { base1: '#f8923a', base2: '#e8701a', base3: '#d45a10', base4: '#8b3508', seam: 'rgba(0,0,0,0.55)' },
    tennis: { base1: '#c8e542', base2: '#b5d130', base3: '#9ab820', base4: '#6a8510', seam: 'rgba(255,255,255,0.5)' },
    football: { base1: '#ffffff', base2: '#e0e0e0', base3: '#c0c0c0', base4: '#808080', seam: 'rgba(0,0,0,0.7)' }
};

let currentSkin = 'basketball';

// Pre-render basketball texture
let ballTexture = null;
let lastSkin = null;

function buildBallTexture() {
    const skin = BALL_SKINS[currentSkin] || BALL_SKINS.basketball;
    const size = 128;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2 - 2;

    // Base gradient (3D sphere)
    const bg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    bg.addColorStop(0, skin.base1);
    bg.addColorStop(0.35, skin.base2);
    bg.addColorStop(0.7, skin.base3);
    bg.addColorStop(1, skin.base4);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = bg; c.fill();

    // Pebble texture
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    for (let i = 0; i < 300; i++) {
        const px = Math.random() * size, py = Math.random() * size;
        if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) > r) continue;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
        c.fillRect(px, py, 1.5, 1.5);
    }
    c.restore();

    // Seam lines
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.strokeStyle = skin.seam; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy); c.stroke();
    c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.stroke();
    c.beginPath();
    c.moveTo(cx - r * 0.15, cy - r);
    c.bezierCurveTo(cx - r * 0.75, cy - r * 0.35, cx - r * 0.75, cy + r * 0.35, cx - r * 0.15, cy + r);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + r * 0.15, cy - r);
    c.bezierCurveTo(cx + r * 0.75, cy - r * 0.35, cx + r * 0.75, cy + r * 0.35, cx + r * 0.15, cy + r);
    c.stroke();
    c.restore();

    // Specular highlight
    const hl = c.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.55);
    hl.addColorStop(0, 'rgba(255,255,255,0.35)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = hl; c.fill();

    // Edge darkening
    const ed = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    ed.addColorStop(0, 'rgba(0,0,0,0)');
    ed.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = ed; c.fill();

    ballTexture = cv;
    lastSkin = currentSkin;
}

// ---- DRAW FUNCTIONS ----

function drawCourtLines(ctx) {
    if (courtCanvas) ctx.drawImage(courtCanvas, 0, 0);
}

function drawWebcam(ctx, vid) {
    ctx.save();
    if (mirrorCam) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
    }
    ctx.drawImage(vid, 0, 0, W, H);
    ctx.restore();
}

function drawThemeOverlay(ctx) {
    const theme = THEMES[currentTheme];
    if (theme && theme.overlay) {
        ctx.fillStyle = theme.overlay;
        ctx.fillRect(0, 0, W, H);
    }
    // Neon glow edges
    if (currentTheme === 'neon') {
        const g1 = ctx.createLinearGradient(0, 0, 30, 0);
        g1.addColorStop(0, 'rgba(0,255,200,0.08)');
        g1.addColorStop(1, 'rgba(0,255,200,0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, 30, H);
        const g2 = ctx.createLinearGradient(W, 0, W - 30, 0);
        g2.addColorStop(0, 'rgba(0,255,200,0.08)');
        g2.addColorStop(1, 'rgba(0,255,200,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(W - 30, 0, 30, H);
    }
}

const PLAYER_AURA_MID = {
    '#3b82f6': 'rgba(59,130,246,0.12)',
    '#ef4444': 'rgba(239,68,68,0.12)'
};

function drawPlayerAuras(ctx) {
    playerBounds.forEach((b, i) => {
        if (!b) return;
        const pl = i === 0 ? P1 : P2;
        const radius = Math.max(b.w, b.h) * 0.6;
        const grd = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, radius);
        grd.addColorStop(0, pl.light);
        grd.addColorStop(0.5, PLAYER_AURA_MID[pl.color] || 'rgba(128,128,128,0.12)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(b.cx - b.w, b.cy - b.h, b.w * 2, b.h * 2);
    });
}

function drawHoop(ctx, h) {
    const theme = THEMES[currentTheme];
    const isNeon = currentTheme === 'neon';
    const isLight = currentTheme === 'light';
    const t = Date.now() * 0.004;
    const rimL = h.x - h.w / 2, rimR = h.x + h.w / 2;

    // ---- SUPPORT POLE / MOUNTING ----
    const isLeft = h.x < W / 2;
    const poleX = isLeft ? h.x - 55 : h.x + 55;
    // Vertical pole
    ctx.strokeStyle = isNeon ? 'rgba(0,255,200,0.25)' : 'rgba(180,180,190,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(poleX, h.rimY - 75);
    ctx.lineTo(poleX, H - 8);
    ctx.stroke();
    // Pole metallic highlight
    ctx.strokeStyle = isNeon ? 'rgba(0,255,200,0.08)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(poleX - 1, h.rimY - 75);
    ctx.lineTo(poleX - 1, H - 8);
    ctx.stroke();

    // ---- BACKBOARD ----
    const bw = 96, bh = 62;
    const bx = h.x - bw / 2, by = h.rimY - bh - 4;

    // Backboard shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(bx + 3, by + 3, bw, bh);

    // Glass backboard fill
    const glassGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    if (isNeon) {
        glassGrad.addColorStop(0, 'rgba(0,255,200,0.07)');
        glassGrad.addColorStop(0.5, 'rgba(0,255,200,0.03)');
        glassGrad.addColorStop(1, 'rgba(0,255,200,0.06)');
    } else if (isLight) {
        glassGrad.addColorStop(0, 'rgba(200,220,240,0.25)');
        glassGrad.addColorStop(0.5, 'rgba(220,235,250,0.15)');
        glassGrad.addColorStop(1, 'rgba(200,220,240,0.2)');
    } else {
        glassGrad.addColorStop(0, 'rgba(180,210,240,0.12)');
        glassGrad.addColorStop(0.5, 'rgba(200,225,255,0.06)');
        glassGrad.addColorStop(1, 'rgba(180,210,240,0.1)');
    }
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();

    // Backboard border (metallic frame)
    ctx.strokeStyle = isNeon ? 'rgba(0,255,200,0.4)' : 'rgba(200,200,210,0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.stroke();

    // Inner square (shooter's square)
    const sqW = 40, sqH = 30;
    const sqX = h.x - sqW / 2, sqY = by + (bh - sqH) / 2 + 4;
    ctx.strokeStyle = isNeon ? 'rgba(0,255,200,0.25)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(sqX, sqY, sqW, sqH, 2);
    ctx.stroke();

    // Glass reflection streak
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.clip();
    const refGrad = ctx.createLinearGradient(bx + bw * 0.2, by, bx + bw * 0.45, by + bh);
    refGrad.addColorStop(0, 'rgba(255,255,255,0)');
    refGrad.addColorStop(0.4, 'rgba(255,255,255,0.08)');
    refGrad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    refGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = refGrad;
    ctx.fillRect(bx, by, bw, bh);
    ctx.restore();

    // ---- BRACKET (connects backboard to rim) ----
    const bracketColor = isNeon ? 'rgba(0,255,200,0.35)' : 'rgba(160,160,170,0.6)';
    ctx.strokeStyle = bracketColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(h.x, by + bh);
    ctx.lineTo(h.x, h.rimY);
    ctx.stroke();
    // Small bracket arms
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(h.x - 10, by + bh - 2);
    ctx.lineTo(h.x - 10, h.rimY);
    ctx.lineTo(rimL + 2, h.rimY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.x + 10, by + bh - 2);
    ctx.lineTo(h.x + 10, h.rimY);
    ctx.lineTo(rimR - 2, h.rimY);
    ctx.stroke();

    // ---- RIM (3D metallic ring) ----
    // Rim glow
    if (theme.rimGlow > 0.3) {
        ctx.shadowColor = h.owner.color;
        ctx.shadowBlur = 15 * theme.rimGlow;
    }

    // Rim - main ring (thick with gradient)
    ctx.lineWidth = 6;
    const rimGrad = ctx.createLinearGradient(rimL, h.rimY - 4, rimL, h.rimY + 4);
    rimGrad.addColorStop(0, h.owner.light);
    rimGrad.addColorStop(0.35, h.owner.color);
    rimGrad.addColorStop(0.7, h.owner.color);
    rimGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.strokeStyle = rimGrad;
    ctx.beginPath();
    ctx.moveTo(rimL, h.rimY);
    ctx.lineTo(rimR, h.rimY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rim highlight (top edge)
    ctx.strokeStyle = 'rgba(255,200,150,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rimL + 2, h.rimY - 2);
    ctx.lineTo(rimR - 2, h.rimY - 2);
    ctx.stroke();

    // Rim endpoints (3D bolts)
    [rimL, rimR].forEach(rx => {
        // Outer ring
        ctx.beginPath();
        ctx.arc(rx, h.rimY, 6, 0, Math.PI * 2);
        ctx.fillStyle = h.owner.color;
        ctx.fill();
        // Inner metallic
        ctx.beginPath();
        ctx.arc(rx, h.rimY, 3.5, 0, Math.PI * 2);
        const boltGrad = ctx.createRadialGradient(rx - 1, h.rimY - 1, 0, rx, h.rimY, 4);
        boltGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
        boltGrad.addColorStop(1, h.owner.color);
        ctx.fillStyle = boltGrad;
        ctx.fill();
    });

    // Net hooks (small loops where net attaches to rim)
    const hookCount = 8;
    ctx.strokeStyle = isNeon ? 'rgba(0,255,200,0.3)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < hookCount; i++) {
        const hx = rimL + (i + 0.5) * (h.w / hookCount);
        ctx.beginPath();
        ctx.arc(hx, h.rimY + 3, 2, 0, Math.PI);
        ctx.stroke();
    }

    // ---- NET (diamond mesh pattern) ----
    const netDepth = 48;
    const netRows = 7;
    const netCols = 8;
    const netColor = isNeon ? 'rgba(0,255,200,' : 'rgba(255,255,255,';

    // Collect active bulges for this hoop
    const hoopIdx = hoops.indexOf(h);
    const activeBulges = netBulges.filter(nb => nb.hoopIdx === hoopIdx);

    // Build net vertex grid
    const netPts = [];
    for (let row = 0; row <= netRows; row++) {
        const rowPts = [];
        const rowFrac = row / netRows;
        const taper = 1 - rowFrac * 0.45; // net narrows toward bottom
        const rowWidth = h.w * taper;
        const rowLeft = h.x - rowWidth / 2;
        const rowY = h.rimY + rowFrac * netDepth;

        for (let col = 0; col <= netCols; col++) {
            const colFrac = col / netCols;
            let px = rowLeft + colFrac * rowWidth;
            let py = rowY;

            // Sway animation from score
            const sway = Math.sin(colFrac * Math.PI * 2 + t * 1.5 + row * 0.5) * h.ns * 10 * rowFrac;
            const sway2 = Math.cos(colFrac * Math.PI * 3 + t * 2) * h.ns * 3 * rowFrac;
            px += sway + sway2;

            // Gentle idle sway
            px += Math.sin(t * 0.7 + col * 0.8 + row * 0.3) * 0.8 * rowFrac;
            py += Math.sin(t * 0.5 + col * 0.5 + row * 0.7) * 0.4 * rowFrac;

            // Gravity drape - middle hangs lower
            const centerDist = Math.abs(colFrac - 0.5) * 2;
            py += (1 - centerDist) * 3 * rowFrac;

            // Ball pass-through bulge effect
            for (const nb of activeBulges) {
                const bulgeCenter = nb.progress;
                const distToBulge = Math.abs(rowFrac - bulgeCenter);
                const bulgeRadius = 0.25;
                if (distToBulge < bulgeRadius) {
                    const bulgeStrength = Math.cos(distToBulge / bulgeRadius * Math.PI * 0.5);
                    const fade = nb.progress > 1.0 ? Math.max(0, 1 - (nb.progress - 1.0) / 0.3) : 1;
                    const pushAmount = bulgeStrength * nb.ballR * 0.7 * fade;
                    // Push outward from net center axis
                    const fromCenter = colFrac - 0.5;
                    px += fromCenter * pushAmount * 2.2;
                    // Push downward slightly
                    py += pushAmount * 0.5 * bulgeStrength;
                }
            }

            rowPts.push({ x: px, y: py });
        }
        netPts.push(rowPts);
    }

    // Draw diamond mesh
    for (let row = 0; row < netRows; row++) {
        const alpha = 0.5 - row * 0.04;
        ctx.strokeStyle = netColor + alpha.toFixed(2) + ')';
        ctx.lineWidth = 1.1 - row * 0.05;

        for (let col = 0; col < netCols; col++) {
            const tl = netPts[row][col];
            const tr = netPts[row][col + 1];
            const bl = netPts[row + 1][col];
            const br = netPts[row + 1][col + 1];

            // Diamond: top-left to bottom-right, top-right to bottom-left
            // Stagger: even rows connect down-right, odd rows connect down-left
            if (row % 2 === 0) {
                // V pattern
                const midBottom = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
                ctx.beginPath();
                ctx.moveTo(tl.x, tl.y);
                ctx.lineTo(midBottom.x, midBottom.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(tr.x, tr.y);
                ctx.lineTo(midBottom.x, midBottom.y);
                ctx.stroke();
            } else {
                // Inverted V pattern
                const midTop = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
                ctx.beginPath();
                ctx.moveTo(midTop.x, midTop.y);
                ctx.lineTo(bl.x, bl.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(midTop.x, midTop.y);
                ctx.lineTo(br.x, br.y);
                ctx.stroke();
            }
        }
    }

    // Net bottom edge loop (gathered look)
    const lastRow = netPts[netRows];
    ctx.strokeStyle = netColor + '0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lastRow[0].x, lastRow[0].y);
    for (let i = 1; i <= netCols; i++) {
        const prev = lastRow[i - 1];
        const curr = lastRow[i];
        const cpY = Math.max(prev.y, curr.y) + 3;
        ctx.quadraticCurveTo((prev.x + curr.x) / 2, cpY, curr.x, curr.y);
    }
    ctx.stroke();
}

function drawBall(ctx) {
    if (!ballTexture || lastSkin !== currentSkin) buildBallTexture();
    const { x, y, r } = ball;
    const diam = r * 2;

    // Motion trail
    const spd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    if (spd > 5) {
        ctx.globalAlpha = Math.min(spd * 0.03, 0.35);
        ctx.drawImage(ballTexture, x - ball.vx * 0.4 - r, y - ball.vy * 0.4 - r, diam, diam);
        ctx.globalAlpha = 1;
    }

    // Neon glow around ball
    if (currentTheme === 'neon') {
        ctx.shadowColor = '#0fc';
        ctx.shadowBlur = 15;
    }

    // Ball with rotation
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ball.rotation);
    ctx.drawImage(ballTexture, -r, -r, diam, diam);
    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawParticles(ctx) {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;

        if (p.type === 'spark') {
            // Draw trail
            if (p.trail && p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.lineTo(p.x, p.y);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.r * 0.8;
                ctx.globalAlpha = p.life * 0.4;
                ctx.stroke();
                ctx.globalAlpha = p.life;
            }
            // Bright core
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life * 0.5;
            ctx.fill();
            ctx.shadowBlur = 0;

        } else if (p.type === 'ember') {
            // Soft glow
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            // Inner bright
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
            ctx.shadowBlur = 0;

        } else if (p.type === 'dust') {
            // Soft expanding circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life * 0.35;
            ctx.fill();

        } else if (p.type === 'flash') {
            // Expanding ring flash
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            grd.addColorStop(0, 'rgba(255,255,255,' + (p.life * 0.7) + ')');
            grd.addColorStop(0.4, p.color);
            grd.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();

        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function drawConfetti(ctx) {
    confetti.forEach(c => {
        ctx.globalAlpha = c.life;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation * Math.PI / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.r, -c.r * 0.4, c.r * 2, c.r * 0.8);
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function drawFloatingTexts(ctx) {
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.life;
        ctx.font = 'bold ' + ft.size + 'px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;
}

function drawCountdown(ctx) {
    if (countdownValue <= 0 && countdownValue !== -1) return;
    const text = countdownValue === -1 ? 'GO!' : countdownValue.toString();
    const scale = countdownValue === -1 ? 1.2 : 1;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.font = 'bold 120px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(text, 3, 3);
    ctx.fillStyle = countdownValue === -1 ? '#4ecdc4' : '#fff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

function drawScoreDiff(ctx) {
    if (!gameOn) return;
    const diff = P1.score - P2.score;
    if (diff === 0) return;
    const leader = diff > 0 ? P1 : P2;
    const text = (leader === P1 ? '◀ ' : '') + 'P' + (leader.id + 1) + ' +' + Math.abs(diff) + (leader === P2 ? ' ▶' : '');
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = leader.color + '99';
    ctx.fillText(text, W / 2, 52);
}

function drawAIHand(ctx) {
    if (!aiEnabled) return;
    const { x, y } = aiHand;
    const t = Date.now() * 0.004;
    const pulse = 1 + Math.sin(t) * 0.08;
    const r = 28 * pulse;

    // Outer glow
    const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2);
    glow.addColorStop(0, 'rgba(239,68,68,0.3)');
    glow.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);

    // Hand circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Robot icon
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('🤖', x, y);

    // Label
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = 'rgba(239,68,68,0.8)';
    ctx.fillText('BOT', x, y - r - 8);
}

function drawLast10sOverlay(ctx) {
    if (!last10s) return;
    const pulse = Math.sin(Date.now() * 0.008) * 0.15;
    ctx.fillStyle = 'rgba(255,0,0,' + (0.05 + pulse) + ')';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,80,80,0.8)';
    ctx.fillText('⚡ 2X SKOR ⚡', W / 2, H - 20);
}

// ---- MAIN DRAW ----
function draw(ctx, vid) {
    ctx.clearRect(0, 0, W, H);

    // Screen shake
    if (shakeAmount > 0) {
        ctx.save();
        ctx.translate(
            (Math.random() - 0.5) * shakeAmount,
            (Math.random() - 0.5) * shakeAmount
        );
    }

    drawWebcam(ctx, vid);
    drawThemeOverlay(ctx);
    drawCourtLines(ctx);
    drawLast10sOverlay(ctx);
    drawPlayerAuras(ctx);
    hoops.forEach(h => drawHoop(ctx, h));
    drawBall(ctx);
    drawAIHand(ctx);
    drawParticles(ctx);
    drawConfetti(ctx);
    drawFloatingTexts(ctx);
    drawScoreDiff(ctx);
    drawCountdown(ctx);

    if (shakeAmount > 0) {
        ctx.restore();
    }
}
