// mysol Archery Game Engine
// Dynamic HTML5 Canvas Physics & Interactive Bow & Arrow Mechanics

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('archery-canvas');
    const ctx = canvas.getContext('2d');
    const scoreValEl = document.getElementById('score-val');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initPositions();
    });

    // Game Variables
    let totalScore = 0;
    let targetX = width / 2;
    let targetY = 140;
    let targetRadius = 45;
    let targetWiggle = 0;

    let bowX = width / 2;
    let bowY = height - 130;
    let bowWidth = 140;

    // Pulling / Aiming State
    let isPulling = false;
    let pullX = bowX;
    let pullY = bowY;
    let currentPullDist = 0;
    let currentAimAngle = -Math.PI / 2;

    // Arrow State
    // States: 'idle', 'pulling', 'flying', 'stuck', 'miss'
    let arrowState = 'idle';
    let arrow = {
        x: bowX,
        y: bowY,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        length: 80
    };

    let stuckArrows = []; // Arrows pinned to the target
    let particles = [];
    let floatingTexts = [];

    // Web Audio Synthesizer for Twang & Hit Sounds
    let audioCtx = null;
    function playSound(type) {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'release') {
                // Bowstring twang sound
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(180, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
            } else if (type === 'hit') {
                // Target impact thud
                osc.type = 'sine';
                osc.frequency.setValueAtTime(240, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.2);
            } else if (type === 'bullseye') {
                // High chime for bullseye
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
                osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.35);
            }
        } catch (e) {
            // Audio context fallback
        }
    }

    function initPositions() {
        targetX = width / 2;
        targetY = Math.max(140, Math.min(180, height * 0.2));
        bowX = width / 2;
        bowY = height - 140;
        if (arrowState === 'idle' || arrowState === 'pulling') {
            arrow.x = bowX;
            arrow.y = bowY;
        }
    }

    initPositions();

    // Event Listeners for Pulling & Aiming
    function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
        if (arrowState !== 'idle') return;
        const pos = getPointerPos(e);
        const dist = Math.hypot(pos.x - bowX, pos.y - bowY);

        if (dist < 140) {
            isPulling = true;
            arrowState = 'pulling';
            updatePull(pos.x, pos.y);
        }
    }

    function onPointerMove(e) {
        if (!isPulling) return;
        const pos = getPointerPos(e);
        updatePull(pos.x, pos.y);
    }

    function updatePull(px, py) {
        const dx = px - bowX;
        const dy = py - bowY;
        const dist = Math.hypot(dx, dy);
        const maxPull = 110;
        
        currentPullDist = Math.min(dist, maxPull);
        
        // Aim direction is opposite to pull direction
        currentAimAngle = Math.atan2(-dy, -dx);

        // Constrain aim upwards towards the target (angle between -170 deg and -10 deg)
        if (dy < 10) {
            pullX = bowX - Math.cos(currentAimAngle) * currentPullDist;
            pullY = bowY - Math.sin(currentAimAngle) * currentPullDist;
        } else {
            pullX = px;
            pullY = py;
        }
    }

    function onPointerUp() {
        if (!isPulling) return;
        isPulling = false;

        if (currentPullDist > 18) {
            // Launch Arrow
            arrowState = 'flying';
            const speed = currentPullDist * 0.32;
            arrow.vx = Math.cos(currentAimAngle) * speed;
            arrow.vy = Math.sin(currentAimAngle) * speed;
            arrow.x = bowX;
            arrow.y = bowY;
            arrow.angle = currentAimAngle;

            playSound('release');
        } else {
            // Cancel pull
            arrowState = 'idle';
            resetArrowToBow();
        }

        currentPullDist = 0;
    }

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    function resetArrowToBow() {
        arrowState = 'idle';
        arrow.x = bowX;
        arrow.y = bowY;
        arrow.vx = 0;
        arrow.vy = 0;
        arrow.angle = -Math.PI / 2;
    }

    // Main Game Loop
    function update() {
        // Smooth Target Wiggle Dampening
        if (targetWiggle > 0) {
            targetWiggle *= 0.88;
            if (targetWiggle < 0.1) targetWiggle = 0;
        }

        // Flying Arrow Physics
        if (arrowState === 'flying') {
            arrow.x += arrow.vx;
            arrow.y += arrow.vy;
            arrow.vy += 0.08; // Subtle gravity
            arrow.angle = Math.atan2(arrow.vy, arrow.vx);

            // Tip of the arrow position
            const tipX = arrow.x + Math.cos(arrow.angle) * (arrow.length / 2);
            const tipY = arrow.y + Math.sin(arrow.angle) * (arrow.length / 2);

            // Collision check with Target
            const distToTarget = Math.hypot(tipX - targetX, tipY - targetY);

            if (tipY <= targetY + 20 && tipY >= targetY - 30 && distToTarget <= targetRadius + 5) {
                // HIT TARGET!
                arrowState = 'stuck';
                targetWiggle = 12;

                // Calculate Score based on ring
                let points = 20;
                let textStr = "+20";
                let textColor = "#ffffff";

                if (distToTarget <= 7) {
                    points = 100;
                    textStr = "+100 BULLSEYE!";
                    textColor = "#fbbf24";
                    playSound('bullseye');
                } else if (distToTarget <= 16) {
                    points = 80;
                    textStr = "+80 PERFECT!";
                    textColor = "#f43f5e";
                    playSound('hit');
                } else if (distToTarget <= 26) {
                    points = 60;
                    textStr = "+60 GREAT!";
                    textColor = "#38bdf8";
                    playSound('hit');
                } else if (distToTarget <= 36) {
                    points = 40;
                    textStr = "+40 GOOD";
                    textColor = "#94a3b8";
                    playSound('hit');
                } else {
                    playSound('hit');
                }

                totalScore += points;
                scoreValEl.textContent = totalScore;

                // Add Floating Score Text
                floatingTexts.push({
                    text: textStr,
                    x: tipX,
                    y: tipY - 20,
                    alpha: 1.0,
                    color: textColor
                });

                // Add Sparkle Particles
                const particleCount = points >= 80 ? 25 : 12;
                for (let i = 0; i < particleCount; i++) {
                    particles.push({
                        x: tipX,
                        y: tipY,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        r: Math.random() * 3 + 1,
                        alpha: 1.0,
                        color: textColor
                    });
                }

                // Pin arrow to target
                stuckArrows.push({
                    offsetX: tipX - targetX,
                    offsetY: tipY - targetY,
                    angle: arrow.angle
                });

                // Auto reload new arrow in 1s
                setTimeout(resetArrowToBow, 1000);
            } else if (arrow.y > height + 100 || arrow.x < -100 || arrow.x > width + 100 || arrow.y < -200) {
                // MISS
                arrowState = 'miss';
                floatingTexts.push({
                    text: "MISS",
                    x: Math.max(50, Math.min(width - 50, arrow.x)),
                    y: Math.max(100, Math.min(height - 100, arrow.y)),
                    alpha: 1.0,
                    color: "#64748b"
                });
                setTimeout(resetArrowToBow, 800);
            }
        }

        // Update Floating Texts
        floatingTexts.forEach((t, i) => {
            t.y -= 1.2;
            t.alpha -= 0.02;
            if (t.alpha <= 0) {
                floatingTexts.splice(i, 1);
            }
        });

        // Update Particles
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.03;
            if (p.alpha <= 0) {
                particles.splice(i, 1);
            }
        });
    }

    // Render Canvas Frame
    function render() {
        ctx.clearRect(0, 0, width, height);

        // 1. Draw Target at Top Center
        drawTarget();

        // 2. Draw Stuck Arrows in Target
        drawStuckArrows();

        // 3. Draw Trajectory Preview Line when pulling
        if (isPulling) {
            drawTrajectory();
        }

        // 4. Draw Bow & Bowstring at Bottom Center
        drawBow();

        // 5. Draw Active Flying/Pulling Arrow
        if (arrowState !== 'stuck') {
            drawArrow(arrow.x, arrow.y, arrow.angle);
        }

        // 6. Draw Particles & Score Texts
        drawParticles();
        drawFloatingTexts();

        update();
        requestAnimationFrame(render);
    }

    // Draw Target
    function drawTarget() {
        const wiggleOffset = Math.sin(Date.now() * 0.05) * targetWiggle;
        const tx = targetX + wiggleOffset;
        const ty = targetY;

        // Target Stand / Tripod Legs
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 20);
        ctx.lineTo(tx - 35, ty + 100);
        ctx.moveTo(tx, ty + 20);
        ctx.lineTo(tx + 35, ty + 100);
        ctx.moveTo(tx, ty + 20);
        ctx.lineTo(tx, ty + 110);
        ctx.stroke();
        ctx.restore();

        // Target Concentric Circles
        const rings = [
            { r: 48, color: '#f8fafc', border: '#cbd5e1' }, // White Outer
            { r: 38, color: '#0f172a', border: '#334155' }, // Black
            { r: 28, color: '#38bdf8', border: '#0284c7' }, // Blue
            { r: 18, color: '#f43f5e', border: '#e11d48' }, // Red
            { r: 8,  color: '#fbbf24', border: '#d97706' }  // Gold Bullseye
        ];

        rings.forEach(ring => {
            ctx.beginPath();
            ctx.arc(tx, ty, ring.r, 0, Math.PI * 2);
            ctx.fillStyle = ring.color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = ring.border;
            ctx.stroke();
        });

        // Center Gold Dot Glow
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    // Draw Stuck Arrows
    function drawStuckArrows() {
        stuckArrows.forEach(sa => {
            const ax = targetX + sa.offsetX;
            const ay = targetY + sa.offsetY;
            drawArrow(ax, ay, sa.angle, true);
        });
    }

    // Draw Trajectory Guidance Line
    function drawTrajectory() {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 2;

        const speed = currentPullDist * 0.32;
        let simX = bowX;
        let simY = bowY;
        let simVx = Math.cos(currentAimAngle) * speed;
        let simVy = Math.sin(currentAimAngle) * speed;

        ctx.moveTo(simX, simY);

        for (let i = 0; i < 22; i++) {
            simX += simVx;
            simY += simVy;
            simVy += 0.08;
            ctx.lineTo(simX, simY);
        }

        ctx.stroke();
        ctx.restore();
    }

    // Draw Bow & Strings
    function drawBow() {
        ctx.save();
        ctx.translate(bowX, bowY);

        // Rotate bow body towards aim direction
        let bowAngle = isPulling ? currentAimAngle + Math.PI / 2 : 0;
        ctx.rotate(bowAngle);

        const halfW = bowWidth / 2;
        const depth = 45;

        // Bow Limbs (Bezier Curve)
        ctx.beginPath();
        ctx.moveTo(-halfW, 0);
        ctx.quadraticCurveTo(0, -depth, halfW, 0);
        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();

        // Wooden / Metallic Accent Layer
        ctx.beginPath();
        ctx.moveTo(-halfW, 0);
        ctx.quadraticCurveTo(0, -depth, halfW, 0);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bowstring
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1.5;

        if (isPulling) {
            // Draw bent string attached to pull point
            const localPullX = (pullX - bowX) * Math.cos(-bowAngle) - (pullY - bowY) * Math.sin(-bowAngle);
            const localPullY = (pullX - bowX) * Math.sin(-bowAngle) + (pullY - bowY) * Math.cos(-bowAngle);

            ctx.moveTo(-halfW, 0);
            ctx.lineTo(localPullX, localPullY);
            ctx.lineTo(halfW, 0);
        } else {
            // Straight string resting
            ctx.moveTo(-halfW, 0);
            ctx.lineTo(halfW, 0);
        }
        ctx.stroke();

        ctx.restore();
    }

    // Draw Arrow
    function drawArrow(x, y, angle, isStuck = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const len = 75;
        const halfLen = len / 2;

        // Arrow Shaft
        ctx.beginPath();
        ctx.moveTo(-halfLen, 0);
        ctx.lineTo(halfLen, 0);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Arrowhead (Sharp Tip)
        ctx.beginPath();
        ctx.moveTo(halfLen + 10, 0);
        ctx.lineTo(halfLen - 4, -6);
        ctx.lineTo(halfLen - 4, 6);
        ctx.closePath();
        ctx.fillStyle = "#fbbf24";
        ctx.fill();

        // Fletching / Feathers at back
        if (!isStuck) {
            ctx.beginPath();
            ctx.moveTo(-halfLen, 0);
            ctx.lineTo(-halfLen - 12, -7);
            ctx.lineTo(-halfLen - 4, 0);
            ctx.lineTo(-halfLen - 12, 7);
            ctx.closePath();
            ctx.fillStyle = "#38bdf8";
            ctx.fill();
        }

        ctx.restore();
    }

    // Draw Particles
    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fill();
            ctx.restore();
        });
    }

    // Draw Floating Score Texts
    function drawFloatingTexts() {
        floatingTexts.forEach(t => {
            ctx.save();
            ctx.font = "800 1.25rem 'Outfit', sans-serif";
            ctx.fillStyle = t.color;
            ctx.globalAlpha = Math.max(0, t.alpha);
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 8;
            ctx.fillText(t.text, t.x, t.y);
            ctx.restore();
        });
    }

    // Start Animation Loop
    render();
});
