// mysol 2D Pixel Game Engine - Expanded 10x10 Tilemap System

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

    const GRID_SIZE = 10; // Expanded to 10x10 Grid (100 Tiles Total)
    const TILE_SIZE = 80;  // 80x80 Pixel Tiles
    const MAP_DIM = GRID_SIZE * TILE_SIZE; // 800x800 Total Map Size

    let mapStartX = 100;
    let mapStartY = 100;

    function resizeCanvas() {
        width = canvas.width = maskCanvas.width = window.innerWidth || document.documentElement.clientWidth || 800;
        height = canvas.height = maskCanvas.height = window.innerHeight || document.documentElement.clientHeight || 600;
        
        mapStartX = Math.max(20, Math.floor((width - MAP_DIM) / 2));
        mapStartY = Math.max(70, Math.floor((height - MAP_DIM) / 2));
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Player position starts in the center of the expanded 10x10 map
    const player = {
        x: MAP_DIM / 2,
        y: MAP_DIM / 2 + 80, // Start slightly below the center campfire
        size: 36,
        speed: 3.5,
        direction: 'down',
        isMoving: false,
        animFrame: 0,
        animTimer: 0
    };

    // Campfire position at exact center of 10x10 map
    const campfire = {
        x: MAP_DIM / 2,
        y: MAP_DIM / 2,
        flickerTimer: 0
    };

    let activeSpeechBubble = null;
    const keys = {};

    function resetKeys() {
        for (let k in keys) {
            keys[k] = false;
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatEnterKey();
            return;
        }

        if (chatInputEl && document.activeElement === chatInputEl) {
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

        const key = e.key.toLowerCase();
        keys[key] = true;
        keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = false;
        keys[e.key] = false;
    });

    window.addEventListener('blur', resetKeys);
    if (chatInputEl) {
        chatInputEl.addEventListener('focus', resetKeys);
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

        let dx = 0;
        let dy = 0;

        if (keys['arrowleft'] || keys['a']) {
            dx -= 1;
            player.direction = 'left';
        }
        if (keys['arrowright'] || keys['d']) {
            dx += 1;
            player.direction = 'right';
        }
        if (keys['arrowup'] || keys['w']) {
            dy -= 1;
            player.direction = 'up';
        }
        if (keys['arrowdown'] || keys['s']) {
            dy += 1;
            player.direction = 'down';
        }

        player.isMoving = (dx !== 0 || dy !== 0);

        if (player.isMoving) {
            if (dx !== 0 && dy !== 0) {
                dx *= 0.7071;
                dy *= 0.7071;
            }

            player.x += dx * player.speed;
            player.y += dy * player.speed;

            // Clamp player within the expanded 10x10 tilemap boundary (800x800px)
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

        // Update campfire flame flicker
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
            // 1. Fill Canvas Background with Dark Slate Color
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = false;

            // 2. Draw World Elements on Main Canvas
            ctx.save();
            ctx.translate(mapStartX, mapStartY);

            drawGrassTilemap();
            drawCampfire();
            drawPlayerCharacter();

            if (activeSpeechBubble) {
                drawSpeechBubble(activeSpeechBubble);
            }

            ctx.restore();

            // 3. Draw Dynamic Ambient Lighting Mask (Player + Campfire Light Cutouts)
            drawLightingOverlay();

            update();
        } catch (err) {
            console.error('Render loop error:', err);
        }

        requestAnimationFrame(render);
    }

    // Draw Expanded 10x10 Checkered Grass Map (800x800px)
    function drawGrassTilemap() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;

                const isEven = (row + col) % 2 === 0;
                ctx.fillStyle = isEven ? '#4ade80' : '#22c55e';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                // Grass Blades
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(tx + 14, ty + 20, 5, 10);
                ctx.fillRect(tx + 9, ty + 25, 5, 5);
                ctx.fillRect(tx + 48, ty + 44, 5, 10);
                ctx.fillRect(tx + 53, ty + 39, 5, 5);

                // Highlights
                ctx.fillStyle = '#86efac';
                ctx.fillRect(tx + 19, ty + 15, 5, 5);
                ctx.fillRect(tx + 43, ty + 49, 5, 5);
            }
        }

        // Golden Outer Border Frame around the 10x10 Grid
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, MAP_DIM, MAP_DIM);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.strokeRect(-4, -4, MAP_DIM + 8, MAP_DIM + 8);
    }

    // Draw 2D Pixel Animated Campfire at Center of 10x10 Map
    function drawCampfire() {
        const cx = campfire.x;
        const cy = campfire.y;
        const flicker = Math.sin(campfire.flickerTimer) * 3;

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Stone Ring Base
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

        // 2. Crossed Wooden Logs
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

        // 3. Pixel Flames
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

    // Draw 2D Pixel Character
    function drawPlayerCharacter() {
        const px = player.x;
        const py = player.y;

        const bounceY = (player.isMoving && (player.animFrame % 2 === 1)) ? -3 : 0;

        ctx.save();
        ctx.translate(px, py + bounceY);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boots
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, 10, 10, 8);
        ctx.fillRect(2, 10, 10, 8);

        // Tunic / Body
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-14, -6, 28, 18);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-12, -6, 24, 5);

        // Hair (Gold)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-16, -24, 32, 12);

        // Face Skin
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(-14, -14, 28, 12);

        // Eyes
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

    // Draw Character Speech Bubble
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

    // -------------------------------------------------------------
    // OFFSCREEN CANVAS LIGHTING OVERLAY ENGINE (10x10 Map Scale)
    // -------------------------------------------------------------
    function drawLightingOverlay() {
        try {
            if (!maskCtx) return;

            const px = mapStartX + player.x;
            const py = mapStartY + player.y;

            const cx = mapStartX + campfire.x;
            const cy = mapStartY + campfire.y;

            const tile6 = 6 * TILE_SIZE; // 480px (6 tiles max dark boundary)
            const flickerRadius = Math.sin(campfire.flickerTimer * 1.5) * 6;
            const campfireLightRadius = tile6 + flickerRadius;

            // 1. Clear offscreen mask canvas
            maskCtx.clearRect(0, 0, width, height);

            // 2. Fill offscreen mask canvas with ambient darkness (94% darkness)
            maskCtx.fillStyle = 'rgba(11, 14, 23, 0.94)';
            maskCtx.fillRect(0, 0, width, height);

            // 3. Cut out light holes in darkness layer using destination-out
            maskCtx.globalCompositeOperation = 'destination-out';

            // --- Light Source 1: Player Character ---
            const playerGrad = maskCtx.createRadialGradient(px, py, 15, px, py, tile6);
            playerGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');     // Center: 85% light cutout
            playerGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.45)');  // 3 tiles: 45% light cutout
            playerGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');   // 5 tiles: 10% light cutout
            playerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');    // 6+ tiles: 0% cutout

            maskCtx.fillStyle = playerGrad;
            maskCtx.beginPath();
            maskCtx.arc(px, py, tile6, 0, Math.PI * 2);
            maskCtx.fill();

            // --- Light Source 2: Center Campfire ---
            const fireGrad = maskCtx.createRadialGradient(cx, cy, 15, cx, cy, campfireLightRadius);
            fireGrad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');     // Center: 92% light cutout
            fireGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.5)');    // 3 tiles: 50% light cutout
            fireGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.12)');  // 5 tiles: 12% light cutout
            fireGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');    // 6+ tiles: 0% cutout

            maskCtx.fillStyle = fireGrad;
            maskCtx.beginPath();
            maskCtx.arc(cx, cy, campfireLightRadius, 0, Math.PI * 2);
            maskCtx.fill();

            // Reset mask composite mode
            maskCtx.globalCompositeOperation = 'source-over';

            // 4. Draw darkness mask onto main game canvas
            ctx.drawImage(maskCanvas, 0, 0);

            // 5. Draw warm golden/orange campfire glow overlay on main canvas
            ctx.save();
            const warmGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 260 + flickerRadius);
            warmGlow.addColorStop(0, 'rgba(249, 115, 22, 0.32)');  // Cozy warm orange core
            warmGlow.addColorStop(0.4, 'rgba(251, 191, 36, 0.16)'); // Golden warmth
            warmGlow.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');  // Soft fade out

            ctx.fillStyle = warmGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, 260 + flickerRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

        } catch (err) {
            console.error('Lighting overlay error:', err);
        }
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
        HANDS: { id: 'hands', name: '맨손', icon: '✊' },
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
            renderHotbar();
        }
    }

    function renderHotbar() {
        if (!hotbarGridEl) return;
        hotbarGridEl.innerHTML = '';
        hotbar.forEach((item, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = `item-slot ${index === activeHotbarIndex ? 'active' : ''}`;
            slotEl.dataset.container = 'hotbar';
            slotEl.dataset.index = index;

            const keyBadge = document.createElement('span');
            keyBadge.className = 'slot-key-badge';
            keyBadge.textContent = index + 1;
            slotEl.appendChild(keyBadge);

            if (item) {
                slotEl.setAttribute('draggable', 'true');
                
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
                slotEl.setAttribute('draggable', 'true');

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
            if (container === 'hotbar') {
                setEquippedSlot(index);
                if (hotbar[index]) {
                    quickMoveItem('hotbar', index);
                }
            } else if (container === 'inventory') {
                if (inventory[index]) {
                    quickMoveItem('inventory', index);
                }
            }
        });

        slotEl.addEventListener('dragstart', (e) => {
            const item = container === 'hotbar' ? hotbar[index] : inventory[index];
            if (!item) {
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

            swapItems(dragSource.container, dragSource.index, container, index);
            dragSource = null;
        });
    }

    function quickMoveItem(srcContainer, srcIndex) {
        if (srcContainer === 'hotbar') {
            const item = hotbar[srcIndex];
            if (!item) return;

            const emptyInvIndex = inventory.findIndex(slot => slot === null);
            if (emptyInvIndex !== -1) {
                inventory[emptyInvIndex] = item;
                hotbar[srcIndex] = null;
                renderAllUI();
            }
        } else if (srcContainer === 'inventory') {
            const item = inventory[srcIndex];
            if (!item) return;

            const emptyHotbarIndex = hotbar.findIndex(slot => slot === null);
            if (emptyHotbarIndex !== -1) {
                hotbar[emptyHotbarIndex] = item;
                inventory[srcIndex] = null;
                renderAllUI();
            }
        }
    }

    function swapItems(srcContainer, srcIdx, targetContainer, targetIdx) {
        if (srcContainer === targetContainer && srcIdx === targetIdx) return;

        let srcItem = srcContainer === 'hotbar' ? hotbar[srcIdx] : inventory[srcIdx];
        let targetItem = targetContainer === 'hotbar' ? hotbar[targetIdx] : inventory[targetIdx];

        if (srcContainer === 'hotbar') hotbar[srcIdx] = targetItem;
        else inventory[srcIdx] = targetItem;

        if (targetContainer === 'hotbar') hotbar[targetIdx] = srcItem;
        else inventory[targetIdx] = srcItem;

        renderAllUI();
    }

    function renderAllUI() {
        renderHotbar();
        renderInventory();
    }

    renderAllUI();
    render();
});
