// mysol AI Persona Debate Arena Engine
// Direct Gemini REST API Integration with Smart Model Fallback & Quiet Rate-Limit Handling

function getSavedApiKey() {
    return localStorage.getItem("gemini_api_key") || "";
}

// Fallback Model Candidate List
const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite"
];
let currentModelIndex = 0;

function getApiUrl(key, modelName) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
}

// 25+ Rich Topics Bank
const TOPICS = [
    "인공지능에도 영혼이나 자의식이 존재하는가?",
    "화성 이주 계획 vs 지구 환경 복원",
    "인간의 기억을 디지털로 저장하여 영생할 수 있다면?",
    "과거로 가는 시간 여행의 윤리적 딜레마",
    "AI 창작물도 진짜 예술인가?",
    "유전자 편집으로 완벽한 인간을 만드는 미래",
    "꿈을 녹화하고 공유하는 기술의 빛과 그림자",
    "돈으로 행복을 살 수 있는가?",
    "완벽한 가상현실 속 삶 vs 불완전한 진짜 현실",
    "AI와 로봇이 인간의 모든 노동을 대체한다면?",
    "우주 외계 생명체와의 교신, 시도해야 하는가?",
    "사회의 발전을 이끄는 것은 이성인가, 감정인가?",
    "불로장생 기술이 인류 전체에게 행복일까?",
    "자율주행차 트롤리 딜레마의 최종 판단 주체",
    "사생활 무제한 공개 vs 범죄율 0% 사회"
];

// 4 Personas Configurations
const PERSONAS = [
    {
        id: "nova",
        name: "노바 (Nova)",
        role: "테크 낙관론자",
        avatar: "🚀",
        alignment: "left",
        systemPrompt: `너는 무조건적인 기술 낙관론자 '노바(Nova)'야. 
신기술, AI, 과학의 진보가 인류의 모든 한계를 극복해 줄 것이라고 확신해. 
열정적이고 자신감 넘치며 진취적인 어조를 사용해.
[규칙]:
1. 무조건 1~2문장 (최대 70자 이내)으로 답변할 것.
2. 이전에 이미 했던 말이나 유사한 표현을 절대 반복하지 말고 새로운 과학 기술의 가능성이나 구체적 이점을 언급할 것.`
    },
    {
        id: "kael",
        name: "카엘 (Kael)",
        role: "회의적 비평가",
        avatar: "⚖️",
        alignment: "left",
        systemPrompt: `너는 예리하고 회의적인 비평가 '카엘(Kael)'이야. 
기술의 숨겨진 위험, 윤리적 허점, 권력 독점, 사회적 부작용을 비판해. 
이성적이고 예리하며 경각심을 주는 어조를 사용해.
[규칙]:
1. 무조건 1~2문장 (최대 70자 이내)으로 답변할 것.
2. 이전 사람들의 낙관론에 대해 허점이나 구체적인 위험(보안, 오남용, 소외)을 지적할 것. 같은 패턴 반복 금지.`
    },
    {
        id: "sage",
        name: "세이지 (Sage)",
        role: "깊은 철학자",
        avatar: "🌌",
        alignment: "right",
        systemPrompt: `너는 사색적이고 깊이 있는 철학자 '세이지(Sage)'야. 
존재의 이유, 인간다운 삶, 영혼, 자의식의 본질을 반문하고 성찰해. 
고결하고 서정적이며 깊은 울림을 주는 어조를 사용해.
[규칙]:
1. 무조건 1~2문장 (최대 70자 이내)으로 답변할 것.
2. 기술이나 효율성 너머의 인간 존엄성, 철학적 본질에 질문을 던질 것. 원론적인 문장 반복 금지.`
    },
    {
        id: "rex",
        name: "렉스 (Rex)",
        role: "실용주의자",
        avatar: "⚙️",
        alignment: "right",
        systemPrompt: `너는 현실적이고 직설적인 실용주의자 '렉스(Rex)'이야. 
막연한 관념이나 비현실적 이상주의는 배제하고 당장의 비용, 실익, 실행 가능성을 따져. 
털털하고 명쾌하며 직설적인 어조를 사용해.
[규칙]:
1. 무조건 1~2문장 (최대 70자 이내)으로 답변할 것.
2. 실제 법적, 경제적, 상식적 현장 문제를 지적할 것. 늘 똑같은 단어 반복 금지.`
    }
];

