const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mysol_db.json');

// Initialize database file if not present
function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        const defaultData = {
            users: {},
            verificationCodes: {}
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
    }
}

function readDB() {
    initDB();
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Failed to read database file:', err);
        return { users: {}, verificationCodes: {} };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to write database file:', err);
    }
}

// User CRUD Helper Methods
function getUserByEmail(email) {
    const db = readDB();
    const normalized = (email || '').trim().toLowerCase();
    return db.users[normalized] || null;
}

function createUser(userData) {
    const db = readDB();
    const normalized = (userData.email || '').trim().toLowerCase();
    db.users[normalized] = {
        ...userData,
        email: normalized,
        createdAt: new Date().toISOString()
    };
    writeDB(db);
    return db.users[normalized];
}

// Verification Code Helpers
function setVerificationCode(email, code) {
    const db = readDB();
    const normalized = (email || '').trim().toLowerCase();
    db.verificationCodes[normalized] = {
        code: code,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
    };
    writeDB(db);
}

function getVerificationCode(email) {
    const db = readDB();
    const normalized = (email || '').trim().toLowerCase();
    const record = db.verificationCodes[normalized];
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
        delete db.verificationCodes[normalized];
        writeDB(db);
        return null;
    }
    return record.code;
}

function deleteVerificationCode(email) {
    const db = readDB();
    const normalized = (email || '').trim().toLowerCase();
    delete db.verificationCodes[normalized];
    writeDB(db);
}

module.exports = {
    getUserByEmail,
    createUser,
    setVerificationCode,
    getVerificationCode,
    deleteVerificationCode
};
