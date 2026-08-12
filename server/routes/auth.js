const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/db');
const mailer = require('../services/mailer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mysol_secret_jwt_key_2026';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. POST /api/auth/send-code (Verification Code Dispatch & Duplicate Pre-Check)
router.post('/send-code', async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: '올바른 이메일 형식을 입력해 주세요.' });
        }

        // Check if email is already registered
        const existingUser = db.getUserByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(409).json({ success: false, message: '이미 가입된 이메일 주소입니다. 로그인 탭을 이용해 주세요.' });
        }

        // Generate 6-digit random code & set in DB
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        db.setVerificationCode(normalizedEmail, code);

        // Send email
        await mailer.sendVerificationEmail(normalizedEmail, code);

        return res.json({
            success: true,
            message: `[인증 코드 발송] ${normalizedEmail} 님께 인증 코드가 발송되었습니다.`,
            previewCode: code // Returned for testing convenience
        });

    } catch (err) {
        console.error('Send code route error:', err);
        return res.status(500).json({ success: false, message: '인증 코드 발송 중 오류가 발생했습니다.' });
    }
});

// 1.5. POST /api/auth/verify-code (Check Code Match & Pre-verify Email)
router.post('/verify-code', (req, res) => {
    try {
        const { email, code } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();
        const trimmedCode = (code || '').trim();

        if (!normalizedEmail || !trimmedCode) {
            return res.status(400).json({ success: false, message: '이메일과 인증 코드를 모두 입력해 주세요.' });
        }

        const storedCode = db.getVerificationCode(normalizedEmail);
        if (!storedCode || storedCode !== trimmedCode) {
            return res.status(400).json({ success: false, message: '인증 코드가 일치하지 않거나 만료되었습니다.' });
        }

        return res.json({
            success: true,
            message: '✅ 이메일 인증이 완료되었습니다!'
        });
    } catch (err) {
        console.error('Verify code route error:', err);
        return res.status(500).json({ success: false, message: '인증 코드 확인 중 오류가 발생했습니다.' });
    }
});

// 2. POST /api/auth/signup (Account Creation & Verification)
router.post('/signup', async (req, res) => {
    try {
        const { email, code, password } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();
        const trimmedCode = (code || '').trim();

        if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: '올바른 이메일 형식을 입력해 주세요.' });
        }

        if (!trimmedCode) {
            return res.status(400).json({ success: false, message: '인증 코드를 입력해 주세요.' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: '비밀번호는 최소 6자리 이상이어야 합니다.' });
        }

        // Verify Duplicate Email
        const existingUser = db.getUserByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(409).json({ success: false, message: '이미 가입된 이메일 주소입니다.' });
        }

        // Verify Code Match & Expiry
        const storedCode = db.getVerificationCode(normalizedEmail);
        if (!storedCode || storedCode !== trimmedCode) {
            return res.status(400).json({ success: false, message: '인증 코드가 일치하지 않거나 만료되었습니다.' });
        }

        // Hash Password with bcryptjs
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Extract base username
        const username = normalizedEmail.split('@')[0];

        // Save User
        const newUser = db.createUser({
            email: normalizedEmail,
            username: username,
            password: hashedPassword,
            type: 'email'
        });

        // Clear used verification code
        db.deleteVerificationCode(normalizedEmail);

        // Sign JWT Token
        const token = jwt.sign({ email: newUser.email, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            success: true,
            message: `계정이 생성되었습니다! [${newUser.username}] 님 환영합니다.`,
            token,
            user: {
                email: newUser.email,
                username: newUser.username,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${newUser.username}`
            }
        });

    } catch (err) {
        console.error('Signup route error:', err);
        return res.status(500).json({ success: false, message: '계정 생성 처리 중 오류가 발생했습니다.' });
    }
});

// 3. POST /api/auth/login (Account Authentication)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ success: false, message: '이메일과 비밀번호를 모두 입력해 주세요.' });
        }

        const user = db.getUserByEmail(normalizedEmail);
        if (!user) {
            return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const token = jwt.sign({ email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            success: true,
            message: `로그인 성공! [${user.username}] 님 환영합니다.`,
            token,
            user: {
                email: user.email,
                username: user.username,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`
            }
        });

    } catch (err) {
        console.error('Login route error:', err);
        return res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