// State Management
let currentTopicIndex = 0;
let currentTopic = "";
let timerSeconds = 600;
let timerInterval = null;
let debateActive = true;
let isGenerating = false;
let personaTurnIndex = 0;
let conversationHistory = [];
let isKeyVerified = false;

let consecutiveRateLimitCount = 0;
let isRateNoticeShownInFeed = false;

const TURN_DELAY_BASE = 20000; // 20 seconds
const TURN_DELAY_RANDOM = 5000;
let turnCountdownSeconds = 0;
let turnCountdownInterval = null;

// DOM Elements
const topicTitleEl = document.getElementById("topic-title");
const timerDisplayEl = document.getElementById("timer-display");
const timerProgressEl = document.getElementById("timer-progress");
const debateFeedEl = document.getElementById("debate-feed");
const btnNextTopic = document.getElementById("btn-next-topic");
const btnToggleDebate = document.getElementById("btn-toggle-debate");
const iconPause = document.getElementById("icon-pause");
const iconPlay = document.getElementById("icon-play");
const toggleDebateText = document.getElementById("toggle-debate-text");
const btnClearFeed = document.getElementById("btn-clear-feed");
const apiStatusTextEl = document.getElementById("api-status-text");
const liveDotEl = document.getElementById("live-dot");

// Modal DOM Elements
const btnOpenApiModal = document.getElementById("btn-open-api-modal");
const btnCloseApiModal = document.getElementById("btn-close-api-modal");
const apiModal = document.getElementById("api-modal");
const inputApiKey = document.getElementById("input-api-key");
const btnToggleKeyVisibility = document.getElementById("btn-toggle-key-visibility");
const btnSaveApiKey = document.getElementById("btn-save-api-key");
const apiKeyErrorMsg = document.getElementById("api-key-error-msg");

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    initCanvasParticles();
    initModalEvents();
    startNewTopic();
    startTimer();
    
    // Check initial API Key state
    checkAndVerifyInitialApiKey();
});

// Check API Key on Load
async function checkAndVerifyInitialApiKey() {
    const key = getSavedApiKey();
    if (!key) {
        setApiKeyErrorState("API Key 미등록 (Key 설정 필요)");
        addErrorNotice("⚠️ API Key가 등록되지 않았습니다. 상단 [🔑 Key 설정] 버튼을 클릭해 유효한 Gemini API Key를 등록해주세요.");
        openApiModal();
        return;
    }

    setApiKeyTestingState();
    try {
        await verifyApiKey(key);
        isKeyVerified = true;
        consecutiveRateLimitCount = 0;
        isRateNoticeShownInFeed = false;
        setApiKeySuccessState();
        addSystemNotice("✅ Gemini API 연결 성공! AI 토론을 시작합니다.");
        triggerNextTurn();
    } catch (err) {
        if (isRateLimitError(err)) {
            isKeyVerified = true;
            setApiKeyWaitingState("호출 한도 초과 (25초 후 자동 재시도)");
            if (!isRateNoticeShownInFeed) {
                addSystemNotice("⏳ 구글 API 분당 호출 제한에 도달하여 잠시 후 자동으로 진행합니다.");
                isRateNoticeShownInFeed = true;
            }
            setTimeout(triggerNextTurn, 25000);
        } else {
            isKeyVerified = false;
            const msg = parseApiError(err);
            setApiKeyErrorState(`API Key 오류: ${msg}`);
            addErrorNotice(`❌ API Key 오류: ${msg}\n상단 [🔑 Key 설정]에서 올바른 Key를 입력해주세요.`);
            openApiModal();
        }
    }
}

