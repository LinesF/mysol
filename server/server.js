require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const authRoutes = require('./routes/auth');
const GameRoom = require('./rooms/GameRoom');

const app = express();
const PORT = process.env.PORT || 3000;

// Express Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// Mount REST Auth Routes
app.use('/api/auth', authRoutes);

// Server Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        message: 'mysol 2D Pixel Game Server Running',
        timestamp: new Date().toISOString()
    });
});

// Create HTTP Server & WebSocket Instance
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const gameRoom = new GameRoom();

// WebSocket Connection Lifecycle
wss.on('connection', (ws) => {
    const socketId = Math.random().toString(36).substring(2, 9);
    let playerState = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'JOIN_ROOM') {
                playerState = gameRoom.addPlayer(socketId, data.userData || {});
                ws.send(JSON.stringify({ type: 'ROOM_JOINED', id: socketId, player: playerState }));
                broadcastGameState();
            } else if (data.type === 'UPDATE_STATE') {
                if (playerState) {
                    gameRoom.updatePlayerState(socketId, data.state);
                    broadcastGameState();
                }
            } else if (data.type === 'CHAT_MESSAGE') {
                if (playerState) {
                    gameRoom.updatePlayerState(socketId, {
                        speechBubble: {
                            text: data.text,
                            expiresAt: Date.now() + 5000
                        }
                    });
                    broadcastGameState();
                }
            }
        } catch (err) {
            console.error('WebSocket message parsing error:', err);
        }
    });

    ws.on('close', () => {
        gameRoom.removePlayer(socketId);
        broadcastGameState();
    });
});

function broadcastGameState() {
    const snapshot = gameRoom.getSnapshot();
    const payload = JSON.stringify({ type: 'GAME_STATE', players: snapshot });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 mysol 2D Pixel Game Server running on port ${PORT}`);
    console.log(`🌐 HTTP Auth & Static Server: http://localhost:${PORT}`);
    console.log(`⚡ WebSocket Multiplayer Endpoint: ws://localhost:${PORT}`);
    if (process.env.RESEND_API_KEY) {
        console.log(`✉️ Real Email API: Resend Enabled (Key: ${process.env.RESEND_API_KEY.slice(0, 8)}...)`);
    } else if (process.env.SMTP_USER) {
        console.log(`📧 Real Email SMTP Configured: [ ${process.env.SMTP_USER} ]`);
    } else {
        console.log(`💡 Real Email API: Not configured (Using Console Preview)`);
    }
    console.log(`======================================================\n`);
});
