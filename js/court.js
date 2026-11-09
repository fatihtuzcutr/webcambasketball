// court.js — Pre-rendered basketball court background
let courtCanvas = null;

function buildCourt(W, H) {
    courtCanvas = document.createElement('canvas');
    courtCanvas.width = W;
    courtCanvas.height = H;
    const c = courtCanvas.getContext('2d');

    // ---- COURT LINES ONLY ----
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 3;

    // Outer boundary
    c.strokeRect(20, 20, W - 40, H - 40);

    // Center line
    c.beginPath(); c.moveTo(W / 2, 20); c.lineTo(W / 2, H - 20); c.stroke();

    // Center circle
    c.beginPath(); c.arc(W / 2, H / 2, 60, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();

    // Left key (paint area)
    const keyW = 130, keyH = 200;
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
    c.strokeRect(20, H / 2 - keyH / 2, keyW, keyH);
    c.beginPath(); c.arc(20 + keyW, H / 2, keyH / 2.8, Math.PI * -0.5, Math.PI * 0.5); c.stroke();
    c.setLineDash([6, 6]);
    c.beginPath(); c.arc(20 + keyW, H / 2, keyH / 2.8, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
    c.setLineDash([]);

    // Right key
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
    c.strokeRect(W - 20 - keyW, H / 2 - keyH / 2, keyW, keyH);
    c.beginPath(); c.arc(W - 20 - keyW, H / 2, keyH / 2.8, Math.PI * -0.5, Math.PI * 0.5, true); c.stroke();
    c.setLineDash([6, 6]);
    c.beginPath(); c.arc(W - 20 - keyW, H / 2, keyH / 2.8, Math.PI * 0.5, Math.PI * 1.5, true); c.stroke();
    c.setLineDash([]);

    // Three-point arcs
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2;
    c.beginPath(); c.arc(20, H / 2, 200, Math.PI * -0.38, Math.PI * 0.38); c.stroke();
    c.beginPath(); c.moveTo(20, H / 2 - 200 * Math.sin(0.38)); c.lineTo(20, 20); c.stroke();
    c.beginPath(); c.moveTo(20, H / 2 + 200 * Math.sin(0.38)); c.lineTo(20, H - 20); c.stroke();

    c.beginPath(); c.arc(W - 20, H / 2, 200, Math.PI * 0.62, Math.PI * 1.38); c.stroke();
    c.beginPath(); c.moveTo(W - 20, H / 2 - 200 * Math.sin(0.38)); c.lineTo(W - 20, 20); c.stroke();
    c.beginPath(); c.moveTo(W - 20, H / 2 + 200 * Math.sin(0.38)); c.lineTo(W - 20, H - 20); c.stroke();

}
