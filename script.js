// mysol 2D Pixel Game Engine - Step 2: Hotbar, Inventory (Tab/Button), Quick Move & Drag-Drop System

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. CANVAS & 2D PIXEL GAME ENGINE
    // -------------------------------------------------------------
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

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

    const keys = {};

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        // Prevent Tab key default focus navigation
        if (e.key === 'Tab') {
            e.preventDefault();
            toggleInventory();
            return;
        }

        // Hotbar Key Select (1, 2, 3)
        if (e.key === '1') setEquippedSlot(0);
        if (e.key === '2') setEquippedSlot(1);
        if (e.key === '3') setEquippedSlot(2);

        keys[key] = true;
        keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = false;
        keys[e.key] = false;
    });

    function update() {
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
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;

        ctx.save();
        ctx.translate(mapStartX, mapStartY);

        drawGrassTilemap();
        drawPlayerCharacter();

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

    render();

    // -------------------------------------------------------------
    // 2. HOTBAR & INVENTORY SYSTEM (3 HOTBAR SLOTS + 3x2 INVENTORY)
    // -------------------------------------------------------------

    // Items Data
    const ITEMS = {
        HANDS: { id: 'hands', name: '맨손', icon: '✊' },
        FLASHLIGHT: { id: 'flashlight', name: '후레쉬', icon: '🔦' },
        PHONE: { id: 'phone', name: '핸드폰', icon: '📱' }
    };

    // Hotbar Array (3 Slots)
    let hotbar = [
        { ...ITEMS.HANDS },
        { ...ITEMS.FLASHLIGHT },
        { ...ITEMS.PHONE }
    ];

    // Inventory Array (6 Slots: 3 cols x 2 rows)
    let inventory = [null, null, null, null, null, null];

    // Currently equipped hotbar slot index (0, 1, 2)
    let activeHotbarIndex = 0;

    // Drag & Drop Source Tracker
    let dragSource = null; // { container: 'hotbar'|'inventory', index: number }

    // DOM Elements
    const hotbarGridEl = document.getElementById('hotbar-grid');
    const inventoryGridEl = document.getElementById('inventory-grid');
    const inventoryWindowEl = document.getElementById('inventory-window');
    const btnToggleInventoryEl = document.getElementById('btn-toggle-inventory');

    // Initialize Inventory Toggle Button
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

    // Render Hotbar Slots
    function renderHotbar() {
        hotbarGridEl.innerHTML = '';
        hotbar.forEach((item, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = `item-slot ${index === activeHotbarIndex ? 'active' : ''}`;
            slotEl.dataset.container = 'hotbar';
            slotEl.dataset.index = index;

            // Slot Key Badge (1, 2, 3)
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

    // Render Inventory Slots
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

    // Attach Click (Quick Move) & Drag/Drop Events to Slots
    function attachSlotEvents(slotEl, container, index) {
        // 1. Quick Move on Click
        slotEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (container === 'hotbar') {
                // If hotbar slot clicked, select it as active slot
                setEquippedSlot(index);
                // Quick move to inventory if item exists
                if (hotbar[index]) {
                    quickMoveItem('hotbar', index);
                }
            } else if (container === 'inventory') {
                // Quick move from inventory to hotbar
                if (inventory[index]) {
                    quickMoveItem('inventory', index);
                }
            }
        });

        // 2. Drag & Drop Handlers
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

            const targetContainer = container;
            const targetIndex = index;

            swapItems(dragSource.container, dragSource.index, targetContainer, targetIndex);
            dragSource = null;
        });
    }

    // Quick Move Logic (Hotbar <-> Inventory)
    function quickMoveItem(srcContainer, srcIndex) {
        if (srcContainer === 'hotbar') {
            const item = hotbar[srcIndex];
            if (!item) return;

            // Find first empty slot in inventory
            const emptyInvIndex = inventory.findIndex(slot => slot === null);
            if (emptyInvIndex !== -1) {
                inventory[emptyInvIndex] = item;
                hotbar[srcIndex] = null;
                renderAllUI();
            }
        } else if (srcContainer === 'inventory') {
            const item = inventory[srcIndex];
            if (!item) return;

            // Find first empty slot in hotbar
            const emptyHotbarIndex = hotbar.findIndex(slot => slot === null);
            if (emptyHotbarIndex !== -1) {
                hotbar[emptyHotbarIndex] = item;
                inventory[srcIndex] = null;
                renderAllUI();
            }
        }
    }

    // Swap / Move Items between any two slots
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

    // Initial UI Render
    renderAllUI();
});