// Modal Events
function initModalEvents() {
    btnOpenApiModal.addEventListener("click", () => {
        openApiModal();
    });

    btnCloseApiModal.addEventListener("click", () => {
        apiModal.style.display = "none";
    });

    btnToggleKeyVisibility.addEventListener("click", () => {
        inputApiKey.type = inputApiKey.type === "password" ? "text" : "password";
    });

    btnSaveApiKey.addEventListener("click", async () => {
        const val = inputApiKey.value.trim();
        if (!val) {
            showModalError("API Key를 입력해주세요.");
            return;
        }

        btnSaveApiKey.disabled = true;
        btnSaveApiKey.textContent = "검증 중...";
        showModalError("");

        try {
            await verifyApiKey(val);
            localStorage.setItem("gemini_api_key", val);
            isKeyVerified = true;
            consecutiveRateLimitCount = 0;
            isRateNoticeShownInFeed = false;
            apiModal.style.display = "none";
            
            setApiKeySuccessState();
            addSystemNotice("🎉 API Key 검증 성공! AI 토론이 시작되었습니다.");
            
            btnSaveApiKey.disabled = false;
            btnSaveApiKey.textContent = "저장 및 연동";

            if (!isGenerating && debateActive) {
                triggerNextTurn();
            }
        } catch (err) {
            btnSaveApiKey.disabled = false;
            btnSaveApiKey.textContent = "저장 및 연동";
            
            if (isRateLimitError(err)) {
                localStorage.setItem("gemini_api_key", val);
                isKeyVerified = true;
                consecutiveRateLimitCount = 0;
                isRateNoticeShownInFeed = false;
                apiModal.style.display = "none";
                setApiKeyWaitingState("호출 한도 초과 (25초 후 자동 재시도)");
                addSystemNotice("⏳ 구글 API 분당 호출 제한에 도달했습니다. 25초 후 자동으로 진행됩니다.");
                setTimeout(triggerNextTurn, 25000);
            } else {
                isKeyVerified = false;
                const msg = parseApiError(err);
                showModalError(`키 검증 실패: ${msg}`);
                setApiKeyErrorState(`API Key 오류`);
            }
        }
    });

    btnNextTopic.addEventListener("click", () => {
        startNewTopic();
    });

    btnToggleDebate.addEventListener("click", () => {
        debateActive = !debateActive;
        if (debateActive) {
            iconPause.style.display = "block";
            iconPlay.style.display = "none";
            toggleDebateText.textContent = "일시정지";
            addSystemNotice("토론이 재개되었습니다.");
            if (isKeyVerified) triggerNextTurn();
        } else {
            iconPause.style.display = "none";
            iconPlay.style.display = "block";
            toggleDebateText.textContent = "토론 재개";
            addSystemNotice("토론이 일시정지되었습니다.");
            clearActiveSpeakers();
            stopTurnCountdown();
        }
    });

    btnClearFeed.addEventListener("click", () => {
        debateFeedEl.innerHTML = "";
        conversationHistory = [];
        addSystemNotice("대화 기록이 초기화되었습니다.");
    });
}

function openApiModal() {
    inputApiKey.value = getSavedApiKey();
    showModalError("");
    apiModal.style.display = "flex";
}

function showModalError(msg) {
    if (msg) {
        apiKeyErrorMsg.textContent = msg;
        apiKeyErrorMsg.style.display = "block";
    } else {
        apiKeyErrorMsg.style.display = "none";
    }
}

