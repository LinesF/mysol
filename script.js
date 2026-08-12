// mysol 2D Pixel Game Engine - Step 13: Bare Hands Normal Attack (F/Right Click) & 2-Second Charged AoE Attack with Hotbar Slot 1 Fill Overlay

document.addEventListener('DOMContentLoaded', () => {
    // Safely query DOM elements with optional chaining to prevent any script crashes
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chatInputEl = document.getElementById('chat-input');
    const chatCharCountEl = document.getElementById('chat-char-count');
    const hotbarGridEl = document.getElementById('hotbar-grid');
    const inventoryGridEl = document.getElementById('inventory-grid');
    const inventoryWindowEl = document.getElementById('inventory-window');
    const btnToggleInventoryEl = document.getElementById('btn-toggle-inventory');
    const camLockBadgeEl = document.getElementById('cam-lock-badge');
    const cameraWarningToastEl = document.getElementById('camera-warning-toast');
    const flashlightToastEl = document.getElementById('flashlight-toast');
    const batteryBarFillEl = document.getElementById('battery-bar-fill');
    const batteryBarValEl = document.getElementById('battery-bar-val');
    const phoneScreenContainerEl = document.getElementById('phone-screen-container');

    function safeRoundRect(x, y, w, h, r) {
        try {
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.rect(x, y, w, h);
            }
        } catch (e) {
            ctx.rect(x, y, w, h);
        }
    }

    // -------------------------------------------------------------
    // OFFSCREEN CANVAS FOR LIGHTING & DARKNESS MASKING
    // -------------------------------------------------------------
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    // Canvas & 10x10 Expanded Map Parameters
    let width = 800;
    let height = 600;

    const GRID_SIZE = 10;
    const TILE_SIZE = 80;
    const MAP_DIM = GRID_SIZE * TILE_SIZE;

    // Mouse Tracking
    let mouseX = width / 2;
    let mouseY = height / 2;

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    function resizeCanvas() {
        width = canvas.width = maskCanvas.width = window.innerWidth || document.documentElement.clientWidth || 800;
        height = canvas.height = maskCanvas.height = window.innerHeight || document.documentElement.clientHeight || 600;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Player Position
    const player = {
        x: MAP_DIM / 2,
        y: MAP_DIM / 2 + 80,
        size: 36,
        speed: 3.5,
        direction: 'down',
        isMoving: false,
        animFrame: 0,
        animTimer: 0
    };

    // Campfire Position
    const campfire = {
        x: MAP_DIM / 2,
        y: MAP_DIM / 2,
        flickerTimer: 0
    };

    // Camera Management
    let isCameraLocked = true;
    const cameraPanOffset = { x: 0, y: 0 };
    const MAX_CAM_PAN_TILES = 10;
    const MAX_CAM_PAN = MAX_CAM_PAN_TILES * TILE_SIZE;
    const CAM_PAN_SPEED = 7.0;

    // Flashlight & Battery System
    let isFlashlightOn = false;
    let battery = 100.0;
    let flashlightToastTimeout = null;
    let warningToastTimeout = null;

    // Bare Hands Combat System (Normal vs 2-Second Heavy Charge Attack)
    let isBareHandsCharging = false;
    let chargeHoldTimer = 0.0; // Seconds held (0.0s to 2.0s+)
    let activeAttackAnimation = null; // { type: 'normal' | 'charged', angle: number, duration: number, remainingTime: number }

    function showFlashlightToast(text) {
        if (!flashlightToastEl) return;
        const span = flashlightToastEl.querySelector('span');
        if (span) span.textContent = text;
        flashlightToastEl.classList.remove('hidden');
        if (flashlightToastTimeout) clearTimeout(flashlightToastTimeout);
        flashlightToastTimeout = setTimeout(() => {
            flashlightToastEl.classList.add('hidden');
        }, 2000);
    }

    function showCameraWarningToast() {
        if (!cameraWarningToastEl) return;
        cameraWarningToastEl.classList.remove('hidden');
        if (warningToastTimeout) clearTimeout(warningToastTimeout);
        warningToastTimeout = setTimeout(() => {
            cameraWarningToastEl.classList.add('hidden');
        }, 1800);
    }

    function toggleCameraLock(forceState = null) {
        isCameraLocked = (forceState !== null) ? forceState : !isCameraLocked;
        if (isCameraLocked) {
            cameraPanOffset.x = 0;
            cameraPanOffset.y = 0;
        }
        updateCamLockUI();
    }

    function updateCamLockUI() {
        if (!camLockBadgeEl) return;
        const iconEl = camLockBadgeEl.querySelector('.cam-lock-icon');
        const textEl = camLockBadgeEl.querySelector('.cam-lock-text');

        if (isCameraLocked) {
            camLockBadgeEl.className = 'cam-lock-badge locked';
            if (iconEl) iconEl.textContent = '🔒';
            if (textEl) textEl.textContent = 'CAM LOCK (Y)';
        } else {
            camLockBadgeEl.className = 'cam-lock-badge unlocked';
            if (iconEl) iconEl.textContent = '🔓';
            if (textEl) textEl.textContent = 'CAM FREE (Y)';
        }
    }

    if (camLockBadgeEl) {
        camLockBadgeEl.addEventListener('click', () => {
            toggleCameraLock();
        });
    }

    let activeSpeechBubble = null;
    const keys = {};

    function resetKeys() {
        for (let k in keys) {
            keys[k] = false;
        }
        if (isBareHandsCharging) {
            releaseBareHandsAttack();
        }
    }

    function toggleFlashlight() {
        const equipped = hotbar[activeHotbarIndex];
        if (!equipped || equipped.id !== 'flashlight') return;

        if (battery <= 0) {
            showFlashlightToast('⚠️ 배터리 부족! (R키를 꾹 눌러 충전하세요)');
            isFlashlightOn = false;
            return;
        }

        isFlashlightOn = !isFlashlightOn;
        showFlashlightToast(isFlashlightOn ? '🔦 후레쉬 ON' : '🔦 후레쉬 OFF');
    }

    // -------------------------------------------------------------
    // BARE HANDS ATTACK & CHARGE LOGIC (F / RIGHT CLICK)
    // -------------------------------------------------------------
    function startBareHandsCharge() {
        const equipped = hotbar[activeHotbarIndex];
        if (!equipped || equipped.id !== 'hands') return;

        isBareHandsCharging = true;
        chargeHoldTimer = 0.0;
    }

    function releaseBareHandsAttack() {
        if (!isBareHandsCharging) return;

        const screenCenterX = width / 2;
        const screenCenterY = height / 2;
        const attackAngle = Math.atan2(mouseY - screenCenterY, mouseX - screenCenterX);

        if (chargeHoldTimer >= 1.0) {
            // Charged AoE Sector Attack!
            activeAttackAnimation = {
                type: 'charged',
                angle: attackAngle,
                totalDuration: 0.35,
                remainingTime: 0.35
            };
        } else {
            // Normal Front Melee Attack!
            activeAttackAnimation = {
                type: 'normal',
                angle: attackAngle,
                totalDuration: 0.22,
                remainingTime: 0.22
            };
        }

        isBareHandsCharging = false;
        chargeHoldTimer = 0.0;
        updateSlot1ChargeOverlay();
    }

    // Mouse Right Click Event Handlers
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const equipped = hotbar[activeHotbarIndex];
        if (equipped && equipped.id === 'flashlight') {
            toggleFlashlight();
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // Mouse Right Click
            if (chatInputEl && document.activeElement === chatInputEl) return;
            const equipped = hotbar[activeHotbarIndex];
            if (equipped && equipped.id === 'hands') {
                startBareHandsCharge();
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2) { // Mouse Right Click Release
            if (isBareHandsCharging) {
                releaseBareHandsAttack();
            }
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatEnterKey();
            return;
        }

        if (chatInputEl && document.activeElement === chatInputEl) {
            return;
        }

        // F key trigger
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            const equipped = hotbar[activeHotbarIndex];
            if (equipped && equipped.id === 'flashlight') {
                toggleFlashlight();
            } else if (equipped && equipped.id === 'hands' && !isBareHandsCharging) {
                startBareHandsCharge();
            }
            return;
        }

        if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            toggleCameraLock();
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            toggleInventory();
            return;
        }

        if (e.key === '1') setEquippedSlot(0);
        if (e.key === '2') setEquippedSlot(1);
        if (e.key === '3') setEquippedSlot(2);

        if (inventoryWindowEl && !inventoryWindowEl.classList.contains('hidden')) {
            return;
        }

        const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
        const isWASDPressed = keys['w'] || keys['s'] || keys['a'] || keys['d'];

        if (isArrowKey && !isWASDPressed && isCameraLocked) {
            toggleCameraLock(false);
        }

        const key = e.key.toLowerCase();
        keys[key] = true;
        keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        if ((e.key === 'f' || e.key === 'F') && isBareHandsCharging) {
            releaseBareHandsAttack();
        }

        const key = e.key.toLowerCase();
        keys[key] = false;
        keys[e.key] = false;
    });

    window.addEventListener('blur', resetKeys);
    if (chatInputEl) {
        chatInputEl.addEventListener('focus', resetKeys);
    }

    function updateSlot1ChargeOverlay() {
        if (!hotbarGridEl) return;
        const slot1El = hotbarGridEl.children[0];
        if (!slot1El) return;

        let overlayEl = slot1El.querySelector('.slot-charge-overlay');
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.className = 'slot-charge-overlay';
            slot1El.appendChild(overlayEl);
        }

        if (isBareHandsCharging) {
            const pct = Math.min(100, (chargeHoldTimer / 1.0) * 100);
            overlayEl.style.height = `${pct}%`;
            if (pct >= 100) {
                overlayEl.classList.add('charged-ready');
            } else {
                overlayEl.classList.remove('charged-ready');
            }
        } else {
            overlayEl.style.height = '0%';
            overlayEl.classList.remove('charged-ready');
        }
    }

    function update() {
        const isChatFocused = chatInputEl && (document.activeElement === chatInputEl);
        const isInventoryOpen = inventoryWindowEl && !inventoryWindowEl.classList.contains('hidden');

        if (isChatFocused || isInventoryOpen) {
            player.isMoving = false;
            player.animFrame = 0;
            player.animTimer = 0;
            resetKeys();
            return;
        }

        // Charge Timer Update
        if (isBareHandsCharging) {
            chargeHoldTimer += 1 / 60;
            updateSlot1ChargeOverlay();
        }

        // Active Attack Animation Timer
        if (activeAttackAnimation) {
            activeAttackAnimation.remainingTime -= 1 / 60;
            if (activeAttackAnimation.remainingTime <= 0) {
                activeAttackAnimation = null;
            }
        }

        // Flashlight Battery Recharge & Discharge
        const isRecharging = keys['r'] || keys['R'];

        if (isRecharging) {
            battery += (100 / 3) * (1 / 60);
            if (battery > 100) battery = 100;
            if (batteryBarFillEl) batteryBarFillEl.classList.add('recharging');
        } else {
            if (batteryBarFillEl) batteryBarFillEl.classList.remove('recharging');
        }

        if (isFlashlightOn) {
            const drainPerFrame = (100 / 60) * (1 / 60);
            battery -= drainPerFrame;

            if (battery <= 0) {
                battery = 0;
                isFlashlightOn = false;
                showFlashlightToast('⚠️ 배터리 방전! 후레쉬가 꺼졌습니다.');
            }
        }

        if (batteryBarFillEl) {
            batteryBarFillEl.style.width = `${Math.max(0, Math.min(100, battery))}%`;
        }
        if (batteryBarValEl) {
            batteryBarValEl.textContent = Math.round(battery);
        }

        // WASD Movement Keys
        let isWASD = false;
        let dx = 0;
        let dy = 0;

        if (keys['w']) { dy -= 1; player.direction = 'up'; isWASD = true; }
        if (keys['s']) { dy += 1; player.direction = 'down'; isWASD = true; }
        if (keys['a']) { dx -= 1; player.direction = 'left'; isWASD = true; }
        if (keys['d']) { dx += 1; player.direction = 'right'; isWASD = true; }

        if (isWASD && !isCameraLocked) {
            toggleCameraLock(true);
        }

        if (!isCameraLocked && !isWASD) {
            let panX = 0;
            let panY = 0;

            if (keys['arrowleft']) panX -= CAM_PAN_SPEED;
            if (keys['arrowright']) panX += CAM_PAN_SPEED;
            if (keys['arrowup']) panY -= CAM_PAN_SPEED;
            if (keys['arrowdown']) panY += CAM_PAN_SPEED;

            if (panX !== 0 || panY !== 0) {
                const targetX = cameraPanOffset.x + panX;
                const targetY = cameraPanOffset.y + panY;
                const dist = Math.hypot(targetX, targetY);

                if (dist > MAX_CAM_PAN) {
                    const angle = Math.atan2(targetY, targetX);
                    cameraPanOffset.x = Math.cos(angle) * MAX_CAM_PAN;
                    cameraPanOffset.y = Math.sin(angle) * MAX_CAM_PAN;
                    showCameraWarningToast();
                } else {
                    cameraPanOffset.x = targetX;
                    cameraPanOffset.y = targetY;
                }
            }
        }

        player.isMoving = isWASD && (dx !== 0 || dy !== 0);

        if (player.isMoving) {
            if (dx !== 0 && dy !== 0) {
                dx *= 0.7071;
                dy *= 0.7071;
            }

            player.x += dx * player.speed;
            player.y += dy * player.speed;

            const halfSize = player.size / 2;
            player.x = Math.max(halfSize + 4, Math.min(MAP_DIM - halfSize - 4, player.x));
            player.y = Math.max(halfSize + 4, Math.min(MAP_DIM - halfSize - 4, player.y));

            player.animTimer++;
            if (player.animTimer > 8) {
                player.animFrame = (player.animFrame + 1) % 4;
                player.animTimer = 0;
            }
        } else {
            player.animFrame = 0;
            player.animTimer = 0;
        }

        campfire.flickerTimer += 0.15;

        if (activeSpeechBubble) {
            activeSpeechBubble.remainingTime -= 1 / 60;
            if (activeSpeechBubble.remainingTime <= 0) {
                activeSpeechBubble = null;
            }
        }
    }

    function render() {
        try {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = false;

            const screenCenterX = width / 2;
            const screenCenterY = height / 2;

            const mapRenderX = isCameraLocked ? (screenCenterX - player.x) : (screenCenterX - player.x - cameraPanOffset.x);
            const mapRenderY = isCameraLocked ? (screenCenterY - player.y) : (screenCenterY - player.y - cameraPanOffset.y);

            ctx.save();
            ctx.translate(mapRenderX, mapRenderY);

            drawGrassTilemap();
            drawCampfire();
            drawPlayerCharacter();

            // Draw Bare Hands White Attack Range Effect
            if (activeAttackAnimation) {
                drawAttackRangeIndicator(activeAttackAnimation);
            }

            if (activeSpeechBubble) {
                drawSpeechBubble(activeSpeechBubble);
            }

            ctx.restore();

            drawLightingOverlay(mapRenderX, mapRenderY);
            drawOffScreenCharacterArrow(mapRenderX, mapRenderY);

            update();
        } catch (err) {
            console.error('Render loop error:', err);
        }

        requestAnimationFrame(render);
    }

    function drawGrassTilemap() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;

                const isEven = (row + col) % 2 === 0;
                ctx.fillStyle = isEven ? '#4ade80' : '#22c55e';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                ctx.fillStyle = '#16a34a';
                ctx.fillRect(tx + 14, ty + 20, 5, 10);
                ctx.fillRect(tx + 9, ty + 25, 5, 5);
                ctx.fillRect(tx + 48, ty + 44, 5, 10);
                ctx.fillRect(tx + 53, ty + 39, 5, 5);

                ctx.fillStyle = '#86efac';
                ctx.fillRect(tx + 19, ty + 15, 5, 5);
                ctx.fillRect(tx + 43, ty + 49, 5, 5);
            }
        }

        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, MAP_DIM, MAP_DIM);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.strokeRect(-4, -4, MAP_DIM + 8, MAP_DIM + 8);
    }

    function drawCampfire() {
        const cx = campfire.x;
        const cy = campfire.y;
        const flicker = Math.sin(campfire.flickerTimer) * 3;

        ctx.save();
        ctx.translate(cx, cy);

        ctx.fillStyle = '#64748b';
        const stoneAngleStep = (Math.PI * 2) / 8;
        for (let i = 0; i < 8; i++) {
            const angle = i * stoneAngleStep;
            const sx = Math.cos(angle) * 18;
            const sy = Math.sin(angle) * 12;
            ctx.beginPath();
            ctx.ellipse(sx, sy, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-14, -10);
        ctx.lineTo(14, 10);
        ctx.moveTo(-14, 10);
        ctx.lineTo(14, -10);
        ctx.stroke();

        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-12, 2);
        ctx.quadraticCurveTo(0, -28 - flicker, 12, 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-7, 2);
        ctx.quadraticCurveTo(0, -18 - flicker * 0.8, 7, 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -2, 3 + Math.abs(flicker * 0.5), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawPlayerCharacter() {
        const px = player.x;
        const py = player.y;

        const bounceY = (player.isMoving && (player.animFrame % 2 === 1)) ? -3 : 0;

        ctx.save();
        ctx.translate(px, py + bounceY);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, 10, 10, 8);
        ctx.fillRect(2, 10, 10, 8);

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-14, -6, 28, 18);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-12, -6, 24, 5);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-16, -24, 32, 12);

        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(-14, -14, 28, 12);

        ctx.fillStyle = '#0f172a';
        if (player.direction === 'down') {
            ctx.fillRect(-7, -11, 5, 5);
            ctx.fillRect(2, -11, 5, 5);
        } else if (player.direction === 'up') {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(-14, -14, 28, 12);
        } else if (player.direction === 'left') {
            ctx.fillRect(-10, -11, 5, 5);
        } else if (player.direction === 'right') {
            ctx.fillRect(5, -11, 5, 5);
        }

        ctx.restore();
    }

    // -------------------------------------------------------------
    // WHITE ATTACK RANGE INDICATOR (Normal Arc vs Charged AoE Sector)
    // -------------------------------------------------------------
    function drawAttackRangeIndicator(attack) {
        const px = player.x;
        const py = player.y;

        ctx.save();
        ctx.translate(px, py);

        const progress = attack.remainingTime / attack.totalDuration;
        const alpha = Math.sin(progress * Math.PI); // Smooth fade in/out

        if (attack.type === 'normal') {
            // Normal Attack: Crisp Front Melee Arc (75px radius, 70 deg arc)
            const radius = 75;
            const halfArc = Math.PI / 5;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, attack.angle - halfArc, attack.angle + halfArc);
            ctx.closePath();

            ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * alpha})`;
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
            ctx.lineWidth = 3.5;
            ctx.stroke();

        } else if (attack.type === 'charged') {
            // Charged AoE Heavy Attack: Large White Sector Cone (145px radius, 120 deg arc)
            const radius = 145;
            const halfArc = Math.PI / 3;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, attack.angle - halfArc, attack.angle + halfArc);
            ctx.closePath();

            const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
            coneGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * alpha})`);
            coneGrad.addColorStop(0.6, `rgba(255, 255, 255, ${0.45 * alpha})`);
            coneGrad.addColorStop(1.0, `rgba(255, 255, 255, ${0.1 * alpha})`);

            ctx.fillStyle = coneGrad;
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowBlur = 12;
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawSpeechBubble(bubble) {
        const px = player.x;
        const py = player.y - 38;

        ctx.save();
        ctx.font = "600 0.85rem 'Inter', sans-serif";

        const textMetrics = ctx.measureText(bubble.text);
        const textWidth = textMetrics.width;
        const paddingX = 14;
        const bubbleW = textWidth + paddingX * 2;
        const bubbleH = 28;
        const bx = px - bubbleW / 2;
        const by = py - bubbleH - 8;

        let alpha = 1.0;
        if (bubble.remainingTime < 0.5) {
            alpha = bubble.remainingTime / 0.5;
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        safeRoundRect(bx + 2, by + 2, bubbleW, bubbleH, 10);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        safeRoundRect(bx, by, bubbleW, bubbleH, 10);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px - 5, by + bubbleH);
        ctx.lineTo(px, by + bubbleH + 6);
        ctx.lineTo(px + 5, by + bubbleH);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bubble.text, px, by + bubbleH / 2);

        ctx.restore();
    }

    function drawLightingOverlay(mapRenderX, mapRenderY) {
        try {
            if (!maskCtx) return;

            const px = mapRenderX + player.x;
            const py = mapRenderY + player.y;

            const cx = mapRenderX + campfire.x;
            const cy = mapRenderY + campfire.y;

            const isFlashlightEquipped = hotbar[activeHotbarIndex] && hotbar[activeHotbarIndex].id === 'flashlight';
            const isFlashlightActive = isFlashlightEquipped && isFlashlightOn && battery > 0;

            let playerBaseRadius = 1.8 * TILE_SIZE;
            if (isFlashlightActive) {
                playerBaseRadius = 2.8 * TILE_SIZE;
            }

            const campfireBaseRadius = 5.5 * TILE_SIZE;
            const flickerRadius = Math.sin(campfire.flickerTimer * 1.5) * 6;
            const campfireLightRadius = campfireBaseRadius + flickerRadius;

            maskCtx.clearRect(0, 0, width, height);
            maskCtx.fillStyle = 'rgba(10, 14, 23, 0.96)';
            maskCtx.fillRect(0, 0, width, height);

            maskCtx.globalCompositeOperation = 'destination-out';

            // Light Source 1: Player Base Ambient Light
            const playerGrad = maskCtx.createRadialGradient(px, py, 10, px, py, playerBaseRadius);
            playerGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
            playerGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
            playerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

            maskCtx.fillStyle = playerGrad;
            maskCtx.beginPath();
            maskCtx.arc(px, py, playerBaseRadius, 0, Math.PI * 2);
            maskCtx.fill();

            // Light Source 2: Center Campfire
            const fireGrad = maskCtx.createRadialGradient(cx, cy, 15, cx, cy, campfireLightRadius);
            fireGrad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
            fireGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.5)');
            fireGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.12)');
            fireGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

            maskCtx.fillStyle = fireGrad;
            maskCtx.beginPath();
            maskCtx.arc(cx, cy, campfireLightRadius, 0, Math.PI * 2);
            maskCtx.fill();

            // Light Source 3: 6-Tile Softened Flashlight Sector Beam
            if (isFlashlightActive) {
                const flashDistance = 6 * TILE_SIZE;
                const flashAngle = Math.atan2(mouseY - py, mouseX - px);
                const halfCone = Math.PI / 6;

                maskCtx.beginPath();
                maskCtx.moveTo(px, py);
                maskCtx.arc(px, py, flashDistance, flashAngle - halfCone, flashAngle + halfCone);
                maskCtx.closePath();

                const coneGrad = maskCtx.createRadialGradient(px, py, 0, px, py, flashDistance);
                coneGrad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
                coneGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.96)');
                coneGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.75)');
                coneGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

                maskCtx.fillStyle = coneGrad;
                maskCtx.fill();
            }

            maskCtx.globalCompositeOperation = 'source-over';
            ctx.drawImage(maskCanvas, 0, 0);

            // Warm campfire glow
            ctx.save();
            const warmGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 260 + flickerRadius);
            warmGlow.addColorStop(0, 'rgba(249, 115, 22, 0.32)');
            warmGlow.addColorStop(0.4, 'rgba(251, 191, 36, 0.16)');
            warmGlow.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');

            ctx.fillStyle = warmGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, 260 + flickerRadius, 0, Math.PI * 2);
            ctx.fill();

            // Flashlight Yellow Beam Visual Overlay
            if (isFlashlightActive) {
                const flashDistance = 6 * TILE_SIZE;
                const flashAngle = Math.atan2(mouseY - py, mouseX - px);
                const halfCone = Math.PI / 6;

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.arc(px, py, flashDistance, flashAngle - halfCone, flashAngle + halfCone);
                ctx.closePath();

                const beamGlow = ctx.createRadialGradient(px, py, 0, px, py, flashDistance);
                beamGlow.addColorStop(0, 'rgba(254, 240, 138, 0.12)');
                beamGlow.addColorStop(0.1, 'rgba(254, 240, 138, 0.45)');
                beamGlow.addColorStop(0.7, 'rgba(253, 224, 71, 0.18)');
                beamGlow.addColorStop(1.0, 'rgba(253, 224, 71, 0.0)');

                ctx.fillStyle = beamGlow;
                ctx.fill();
            }

            ctx.restore();

        } catch (err) {
            console.error('Lighting overlay error:', err);
        }
    }

    function drawOffScreenCharacterArrow(mapRenderX, mapRenderY) {
        const px = mapRenderX + player.x;
        const py = mapRenderY + player.y;

        const margin = 45;
        const isOffScreen = (px < margin || px > width - margin || py < margin || py > height - margin);

        if (!isOffScreen) return;

        const centerX = width / 2;
        const centerY = height / 2;
        const dx = px - centerX;
        const dy = py - centerY;
        const angle = Math.atan2(dy, dx);

        const edgeX = Math.max(margin, Math.min(width - margin, centerX + Math.cos(angle) * (width / 2 - margin)));
        const edgeY = Math.max(margin, Math.min(height - margin, centerY + Math.sin(angle) * (height / 2 - margin)));

        ctx.save();
        ctx.translate(edgeX, edgeY);

        const pulse = Math.sin(Date.now() * 0.008) * 3;

        ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
        ctx.shadowBlur = 12;

        ctx.rotate(angle);
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(16 + pulse, 0);
        ctx.lineTo(-12, -12);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 12);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const distPx = Math.hypot(dx, dy);
        const distTiles = Math.round(distPx / TILE_SIZE);

        ctx.rotate(-angle);
        ctx.font = "700 0.75rem 'Fira Code', monospace";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(`${distTiles}칸`, 0, 24);

        ctx.restore();
    }

    // -------------------------------------------------------------
    // CHAT INPUT LOGIC
    // -------------------------------------------------------------
    if (chatInputEl && chatCharCountEl) {
        chatInputEl.addEventListener('input', () => {
            if (chatInputEl.value.length > 20) {
                chatInputEl.value = chatInputEl.value.slice(0, 20);
            }
            chatCharCountEl.textContent = `${chatInputEl.value.length}/20`;
        });
    }

    function handleChatEnterKey() {
        if (!chatInputEl) return;
        if (document.activeElement !== chatInputEl) {
            resetKeys();
            chatInputEl.focus();
        } else {
            const text = chatInputEl.value.trim();
            if (text.length > 0) {
                let duration = 4.5;
                if (text.length > 15) {
                    duration = 7.5;
                } else if (text.length > 10) {
                    duration = 6.0;
                }

                activeSpeechBubble = {
                    text: text,
                    totalDuration: duration,
                    remainingTime: duration
                };

                chatInputEl.value = '';
                if (chatCharCountEl) chatCharCountEl.textContent = '0/20';
            }
            chatInputEl.blur();
            resetKeys();
        }
    }

    // -------------------------------------------------------------
    // HOTBAR & INVENTORY SYSTEM
    // -------------------------------------------------------------
    const ITEMS = {
        HANDS: { id: 'hands', name: '맨손', icon: '✊', locked: true },
        FLASHLIGHT: { id: 'flashlight', name: '후레쉬', icon: '🔦' },
        PHONE: { id: 'phone', name: '핸드폰', icon: '📱' }
    };

    let hotbar = [
        { ...ITEMS.HANDS },
        { ...ITEMS.FLASHLIGHT },
        { ...ITEMS.PHONE }
    ];

    let inventory = [null, null, null, null, null, null];
    let activeHotbarIndex = 0;
    let dragSource = null;

    if (btnToggleInventoryEl) {
        btnToggleInventoryEl.addEventListener('click', () => {
            toggleInventory();
        });
    }

    function toggleInventory() {
        resetKeys();
        if (inventoryWindowEl) {
            inventoryWindowEl.classList.toggle('hidden');
        }
    }

    function setEquippedSlot(index) {
        if (index >= 0 && index < 3) {
            activeHotbarIndex = index;
            if (hotbar[activeHotbarIndex]?.id !== 'flashlight') {
                isFlashlightOn = false;
            }
            if (hotbar[activeHotbarIndex]?.id !== 'hands') {
                isBareHandsCharging = false;
                chargeHoldTimer = 0.0;
            }
            renderAllUI();
        }
    }

    function renderHotbar() {
        if (!hotbarGridEl) return;
        hotbarGridEl.innerHTML = '';
        hotbar.forEach((item, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = `item-slot ${index === activeHotbarIndex ? 'active' : ''} ${item && item.locked ? 'locked-slot' : ''}`;
            slotEl.dataset.container = 'hotbar';
            slotEl.dataset.index = index;

            const keyBadge = document.createElement('span');
            keyBadge.className = 'slot-key-badge';
            keyBadge.textContent = index + 1;
            slotEl.appendChild(keyBadge);

            if (item) {
                if (!item.locked) {
                    slotEl.setAttribute('draggable', 'true');
                }
                
                const iconEl = document.createElement('span');
                iconEl.className = 'item-icon';
                iconEl.textContent = item.icon;
                slotEl.appendChild(iconEl);

                const nameEl = document.createElement('span');
                nameEl.className = 'item-name-tag';
                nameEl.textContent = item.name;
                slotEl.appendChild(nameEl);
            }

            attachSlotEvents(slotEl, 'hotbar', index);
            hotbarGridEl.appendChild(slotEl);
        });

        updateSlot1ChargeOverlay();
    }

    function renderInventory() {
        if (!inventoryGridEl) return;
        inventoryGridEl.innerHTML = '';
        inventory.forEach((item, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = 'item-slot';
            slotEl.dataset.container = 'inventory';
            slotEl.dataset.index = index;

            if (item) {
                if (!item.locked) {
                    slotEl.setAttribute('draggable', 'true');
                }

                const iconEl = document.createElement('span');
                iconEl.className = 'item-icon';
                iconEl.textContent = item.icon;
                slotEl.appendChild(iconEl);

                const nameEl = document.createElement('span');
                nameEl.className = 'item-name-tag';
                nameEl.textContent = item.name;
                slotEl.appendChild(nameEl);
            }

            attachSlotEvents(slotEl, 'inventory', index);
            inventoryGridEl.appendChild(slotEl);
        });
    }

    function attachSlotEvents(slotEl, container, index) {
        slotEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const isInventoryOpen = inventoryWindowEl && !inventoryWindowEl.classList.contains('hidden');

            if (container === 'hotbar') {
                setEquippedSlot(index);
                const item = hotbar[index];
                if (isInventoryOpen && item && !item.locked) {
                    quickMoveItem('hotbar', index);
                }
            } else if (container === 'inventory') {
                const item = inventory[index];
                if (isInventoryOpen && item && !item.locked) {
                    quickMoveItem('inventory', index);
                }
            }
        });

        slotEl.addEventListener('dragstart', (e) => {
            const item = container === 'hotbar' ? hotbar[index] : inventory[index];
            if (!item || item.locked) {
                e.preventDefault();
                return;
            }
            dragSource = { container, index };
            slotEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        slotEl.addEventListener('dragend', () => {
            slotEl.classList.remove('dragging');
            document.querySelectorAll('.item-slot').forEach(s => s.classList.remove('drag-over'));
            dragSource = null;
        });

        slotEl.addEventListener('dragover', (e) => {
            if (container === 'hotbar' && index === 0) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            slotEl.classList.add('drag-over');
        });

        slotEl.addEventListener('dragleave', () => {
            slotEl.classList.remove('drag-over');
        });

        slotEl.addEventListener('drop', (e) => {
            e.preventDefault();
            slotEl.classList.remove('drag-over');
            if (!dragSource) return;

            if (container === 'hotbar' && index === 0) return;
            if (dragSource.container === 'hotbar' && dragSource.index === 0) return;

            swapItems(dragSource.container, dragSource.index, container, index);
            dragSource = null;
        });
    }

    function quickMoveItem(srcContainer, srcIndex) {
        if (srcContainer === 'hotbar') {
            if (srcIndex === 0) return;
            const item = hotbar[srcIndex];
            if (!item || item.locked) return;

            const emptyInvIndex = inventory.findIndex(slot => slot === null);
            if (emptyInvIndex !== -1) {
                inventory[emptyInvIndex] = item;
                hotbar[srcIndex] = null;
                if (activeHotbarIndex === srcIndex) {
                    isFlashlightOn = false;
                }
                renderAllUI();
            }
        } else if (srcContainer === 'inventory') {
            const item = inventory[srcIndex];
            if (!item || item.locked) return;

            const emptyHotbarIndex = hotbar.findIndex((slot, idx) => idx > 0 && slot === null);
            if (emptyHotbarIndex !== -1) {
                hotbar[emptyHotbarIndex] = item;
                inventory[srcIndex] = null;
                renderAllUI();
            }
        }
    }

    function swapItems(srcContainer, srcIdx, targetContainer, targetIdx) {
        if (srcContainer === targetContainer && srcIdx === targetIdx) return;
        if (srcContainer === 'hotbar' && srcIdx === 0) return;
        if (targetContainer === 'hotbar' && targetIdx === 0) return;

        let srcItem = srcContainer === 'hotbar' ? hotbar[srcIdx] : inventory[srcIdx];
        let targetItem = targetContainer === 'hotbar' ? hotbar[targetIdx] : inventory[targetIdx];

        if (srcContainer === 'hotbar') hotbar[srcIdx] = targetItem;
        else inventory[srcIdx] = targetItem;

        if (targetContainer === 'hotbar') hotbar[targetIdx] = srcItem;
        else inventory[targetIdx] = srcItem;

        renderAllUI();
    }

    function updatePhoneUIState() {
        if (!phoneScreenContainerEl) return;
        const equippedItem = hotbar[activeHotbarIndex];
        if (equippedItem && equippedItem.id === 'phone') {
            phoneScreenContainerEl.classList.remove('hidden');
        } else {
            phoneScreenContainerEl.classList.add('hidden');
        }
    }

    function renderAllUI() {
        renderHotbar();
        renderInventory();
        updateCamLockUI();
        updatePhoneUIState();
    }

    renderAllUI();
    render();
});
