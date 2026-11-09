// app.js — Camera, detector, timer, mode selection, settings, init

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const vid = document.getElementById('webcam');
const tvEl = document.getElementById('tv');
const msgEl = document.getElementById('msg');
const ss = document.getElementById('ss');
const sbtn = document.getElementById('sbtn');
const tbtn = document.getElementById('tbtn');
const lm = document.getElementById('lm');
const timeSlider = document.getElementById('timeSlider');
const timeLabelEl = document.getElementById('timeLabel');
const gravSlider = document.getElementById('gravSlider');
const gravLabelEl = document.getElementById('gravLabel');
const themeSelect = document.getElementById('themeSelect');
const skinSelect = document.getElementById('skinSelect');
const aibtn = document.getElementById('aibtn');
const mutebtn = document.getElementById('mutebtn');
const diffSelect = document.getElementById('diffSelect');
const camSelect = document.getElementById('camSelect');
const camSwitchBtn = document.getElementById('cambtn');

let matchDuration = 300;

// Settings listeners
timeSlider.addEventListener('input', () => {
    matchDuration = parseInt(timeSlider.value);
    const m = Math.floor(matchDuration / 60);
    const s = matchDuration % 60;
    timeLabelEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
});

gravSlider.addEventListener('input', () => {
    const val = parseFloat(gravSlider.value);
    gravity = val;
    const labels = { '0.08': 'Ay', '0.13': 'Hafif', '0.18': 'Normal', '0.25': 'Ağır', '0.35': 'Jupiter' };
    gravLabelEl.textContent = labels[gravSlider.value] || val.toFixed(2);
});

themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    document.body.className = 'theme-' + currentTheme;
});

skinSelect.addEventListener('change', () => {
    currentSkin = skinSelect.value;
});

mutebtn.addEventListener('click', () => {
    const isMuted = toggleMute();
    mutebtn.textContent = isMuted ? '🔇' : '🔊';
    mutebtn.title = isMuted ? 'Sesi Aç' : 'Sesi Kapat';
});

diffSelect.addEventListener('change', () => {
    aiDifficulty = diffSelect.value;
});

camSelect.addEventListener('change', async () => {
    try {
        await startCam(camSelect.value);
        camSwitchBtn.textContent = camSelect.value === 'user' ? '🤳' : '📷';
    } catch (e) {
        console.warn('Kamera değiştirilemedi:', e);
        camSelect.value = currentFacing;
    }
});

camSwitchBtn.addEventListener('click', switchCamera);

P1.el = document.querySelector('#p1s span');
P2.el = document.querySelector('#p2s span');

let detector = null;

// ---- FULLSCREEN ----
const fsbtn = document.getElementById('fsbtn');
const container = document.getElementById('container');