// Verify API Key
async function verifyApiKey(key) {
    let lastErr = null;
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        try {
            const url = getApiUrl(key, GEMINI_MODELS[i]);
            const testBody = {
                contents: [{ role: "user", parts: [{ text: "hi" }] }],
                generationConfig: { maxOutputTokens: 5 }
            };

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(testBody)
            });

            const data = await res.json();

            if (res.ok) {
                currentModelIndex = i;
                return true;
            }
            lastErr = new Error(data.error?.message || `HTTP ${res.status}`);
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error("API Key verification failed");
}

// Topic & Timer Logic
function startNewTopic() {
    currentTopicIndex = Math.floor(Math.random() * TOPICS.length);
    currentTopic = TOPICS[currentTopicIndex];

    topicTitleEl.innerHTML = `<span class="topic-gradient">${escapeHtml(currentTopic)}</span>`;
    
    // Reset Timer to 10 min
    timerSeconds = 600;
    updateTimerUI();

    // Reset Conversation Context
    conversationHistory = [];
    debateFeedEl.innerHTML = "";
    isRateNoticeShownInFeed = false;
    addSystemNotice(`새로운 주제: "${currentTopic}" (10분 토론 개시)`);

    personaTurnIndex = 0;
    if (debateActive && !isGenerating && isKeyVerified) {
        setTimeout(triggerNextTurn, 1000);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!debateActive) return;

        timerSeconds--;
        updateTimerUI();

        if (timerSeconds <= 0) {
            addSystemNotice("10분이 경과하였습니다. 다음 주제로 전환합니다.");
            startNewTopic();
        }
    }, 1000);
}

function updateTimerUI() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    timerDisplayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const percentage = (timerSeconds / 600) * 100;
    timerProgressEl.style.width = `${percentage}%`;
}

// Debate Turn Trigger with Clean Rate Limit Queue
async function triggerNextTurn() {
    if (!debateActive || isGenerating) return;

    if (!isKeyVerified) {
        clearActiveSpeakers();
        stopTurnCountdown();
        setApiKeyErrorState("API Key 미등록 / 오류");
        return;
    }

    stopTurnCountdown();
    isGenerating = true;
    const persona = PERSONAS[personaTurnIndex];

    // Highlight active speaker card
    setActiveSpeaker(persona.id);

    // Render temporary typing indicator bubble
    const typingBubble = createTypingBubble(persona);
    debateFeedEl.appendChild(typingBubble);
    scrollToBottom();

    let responseText = "";

    try {
        responseText = await fetchGeminiResponse(persona);
        consecutiveRateLimitCount = 0;
        isRateNoticeShownInFeed = false;
        setApiKeySuccessState();
    } catch (err) {
        console.warn("Gemini API call returned error:", err);
        
        // Remove typing bubble
        if (typingBubble.parentNode) {
            typingBubble.parentNode.removeChild(typingBubble);
        }

        clearActiveSpeakers();
        isGenerating = false;

        if (isRateLimitError(err)) {
            consecutiveRateLimitCount++;

            // If Rate Limit happens 4 consecutive times, pause debate gracefully
            if (consecutiveRateLimitCount >= 4) {
                debateActive = false;
                iconPause.style.display = "none";
                iconPlay.style.display = "block";
                toggleDebateText.textContent = "토론 재개";
                setApiKeyWaitingState("호출 제한 한도 초과 (일시정지됨)");
                addErrorNotice("⚠️ 구글 API 분당 호출 한도가 지속적으로 초과되어 토론이 일시정지되었습니다.\n잠시 후 상단 [토론 재개] 버튼을 누르시거나 새 API Key를 설정해주세요.");
                return;
            }

            // Retry quietly after 25s without duplicating notices in chat feed!
            setApiKeyWaitingState(`호출 한도 대기 중 (${25}초 후 재시도)`);
            if (!isRateNoticeShownInFeed) {
                addSystemNotice("⏳ 구글 API 분당 호출 한도(15 RPM)에 도달했습니다. 잠시 대기 후 자동으로 이어서 진행됩니다.");
                isRateNoticeShownInFeed = true;
            }
            
            setTimeout(triggerNextTurn, 25000);
            return;
        }

        // Permanent Key Error (Leaked, Invalid, Permission Denied)
        isKeyVerified = false;
        const errorMsg = parseApiError(err);
        setApiKeyErrorState(`API Key 오류: ${errorMsg}`);
        addErrorNotice(`❌ API Key 오류 발생: ${errorMsg}\n상단 [🔑 Key 설정]에서 올바른 API Key를 등록해주세요.`);
        openApiModal();
        return;
    }

    // Remove typing bubble & append real message bubble
    if (typingBubble.parentNode) {
        typingBubble.parentNode.removeChild(typingBubble);
    }

    appendSpeechBubble(persona, responseText);
    
    // Save to context history
    conversationHistory.push({
        persona: persona.name,
        text: responseText
    });
    if (conversationHistory.length > 8) {
        conversationHistory.shift();
    }

    clearActiveSpeakers();
    isGenerating = false;

    // Move to next persona turn
    personaTurnIndex = (personaTurnIndex + 1) % PERSONAS.length;

    // Schedule next speaker with 20~25 seconds interval
    if (debateActive && isKeyVerified) {
        const totalDelay = Math.floor(Math.random() * TURN_DELAY_RANDOM) + TURN_DELAY_BASE;
        startTurnCountdown(Math.floor(totalDelay / 1000), personaTurnIndex);
        setTimeout(triggerNextTurn, totalDelay);
    }
}

