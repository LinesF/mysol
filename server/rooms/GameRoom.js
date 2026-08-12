// mysol 2D Pixel Game - Multi-Room Real-Time Multiplayer Room Manager with Global Lobby Support

class Room {
    constructor(code, name, hostSocketId, isPrivate = false, password = '') {
        this.code = code; // e.g. "#8492" or "#0000"
        this.name = name || '생존자의 방';
        this.hostSocketId = hostSocketId;
        this.isPrivate = isPrivate;
        this.password = password ? password.trim() : '';
        this.maxPlayers = 4;
        this.players = new Map(); // socketId -> playerState
        this.createdAt = Date.now();
    }

    addPlayer(socketId, userData) {
        const playerState = {
            id: socketId,
            username: userData.username || `Player_${socketId.slice(0, 4)}`,
            avatar: userData.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${socketId}`,
            x: 400 + (Math.random() * 80 - 40),
            y: 480 + (Math.random() * 80 - 40),
            direction: 'down',
            isMoving: false,
            isSprinting: false,
            isDashing: false,
            isFlashlightOn: false,
            flashlightAngle: 0,
            animFrame: 0
        };

        this.players.set(socketId, playerState);
        return playerState;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
    }

    getSnapshot() {
        return Array.from(this.players.values());
    }

    getInfo() {
        return {
            code: this.code,
            name: this.name,
            isPrivate: this.isPrivate,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            hasPassword: !!this.password,
            password: this.isPrivate ? this.password : '공개 방',
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                username: p.username,
                avatar: p.avatar,
                isHost: p.id === this.hostSocketId
            }))
        };
    }
}

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomCode -> Room
        this.playerRoomMap = new Map(); // socketId -> roomCode

        // Create permanent Global Lobby Room #0000
        const lobbyRoom = new Room('#0000', '대기실 (Lobby)', 'system', false, '');
        lobbyRoom.maxPlayers = 50;
        this.rooms.set('#0000', lobbyRoom);
    }

    generateCode() {
        let code;
        do {
            const num = Math.floor(1000 + Math.random() * 9000);
            code = `#${num}`;
        } while (this.rooms.has(code));
        return code;
    }

    joinLobby(socketId, userData) {
        this.leaveRoom(socketId, false);
        const lobby = this.rooms.get('#0000');
        lobby.addPlayer(socketId, userData);
        this.playerRoomMap.set(socketId, '#0000');
        console.log(`[ROOM_MANAGER] Player ${userData.username || socketId} entered Global Lobby #0000`);
        return lobby;
    }

    createRoom(hostSocketId, userData, name, isPrivate = false, password = '') {
        this.leaveRoom(hostSocketId, false);

        const code = this.generateCode();
        const room = new Room(code, name, hostSocketId, isPrivate, password);
        room.addPlayer(hostSocketId, userData);

        this.rooms.set(code, room);
        this.playerRoomMap.set(hostSocketId, code);

        console.log(`[ROOM_MANAGER] Room created: ${code} ("${room.name}") by ${userData.username}`);
        return room;
    }

    getPublicRooms() {
        const publicRooms = [];
        for (const room of this.rooms.values()) {
            if (room.code !== '#0000' && !room.isPrivate && room.players.size < room.maxPlayers) {
                publicRooms.push(room.getInfo());
            }
        }
        return publicRooms;
    }

    joinRoomByCode(socketId, userData, inputCode, inputPassword = '') {
        let formattedCode = (inputCode || '').trim();
        if (!formattedCode.startsWith('#')) {
            formattedCode = `#${formattedCode}`;
        }

        const room = this.rooms.get(formattedCode);
        if (!room) {
            return { success: false, message: '존재하지 않는 방 번호입니다.' };
        }

        if (room.players.size >= room.maxPlayers) {
            return { success: false, message: '방 정원이 초과되었습니다 (최대 4명).' };
        }

        if (room.isPrivate) {
            if (room.password && room.password !== (inputPassword || '').trim()) {
                return { success: false, message: '방 비밀번호가 일치하지 않습니다.' };
            }
        }

        this.leaveRoom(socketId, false);
        room.addPlayer(socketId, userData);
        this.playerRoomMap.set(socketId, room.code);

        console.log(`[ROOM_MANAGER] Player ${userData.username} joined room ${room.code}`);
        return { success: true, room };
    }

    quickJoin(socketId, userData) {
        const publicRooms = Array.from(this.rooms.values()).filter(r => r.code !== '#0000' && !r.isPrivate && r.players.size < r.maxPlayers);

        if (publicRooms.length > 0) {
            const targetRoom = publicRooms[0];
            return this.joinRoomByCode(socketId, userData, targetRoom.code);
        } else {
            const room = this.createRoom(socketId, userData, `${userData.username}의 방`, false, '');
            return { success: true, room };
        }
    }

    leaveRoom(socketId, autoReturnToLobby = true) {
        const roomCode = this.playerRoomMap.get(socketId);
        if (!roomCode) return null;

        const room = this.rooms.get(roomCode);
        if (room) {
            room.removePlayer(socketId);
            this.playerRoomMap.delete(socketId);

            console.log(`[ROOM_MANAGER] Player ${socketId} left room ${roomCode}`);

            if (roomCode !== '#0000') {
                if (room.players.size === 0) {
                    this.rooms.delete(roomCode);
                    console.log(`[ROOM_MANAGER] Empty room deleted: ${roomCode}`);
                } else if (room.hostSocketId === socketId) {
                    const nextHostId = room.players.keys().next().value;
                    room.hostSocketId = nextHostId;
                }
            }
        }

        if (autoReturnToLobby && roomCode !== '#0000') {
            const lobby = this.rooms.get('#0000');
            lobby.addPlayer(socketId, { username: 'Player' });
            this.playerRoomMap.set(socketId, '#0000');
            return '#0000';
        }

        return roomCode;
    }

    getPlayerRoom(socketId) {
        const roomCode = this.playerRoomMap.get(socketId);
        return roomCode ? this.rooms.get(roomCode) : null;
    }
}

module.exports = { GameRoom: RoomManager, Room };
