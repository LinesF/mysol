// mysol 2D Pixel Game Engine - Fixed Keyboard & Chat Input Execution Order

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. ALL DOM ELEMENTS (DECLARED AT TOP TO PREVENT REFERENCE ERRORS)
    // -------------------------------------------------------------
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const chatInputEl = document.getElementById('chat-input');
    const chatCharCountEl = document.getElementById('chat-char-count');
    const hotbarGridEl = document.getElementById('hotbar-grid');
    const inventoryGridEl = document.getElementById('inventory-grid');
    const inventoryWindowEl = document.getElementById('inventory-window');
    const btnToggleInventoryEl = document.getElementById('btn-toggle-inventory');

    // -------------------------------------------------------------
    // 2. CANVAS & 2D PIXEL GAME ENGINE
    // -------------------------------------------------------------
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        updateMapBounds();
    });

    const GRID_SIZE = 5;
    const TILE_SIZE = 64;
    const MAP_DIM = GRID_SIZE * TILE_SIZE; // 320x320 Pixels

    let mapStartX = 0;
    let mapStartY = 0;

    function updateMapBounds() {
        mapStartX = Math.floor((width - MAP_DIM) / 2);
        mapStartY = Math.floor((height - MAP_DIM) / 2);
    }
    updateMapBounds();

    const player = {
        x: MAP_DIM / 2,
        y: MAP_DIM / 2,
        size: 32,
        speed: 2.5,
        direction: 'down',
        isMoving: false,
        animFrame: 0,
        animTimer: 0
    };

    // Active Speech Bubble State
    // Duration rules: 1~10 chars -> 4.5s, 11~15 chars -> 6s, 16~20 chars -> 7.5s
    let activeSpeechBubble = null;

    const keys = {};

    // Keyboard Event Listener
    window.addEventListener('keydown', (e) => {
        // 1. Enter Key for Chat Input
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatEnterKey();
            return;
        }

        // 2. Disable movement and shortcuts if user is typing in chat input
        if (document.activeElement === chatInputEl) {
            return;
        }

        // 3. Tab Key for Inventory Toggle
        if (e.key === 'Tab') {
            e.preventDefault();
            toggleInventory();
            return;
        }

        // 4. Hotbar Number Keys (1, 2, 3)
        if (e.key === '1') setEquippedSlot(0);
        if (e.key === '2') setEquippedSlot(1);
        if (e.key === '3') setEquippedSlot(2);

        const key = e.key.toLowerCase();
        keys[key] = true;
        keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        if (document.activeElement === chatInputEl) return;
        const key = e.key.toLowerCase();
        keys[key] = false;
        keys[e.key] = false;
    });

    function update() {
        // Stop movement if typing in chat
        if (document.activeElement === chatInputEl) {
            player.isMoving = false;
            player.animFrame = 0;
            player.animTimer = 0;
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

        // Update Speech Bubble Timer
        if (activeSpeechBubble) {
            activeSpeechBubble.remainingTime -= 1 / 60;
            if (activeSpeechBubble.remainingTime <= 0) {
                activeSpeechBubble = null;
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;

        ctx.save();
        ctx.translate(mapStartX, mapStartY);

        drawGrassTilemap();
        drawPlayerCharacter();

        // Draw Speech Bubble Above Player Head
        if (activeSpeechBubble) {
            drawSpeechBubble(activeSpeechBubble);
        }

        ctx.restore();

        update();
        requestAnimationFrame(render);
    }

    function drawGrassTilemap() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;

                const isEven = (row + col) % 2 === 0;
                ctx.fillStyle = isEven ? '#22c55e' : '#16a34a';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                ctx.fillStyle = '#15803d';
                ctx.fillRect(tx + 12, ty + 16, 4, 8);
                ctx.fillRect(tx + 8, ty + 20, 4, 4);
                ctx.fillRect(tx + 40, ty + 36, 4, 8);
                ctx.fillRect(tx + 44, ty + 32, 4, 4);

                ctx.fillStyle = '#4ade80';
                ctx.fillRect(tx + 16, ty + 12, 4, 4);
                ctx.fillRect(tx + 36, ty + 40, 4, 4);
            }
        }

        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, MAP_DIM, MAP_DIM);

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.strokeRect(-3, -3, MAP_DIM + 6, MAP_DIM + 6);
    }

    function drawPlayerCharacter() {
        const px = player.x;
        const py = player.y;

        const bounceY = (player.isMoving && (player.animFrame % 2 === 1)) ? -2 : 0;

        ctx.save();
        ctx.translate(px, py + bounceY);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.fillRect(-10, 8, 8, 6);
        ctx.fillRect(2, 8, 8, 6);

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-12, -6, 24, 15);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-10, -6, 20, 4);

        ctx.fillStyle = '#fde047';
        ctx.fillRect(-14, -22, 28, 10);

        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(-12, -14, 24, 10);

        ctx.fillStyle = '#0f172a';
        if (player.direction === 'down') {
            ctx.fillRect(-6, -11, 4, 4);
            ctx.fillRect(2, -11, 4, 4);
        } else if (player.direction === 'up') {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(-12, -14, 24, 10);
        } else if (player.direction === 'left') {
            ctx.fillRect(-8, -11, 4, 4);
        } else if (player.direction === 'right') {
            ctx.fillRect(4, -11, 4, 4);
        }

        ctx.restore();
    }

    // Draw Retro Speech Bubble Above Character Head
    function drawSpeechBubble(bubble) {
        const px = player.x;
        const py = player.y - 34;

        ctx.save();
        ctx.font = "600 0.8rem 'Inter', sans-serif";

        const textMetrics = ctx.measureText(bubble.text);
        const textWidth = textMetrics.width;
        const paddingX = 12;
        const paddingY = 6;
        const bubbleW = textWidth + paddingX * 2;
        const bubbleH = 26;
        const bx = px - bubbleW / 2;
        const by = py - bubbleH - 8;

        let alpha = 1.0;
        if (bubble.remainingTime < 0.5) {
            alpha = bubble.remainingTime / 0.5;
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Bubble Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(bx + 2, by + 2, bubbleW, bubbleH, 10);
        ctx.fill();

        // Bubble Fill
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(bx, by, bubbleW, bubbleH, 10);
        ctx.fill();

        // Bubble Border
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pointer Tail Down to Head
        ctx.beginPath();
        ctx.moveTo(px - 5, by + bubbleH);
        ctx.lineTo(px, by + bubbleH + 6);
        ctx.lineTo(px + 5, by + bubbleH);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Speech Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bubble.text, px, by + bubbleH / 2);

        ctx.restore();
    }

    render();

    // -------------------------------------------------------------
    // 3. CHAT INPUT & SPEECH BUBBLE LOGIC
    // -------------------------------------------------------------
    chatInputEl.addEventListener('input', () => {
        if (chatInputEl.value.length > 20) {
            chatInputEl.value = chatInputEl.value.slice(0, 20);
        }
        chatCharCountEl.textContent = `${chatInputEl.value.length}/20`;
    });

    function handleChatEnterKey() {
        if (document.activeElement !== chatInputEl) {
            // Focus chat input field
            chatInputEl.focus();
        } else {
            // Already in chat input -> Submit message if not empty
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
                chatCharCountEl.textContent = '0/20';
            }
            chatInputEl.blur();
        }
    }

    // -------------------------------------------------------------
    // 4. HOTBAR & INVENTORY SYSTEM
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

    btnToggleInventoryEl.addEventListener('click', () => {
        toggleInventory();
    });

    function toggleInventory() {
        inventoryWindowEl.classList.toggle('hidden');
    }

    function setEquippedSlot(index) {
        if (index >= 0 && index < 3) {
            activeHotbarIndex = index;
            renderHotbar();
        }
    }

    function renderHotbar() {
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
});