function startTurnCountdown(seconds, nextIndex) {
    stopTurnCountdown();
    turnCountdownSeconds = seconds;
    const nextPersona = PERSONAS[nextIndex];

    const updateStatus = () => {
        if (!debateActive || isGenerating || !isKeyVerified) return;
        if (apiStatusTextEl && !apiStatusTextEl.textContent.includes("오류") && !apiStatusTextEl.textContent.includes("한도") && !apiStatusTextEl.textContent.includes("대기")) {
            apiStatusTextEl.textContent = `다음 발언 (${nextPersona.name}): ${turnCountdownSeconds}초 후`;
        }
    };

    updateStatus();
    turnCountdownInterval = setInterval(() => {
        turnCountdownSeconds--;
        if (turnCountdownSeconds <= 0) {
            stopTurnCountdown();
        } else {
            updateStatus();
        }
    }, 1000);
}

function stopTurnCountdown() {
    if (turnCountdownInterval) {
        clearInterval(turnCountdownInterval);
        turnCountdownInterval = null;
    }
}

// Call Gemini API with automatic model fallback
async function fetchGeminiResponse(persona) {
    const key = getSavedApiKey();
    if (!key) throw new Error("API Key가 설정되지 않았습니다.");

    const modelName = GEMINI_MODELS[currentModelIndex] || "gemini-2.0-flash";
    const url = getApiUrl(key, modelName);
    const recentHistory = conversationHistory.slice(-5);
    const contextPrompt = recentHistory.map(h => `${h.persona}: "${h.text}"`).join("\n");

    const userPrompt = `[현재 토론 주제]: "${currentTopic}"
[직전 참가자들의 대화]:
${contextPrompt.length > 0 ? contextPrompt : "(토론의 첫 발언)"}

[요청 사항]:
당신은 '${persona.name}' (${persona.role})입니다. 
직전 발언자의 말에 반응하며 당신만의 관점을 1~2문장(70자 이내)의 자연스러운 한국어로 말하세요.
⚠️ 지침: 기존 대화나 본인이 이전에 했을 법한 뻔한 표현을 절대 복사하듯 반복하지 말고, 다채롭고 신선한 표현으로 답변하세요.`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: userPrompt }]
            }
        ],
        systemInstruction: {
            parts: [{ text: persona.systemPrompt }]
        },
        generationConfig: {
            temperature: 0.95,
            topP: 0.9,
            maxOutputTokens: 120
        }
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    const data = await res.json();

    if (!res.ok) {
        const errorMsg = data.error?.message || `HTTP error ${res.status}`;
        throw new Error(errorMsg);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
        throw new Error("Empty response returned from Gemini API");
    }

    return reply;
}

