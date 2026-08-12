require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const authRoutes = require('./routes/auth');
const { GameRoom } = require('./rooms/GameRoom');

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
const roomManager = new GameRoom();

// WebSocket Connection Lifecycle
wss.on('connection', (ws) => {
    const socketId = Math.random().toString(36).substring(2, 9);
    ws.socketId = socketId;
    let currentUserData = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'JOIN_LOBBY') {
                currentUserData = data.userData || { username: 'Player' };
                const lobby = roomManager.joinLobby(socketId, currentUserData);

                ws.send(JSON.stringify({
                    type: 'ROOM_JOINED',
                    id: socketId,
                    roomInfo: lobby.getInfo()
                }));
                broadcastRoomState(lobby);

            } else if (data.type === 'GET_ROOM_LIST') {
                ws.send(JSON.stringify({
                    type: 'PUBLIC_ROOM_LIST',
                    rooms: roomManager.getPublicRooms()
                }));

            } else if (data.type === 'CREATE_ROOM') {
                currentUserData = data.userData || currentUserData || { username: 'Player' };
                const room = roomManager.createRoom(
                    socketId,
                    currentUserData,
                    data.name,
                    data.isPrivate,
                    data.password
                );

                ws.send(JSON.stringify({
                    type: 'ROOM_JOINED',
                    id: socketId,
                    roomInfo: room.getInfo()
                }));
                broadcastRoomState(room);

            } else if (data.type === 'JOIN_ROOM_BY_CODE') {
                currentUserData = data.userData || currentUserData || { username: 'Player' };
                const result = roomManager.joinRoomByCode(
                    socketId,
                    currentUserData,
                    data.code,
                    data.password
                );

                if (result.success) {
                    ws.send(JSON.stringify({
                        type: 'ROOM_JOINED',
                        id: socketId,
                        roomInfo: result.room.getInfo()
                    }));
                    broadcastRoomState(result.room);
                } else {
                    ws.send(JSON.stringify({
                        type: 'ROOM_ERROR',
                        message: result.message
                    }));
                }

            } else if (data.type === 'QUICK_JOIN') {
                currentUserData = data.userData || currentUserData || { username: 'Player' };
                const result = roomManager.quickJoin(socketId, currentUserData);

                if (result.success) {
                    ws.send(JSON.stringify({
                        type: 'ROOM_JOINED',
                        id: socketId,
                        roomInfo: result.room.getInfo()
                    }));
                    broadcastRoomState(result.room);
                } else {
                    ws.send(JSON.stringify({
                        type: 'ROOM_ERROR',
                        message: result.message
                    }));
                }

            } else if (data.type === 'LEAVE_ROOM') {
                const prevRoomCode = roomManager.playerRoomMap.get(socketId);
                const newRoomCode = roomManager.leaveRoom(socketId, true);

                if (prevRoomCode && prevRoomCode !== '#0000') {
                    const prevRoom = roomManager.rooms.get(prevRoomCode);
                    if (prevRoom) broadcastRoomState(prevRoom);
                }

                const lobby = roomManager.rooms.get('#0000');
                ws.send(JSON.stringify({
                    type: 'ROOM_LEFT',
                    id: socketId,
                    roomInfo: lobby.getInfo()
                }));
                broadcastRoomState(lobby);

            } else if (data.type === 'UPDATE_STATE') {
                const room = roomManager.getPlayerRoom(socketId);
                if (room) {
                    const player = room.players.get(socketId);
                    if (player) {
                        Object.assign(player, data.state);
                        broadcastRoomState(room);
                    }
                }

            } else if (data.type === 'CHAT_MESSAGE') {
                const room = roomManager.getPlayerRoom(socketId);
                if (room) {
                    const player = room.players.get(socketId);
                    if (player) {
                        player.speechBubble = {
                            text: data.text,
                            expiresAt: Date.now() + 5000
                        };
                        broadcastRoomState(room);
                    }
                }
            }
        } catch (err) {
            console.error('WebSocket message parsing error:', err);
        }
    });

    ws.on('close', () => {
        const roomCode = roomManager.playerRoomMap.get(socketId);
        roomManager.leaveRoom(socketId, false);
        if (roomCode) {
            const room = roomManager.rooms.get(roomCode);
            if (room) broadcastRoomState(room);
        }
    });
});

function broadcastRoomState(room) {
    if (!room) return;
    const snapshot = room.getSnapshot();
    const info = room.getInfo();
    const payload = JSON.stringify({
        type: 'GAME_STATE',
        roomInfo: info,
        players: snapshot
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && room.players.has(client.socketId)) {
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