const iconExpand = `<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const iconShrink = `<svg viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>`;

fsbtn.addEventListener('click', () => {
    try {
        if (!document.fullscreenElement) {
            const rfs = container.requestFullscreen || container.webkitRequestFullscreen || container.msRequestFullscreen;
            if (rfs) rfs.call(container);
        } else {
            const efs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (efs) efs.call(document);
        }
    } catch (e) { console.warn('Fullscreen hatası:', e); }
});
document.addEventListener('fullscreenchange', () => {
    fsbtn.innerHTML = document.fullscreenElement ? iconShrink : iconExpand;
});

// ---- CAMERA ----
async function startCam(facing) {
    if (!navigator.mediaDevices) navigator.mediaDevices = {};
    if (!navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = function (c) {
            const fn = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
            if (!fn) return Promise.reject(new Error('getUserMedia desteklenmiyor'));
            return new Promise((r, j) => fn.call(navigator, c, r, j));
        };
    }
    // Eski stream'i durdur
    if (vid.srcObject) {
        vid.srcObject.getTracks().forEach(t => t.stop());
    }
    currentFacing = facing || 'user';
    mirrorCam = (currentFacing === 'user');
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: W }, height: { ideal: H }, facingMode: currentFacing }
    });
    vid.srcObject = stream;
    await vid.play();
}

async function switchCamera() {
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';
    try {
        await startCam(newFacing);
        camSelect.value = newFacing;
        camSwitchBtn.textContent = newFacing === 'user' ? '🤳' : '📷';
    } catch (e) {
        console.warn('Kamera değiştirilemedi:', e);
    }
}

// ---- DETECTOR ----
async function initDetector() {
    lm.textContent = 'TF.js başlatılıyor...';
    await tf.setBackend('webgl');
    await tf.ready();
    lm.textContent = 'Pose modeli yükleniyor...';
    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
            modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
            enableSmoothing: true,
            enableTracking: true,
            trackerType: poseDetection.TrackerType.BoundingBox,
            minPoseScore: 0.15
        }
    );
    lm.textContent = 'Hazır!';
    sbtn.disabled = false;
    tbtn.disabled = false;
    aibtn.disabled = false;
    sbtn.textContent = '🏀 Maç (2 Kişi)';
    tbtn.textContent = '🎯 Antrenman';
    aibtn.textContent = '🤖 Bilgisayara Karşı';
}

let detectRunning = false;
async function detectLoop() {
    if (!detectRunning && detector && vid.readyState >= 2) {
        detectRunning = true;
        try { poses = await detector.estimatePoses(vid); } catch (e) { }
        detectRunning = false;
    }
    requestAnimationFrame(detectLoop);
}

// ---- MESSAGE ----
let msgTimeout = null;
function showMsg(t, d = 1000) {
    if (msgTimeout) clearTimeout(msgTimeout);
    msgEl.textContent = t;
    msgEl.style.opacity = 1;
    msgTimeout = setTimeout(() => { msgEl.style.opacity = 0; msgTimeout = null; }, d);
}

// ---- COUNTDOWN ----
function doCountdown(callback) {
    countdownValue = 3;
    sndCountdown();
    const iv = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            sndCountdown();
        } else if (countdownValue === 0) {
            clearInterval(iv);
            sndCountdownGo();
            countdownValue = -1;
            setTimeout(() => {
                countdownValue = 0;
                callback();
            }, 500);
        }
    }, 1000);
}

// ---- GAME LOOP ----
function gameLoop() {
    update(showMsg);
    draw(ctx, vid);
    requestAnimationFrame(gameLoop);
}

// ---- TIMER ----
let timerInterval = null;

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameOn || countdownValue > 0) return;
        timeLeft--;
        tvEl.textContent = formatTime(timeLeft);

        if (timeLeft <= 10 && !last10s && gameMode !== 'training') {
            last10s = true;
            showMsg('⚡ SON 10 SANİYE — 2X SKOR! ⚡', 1500);
            sndWhistle();
            tvEl.parentElement.style.background = 'rgba(255,50,50,0.7)';
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            endMatch();
        }
    }, 1000);
}

// ---- END MATCH ----
function endMatch() {
    gameOn = false;
    aiEnabled = false;
    sndWhistle();
    stopBgMusic();
    stopGirisSound();

    if (gameMode === 'training') {
        showMsg('Antrenman Bitti!\nSkor: ' + P1.score, 99999);
        saveHighScore(P1.score, 0);
        showEndScreen();
        return;
    }

    const p2Label = gameMode === 'ai' ? 'Bot' : 'Oyuncu 2';
    const winner = P1.score > P2.score ? 'Oyuncu 1 Kazandı! 🏆' :
        P2.score > P1.score ? p2Label + ' Kazandı! 🏆' : 'Berabere!';
    showMsg(winner + '\n' + P1.score + ' - ' + P2.score, 99999);
    saveHighScore(P1.score, P2.score);
    setTimeout(showEndScreen, 2000);
}

function showEndScreen() {
    ss.style.display = 'flex';
    menuSoundPlayed = false;
    ss.addEventListener('click', playMenuSound);
    ss.addEventListener('touchstart', playMenuSound);
    sndStart();
    const h1 = ss.querySelector('h1');
    const p = ss.querySelector('p');

    if (gameMode === 'training') {
        h1.textContent = '🎯 Antrenman Bitti!';
        p.innerHTML = buildStatsHTML(true) + '<br>' + getHighScoreHTML();
    } else {
        const p2Label = gameMode === 'ai' ? 'Bot' : 'Oyuncu 2';
        const w = P1.score > P2.score ? 'Oyuncu 1 Kazandı! 🏆' :
            P2.score > P1.score ? p2Label + ' Kazandı! 🏆' : 'Berabere!';
        h1.textContent = '🏀 ' + w;
        p.innerHTML = buildStatsHTML(false) + '<br>' + getHighScoreHTML();
    }
    sbtn.textContent = '🏀 Tekrar Maç';
    tbtn.textContent = '🎯 Antrenman';
    aibtn.textContent = '🤖 Bilgisayara Karşı';
}

function buildStatsHTML(training) {
    let html = '<div style="text-align:center;margin-bottom:12px;">';
    if (training) {
        html += `<b style="color:#3b82f6;font-size:28px">${P1.score}</b> puan<br>`;
        html += `<span style="color:#aaa">Basket: ${stats.p1.baskets} | En İyi Seri: ${stats.p1.bestStreak}</span>`;
    } else {
        const p2Name = gameMode === 'ai' ? '🤖 Bot' : 'P2';
        html += '<table style="margin:0 auto;border-collapse:collapse;color:#ccc;font-size:14px;">';
        html += `<tr><th style="padding:4px 16px;"></th><th style="color:#3b82f6;padding:4px 16px;">P1</th><th style="color:#ef4444;padding:4px 16px;">${p2Name}</th></tr>`;
        html += `<tr><td style="text-align:right;padding:3px 16px;">Skor</td><td style="text-align:center;font-size:22px;font-weight:bold;color:#3b82f6">${P1.score}</td><td style="text-align:center;font-size:22px;font-weight:bold;color:#ef4444">${P2.score}</td></tr>`;
        html += `<tr><td style="text-align:right;padding:3px 16px;">Basket</td><td style="text-align:center">${stats.p1.baskets}</td><td style="text-align:center">${stats.p2.baskets}</td></tr>`;
        html += `<tr><td style="text-align:right;padding:3px 16px;">En İyi Seri</td><td style="text-align:center">${stats.p1.bestStreak}</td><td style="text-align:center">${stats.p2.bestStreak}</td></tr>`;
        html += '</table>';
    }
    html += '</div>';
    return html;
}

function getHighScoreHTML() {
    if (highScores.length === 0) return '';
    let html = '<b style="color:#ffd700">🏆 En İyi Skorlar</b><br>';
    highScores.slice(0, 5).forEach((hs, i) => {
        const d = new Date(hs.date);
        const dateStr = d.toLocaleDateString('tr');
        if (hs.p2 === 0) {
            html += `${i + 1}. Antrenman: ${hs.p1} puan (${dateStr})<br>`;
        } else {
            html += `${i + 1}. ${hs.p1} - ${hs.p2} (${dateStr})<br>`;
        }
    });
    return html;
}

// ---- START GAME ----
let camStarted = false;
async function startGame(mode) {
    if (!camStarted) {
        try {
            await startCam(camSelect.value);
            camStarted = true;
        } catch (e) {
            alert('Kamera açılamadı: ' + e.message);
            return;
        }
    }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    initAudio();
    ss.style.display = 'none';
    msgEl.style.opacity = 0;
    gameMode = mode;

    // Apply settings
    gravity = parseFloat(gravSlider.value);
    currentTheme = themeSelect.value;
    currentSkin = skinSelect.value;
    aiDifficulty = diffSelect.value;
    document.body.className = 'theme-' + currentTheme;

    // AI mode
    aiEnabled = (mode === 'ai');

    resetGame();

    matchDuration = parseInt(timeSlider.value);
    if (mode === 'training') {
        timeLeft = 9999;
        tvEl.textContent = '∞';
    } else {
        timeLeft = matchDuration;
        tvEl.textContent = formatTime(matchDuration);
    }
    tvEl.parentElement.style.background = 'rgba(0,0,0,0.7)';
    P1.el.textContent = 0;
    P2.el.textContent = 0;

    gameOn = true;
    stopStartSound();
    sndGiris();

    doCountdown(() => {
        if (mode !== 'training') {
            startTimer();
        }
        startBgMusic();
    });
}

sbtn.addEventListener('click', () => startGame('normal'));
tbtn.addEventListener('click', () => startGame('training'));
aibtn.addEventListener('click', () => startGame('ai'));

// ---- PLAY MENU SOUND ON FIRST INTERACTION ----
let menuSoundPlayed = false;
function playMenuSound() {
    if (menuSoundPlayed) return;
    menuSoundPlayed = true;
    sndStart();
    ss.removeEventListener('click', playMenuSound);
    ss.removeEventListener('touchstart', playMenuSound);
}
ss.addEventListener('click', playMenuSound);
ss.addEventListener('touchstart', playMenuSound);

// ---- INIT ----
(async () => {
    try {
        // Init time label
        const m = Math.floor(300 / 60);
        const s = 300 % 60;
        timeLabelEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;

        buildCourt(W, H);
        await initDetector();
        detectLoop();
        gameLoop();
    } catch (err) {
        alert('Hata: ' + err.message);
    }
})();
