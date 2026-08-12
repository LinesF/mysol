// mysol 2D Pixel Game - Real-Time WebSocket Multiplayer Room Handler

class GameRoom {
    constructor() {
        this.players = new Map(); // Stores player states by socket ID
    }

    addPlayer(socketId, userData) {
        const playerState = {
            id: socketId,
            username: userData.username || `Player_${socketId.slice(0, 4)}`,
            avatar: userData.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${socketId}`,
            x: 400,
            y: 480,
            direction: 'down',
            isMoving: false,
            isSprinting: false,
            isDashing: false,
            isFlashlightOn: false,
            speechBubble: null
        };

        this.players.set(socketId, playerState);
        console.log(`[MULTIPLAYER] Player joined: ${playerState.username} (${socketId})`);
        return playerState;
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            console.log(`[MULTIPLAYER] Player left: ${player.username} (${socketId})`);
            this.players.delete(socketId);
        }
    }

    updatePlayerState(socketId, stateUpdate) {
        const player = this.players.get(socketId);
        if (player) {
            Object.assign(player, stateUpdate);
        }
    }

    getSnapshot() {
        return Array.from(this.players.values());
    }
}

module.exports = GameRoom;