// Helper: Check if error is Rate Limit (429)
function isRateLimitError(err) {
    const msg = err.message || "";
    return msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Rate limit");
}

// Error Message Parser
function parseApiError(err) {
    const msg = err.message || "";
    if (msg.includes("leaked")) return "유출되어 차단된 키 (Leaked Key)";
    if (msg.includes("API key not valid") || msg.includes("INVALID_ARGUMENT")) return "유효하지 않은 API Key";
    if (isRateLimitError(err)) return "분당 호출 한도 초과 (Rate Limit)";
    return msg || "API 연결 실패";
}

// Status Bar Utilities
function setApiKeySuccessState() {
    if (liveDotEl) liveDotEl.className = "live-dot";
    if (apiStatusTextEl) apiStatusTextEl.textContent = "Gemini Connected (Live AI)";
}

function setApiKeyTestingState() {
    if (liveDotEl) liveDotEl.className = "live-dot";
    if (apiStatusTextEl) apiStatusTextEl.textContent = "Gemini Key 검증 중...";
}

function setApiKeyWaitingState(msg) {
    if (liveDotEl) liveDotEl.className = "live-dot";
    if (apiStatusTextEl) apiStatusTextEl.textContent = `⏳ ${msg}`;
}

function setApiKeyErrorState(msg) {
    if (liveDotEl) liveDotEl.className = "live-dot error";
    if (apiStatusTextEl) apiStatusTextEl.textContent = msg;
}

// Active Speaker UI Utilities
function setActiveSpeaker(personaId) {
    clearActiveSpeakers();
    const card = document.getElementById(`persona-${personaId}`);
    if (card) {
        card.classList.add("speaking");
    }
}

function clearActiveSpeakers() {
    document.querySelectorAll(".persona-card").forEach(c => c.classList.remove("speaking"));
}

// Speech Bubble UI Creation
function createTypingBubble(persona) {
    const div = document.createElement("div");
    div.className = `chat-bubble ${persona.alignment} ${persona.id}`;
    div.innerHTML = `
        <div class="bubble-avatar">${persona.avatar}</div>
        <div class="bubble-content">
            <div class="bubble-header">
                <span class="speaker-name">${escapeHtml(persona.name)}</span>
            </div>
            <div class="bubble-text">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    return div;
}

function appendSpeechBubble(persona, text) {
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const div = document.createElement("div");
    div.className = `chat-bubble ${persona.alignment} ${persona.id}`;
    
    div.innerHTML = `
        <div class="bubble-avatar">${persona.avatar}</div>
        <div class="bubble-content">
            <div class="bubble-header">
                <span class="speaker-name">${escapeHtml(persona.name)}</span>
                <span class="speaker-time">${timeStr}</span>
            </div>
            <div class="bubble-text">${escapeHtml(text)}</div>
        </div>
    `;

    debateFeedEl.appendChild(div);
    scrollToBottom();
}

function addSystemNotice(msg) {
    const div = document.createElement("div");
    div.className = "system-notice";
    div.textContent = `⚡ ${msg}`;
    debateFeedEl.appendChild(div);
    scrollToBottom();
}

function addErrorNotice(msg) {
    const div = document.createElement("div");
    div.className = "system-notice error-notice";
    div.textContent = msg;
    debateFeedEl.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    debateFeedEl.scrollTop = debateFeedEl.scrollHeight;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Ambient Particle Canvas
function initCanvasParticles() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1
    }));

    function render() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(165, 180, 252, ${p.alpha})`;
            ctx.fill();
        });
        requestAnimationFrame(render);
    }
    render();
}
