// mysol 2D Pixel Game Engine - Step 1: 5x5 Grass Grid & Character Movement

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Canvas Sizing
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        updateMapBounds();
    });

    // 5x5 Grass Grid Configuration
    const GRID_SIZE = 5; // 5x5 Grid
    const TILE_SIZE = 64; // 64x64 Pixel Tiles
    const MAP_DIM = GRID_SIZE * TILE_SIZE; // 320x320 Pixels Total Map Size

    let mapStartX = 0;
    let mapStartY = 0;

    function updateMapBounds() {
        mapStartX = Math.floor((width - MAP_DIM) / 2);
        mapStartY = Math.floor((height - MAP_DIM) / 2);
    }
    updateMapBounds();

    // Player Character State
    const player = {
        // Start in center of the 5x5 map
        x: MAP_DIM / 2,
        y: MAP_DIM / 2,
        size: 32,
        speed: 2.5,
        direction: 'down', // 'up', 'down', 'left', 'right'
        isMoving: false,
        animFrame: 0,
        animTimer: 0
    };

    // Keyboard Input Handler
    const keys = {};

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = true;
        keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = false;
        keys[e.key] = false;
    });

    // Main Update Loop
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
            // Normalize diagonal movement speed
            if (dx !== 0 && dy !== 0) {
                dx *= 0.7071;
                dy *= 0.7071;
            }

            player.x += dx * player.speed;
            player.y += dy * player.speed;

            // Clamp player within 5x5 grass tilemap boundary
            const halfSize = player.size / 2;
            player.x = Math.max(halfSize + 4, Math.min(MAP_DIM - halfSize - 4, player.x));
            player.y = Math.max(halfSize + 4, Math.min(MAP_DIM - halfSize - 4, player.y));

            // Walking bounce animation
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

    // Render Loop
    function render() {
        ctx.clearRect(0, 0, width, height);

        // Ensure crisp 2D pixel art rendering
        ctx.imageSmoothingEnabled = false;

        ctx.save();
        ctx.translate(mapStartX, mapStartY);

        // 1. Draw 5x5 Grass Tile Map
        drawGrassTilemap();

        // 2. Draw Player Character
        drawPlayerCharacter();

        ctx.restore();

        update();
        requestAnimationFrame(render);
    }

    // Draw 5x5 Grass Tile Grid
    function drawGrassTilemap() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;

                // Alternate subtle green shades for checkered grass pattern
                const isEven = (row + col) % 2 === 0;
                ctx.fillStyle = isEven ? '#22c55e' : '#16a34a';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                // Pixel Grass Texture Details (Tufts & Blades)
                ctx.fillStyle = '#15803d';
                // Grass blade tuft 1
                ctx.fillRect(tx + 12, ty + 16, 4, 8);
                ctx.fillRect(tx + 8, ty + 20, 4, 4);
                // Grass blade tuft 2
                ctx.fillRect(tx + 40, ty + 36, 4, 8);
                ctx.fillRect(tx + 44, ty + 32, 4, 4);

                // Lighter highlight pixels
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(tx + 16, ty + 12, 4, 4);
                ctx.fillRect(tx + 36, ty + 40, 4, 4);
            }
        }

        // Earth / Dirt Border Frame around the 5x5 Grid
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, MAP_DIM, MAP_DIM);

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.strokeRect(-3, -3, MAP_DIM + 6, MAP_DIM + 6);
    }

    // Draw 2D Retro Pixel Character
    function drawPlayerCharacter() {
        const px = player.x;
        const py = player.y;

        // Bounce offset for walking animation
        const bounceY = (player.isMoving && (player.animFrame % 2 === 1)) ? -2 : 0;

        ctx.save();
        ctx.translate(px, py + bounceY);

        // 1. Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Character Body (Pixel Art Composition)
        // Boots
        ctx.fillStyle = '#334155';
        ctx.fillRect(-10, 8, 8, 6);
        ctx.fillRect(2, 8, 8, 6);

        // Tunic / Shirt (Cyan/Blue)
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-12, -6, 24, 15);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-10, -6, 20, 4);

        // Head / Skin
        ctx.fillStyle = '#fde047'; // Hair / Cap (Gold)
        ctx.fillRect(-14, -22, 28, 10);

        ctx.fillStyle = '#fed7aa'; // Face Skin
        ctx.fillRect(-12, -14, 24, 10);

        // Eyes (Based on Direction)
        ctx.fillStyle = '#0f172a';
        if (player.direction === 'down') {
            ctx.fillRect(-6, -11, 4, 4);
            ctx.fillRect(2, -11, 4, 4);
        } else if (player.direction === 'up') {
            // Hair covers back of head
            ctx.fillStyle = '#eab308';
            ctx.fillRect(-12, -14, 24, 10);
        } else if (player.direction === 'left') {
            ctx.fillRect(-8, -11, 4, 4);
        } else if (player.direction === 'right') {
            ctx.fillRect(4, -11, 4, 4);
        }

        ctx.restore();
    }

    // Start 60fps Game Loop
    render();
});
