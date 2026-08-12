const nodemailer = require('nodemailer');

// Configure Nodemailer transporter (supports SMTP env variables or development preview)
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

async function sendVerificationEmail(targetEmail, code) {
    const mailOptions = {
        from: '"mysol 2D Game" <noreply@mysol.game>',
        to: targetEmail,
        subject: '[mysol 2D Game] 회원가입 이메일 인증 코드 안내',
        html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #0f172a; border-radius: 16px; color: #f8fafc; border: 1px solid #334155;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 0.75rem; letter-spacing: 2px; color: #38bdf8; font-weight: bold; background: rgba(56, 189, 248, 0.15); padding: 4px 12px; border-radius: 12px;">2D PIXEL SURVIVAL</span>
                    <h1 style="font-size: 2rem; margin: 8px 0 0 0; color: #ffffff;">mysol</h1>
                </div>
                <h2 style="font-size: 1.1rem; color: #38bdf8; margin-bottom: 12px;">이메일 인증 번호 안내</h2>
                <p style="font-size: 0.9rem; color: #94a3b8; line-height: 1.5;">mysol 2D 픽셀 게임 회원가입을 신청해 주셔서 감사합니다.<br>아래 6자리 인증 코드를 입력하여 회원가입을 완료해 주세요.</p>
                <div style="text-align: center; margin: 24px 0; padding: 16px; background: #1e293b; border-radius: 12px; border: 1px dashed #38bdf8;">
                    <span style="font-family: monospace; font-size: 2.2rem; font-weight: bold; letter-spacing: 8px; color: #fbbf24;">${code}</span>
                </div>
                <p style="font-size: 0.78rem; color: #64748b; text-align: center;">본 인증 번호는 10분간 유효합니다.</p>
            </div>
        `
    };

    if (transporter) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`[MAILER] Real email sent to ${targetEmail}`);
            return true;
        } catch (err) {
            console.error('[MAILER] SMTP Send Error:', err);
        }
    }

    // Dev Fallback Log
    console.log(`\n======================================================`);
    console.log(`[MAILER SIMULATOR] To: ${targetEmail}`);
    console.log(`[MAILER SIMULATOR] Verification Code: [ ${code} ]`);
    console.log(`======================================================\n`);
    return true;
}

module.exports = {
    sendVerificationEmail
};
