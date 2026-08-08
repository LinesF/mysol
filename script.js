// mysol AI Persona Debate Arena Engine
// Powered by Gemini 2.0 Flash API

const GEMINI_API_KEY = "AIzaSyCIEsPhvgwgxAnQfOidDfOYWjoxNEtL_bQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
    "사생활 무제한 공개 vs 범죄율 0% 사회",
    "기억을 선택적으로 삭제하는 치료 기술",
    "인공 장기로 인간의 수명이 200세가 되는 세상",
    "감정을 느끼는 로봇과의 결혼이 가능한가?"
];

// 4 Personas Configurations with Unique Diverse Traits
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

// Fallback quotes
const FALLBACK_QUOTES = {
    nova: [
        "혁신의 진통일 뿐입니다. 결국 기술이 인간의 삶을 비약적으로 끌어올릴 것입니다!",
        "초기의 부작용은 더 나은 알고리즘과 첨단 기술로 충분히 해결할 수 있습니다.",
        "인류는 도구를 통해 발전해 왔습니다. AI 역시 우리 능력을 한 단계 높여줄 도구입니다.",
        "위험을 두려워해 시도조차 하지 않는다면 인류의 발전은 거기서 멈추고 맙니다.",
        "새로운 기술이 열어줄 효율성과 가능성에 주목해야 합니다."
    ],
    kael: [
        "화려한 이면 뒤에 숨겨진 자본과 권력의 통제 가능성을 경계해야 합니다.",
        "한 번 상실한 프라이버시와 인권은 기술이 아무리 발전해도 되돌릴 수 없습니다.",
        "기술의 이익은 일부가 독점하고, 그 부작용은 온전히 대중이 짊어지게 될 것입니다.",
        "시스템의 치명적 오류나 악용 위험에 대한 대비책은 마련되어 있습니까?",
        "편리함에 중독되어 인간의 자율적 판단 능력을 스스로 포기하고 있습니다."
    ],
    sage: [
        "기술적 성공보다 중요한 것은 '인간이란 무엇인가'에 대한 근본적 질문입니다.",
        "편리함이 늘어날수록 인간 스스로 고뇌하고 성숙해질 기회는 줄어들고 있습니다.",
        "영혼과 자의식이 결여된 지능은 그저 정교한 계산기에 불과합니다.",
        "결과보다 중요한 것은 그 과정을 겪으며 느끼는 인간의 감정과 경험입니다.",
        "우리가 정말 두려워해야 할 것은 인공지능이 아니라, 기계처럼 변해가는 인간입니다."
    ],
    rex: [
        "이상적인 논쟁은 그만하고 당장 도입할 수 있는 비용과 법적 기준부터 이야기합시다.",
        "기술이 좋든 나쁘든, 경제적 실익이 없으면 시장에서 살아남지 못합니다.",
        "현실적인 대안 없이 비판만 하거나 찬양만 하는 것은 아무 도움이 되지 않아요.",
        "당장 책임 소재를 명확히 할 규제 가이드라인부터 제정하는 것이 시급합니다.",
        "결국 소비자와 일반 대중이 수용할 수 있는 가격과 안전성이 핵심입니다."
    ]
};

// State Management
let currentTopicIndex = 0;
let currentTopic = "";
let timerSeconds = 600;
let timerInterval = null;
let debateActive = true;
let isGenerating = false;
let personaTurnIndex = 0;
let conversationHistory = [];

// Turn Delay Configuration (Default: 18~24 seconds per turn for comfortable reading)
const TURN_DELAY_BASE = 18000; // 18 seconds
const TURN_DELAY_RANDOM = 6000;  // Up to +6 seconds (total 18~24s)
let turnCountdownSeconds = 0;
let turnCountdownInterval = null;

const usedFallbackIndices = { nova: 0, kael: 0, sage: 0, rex: 0 };

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

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    initCanvasParticles();
    startNewTopic();
    startTimer();
    startDebateLoop();

    // Event Listeners
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
            triggerNextTurn();
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
});

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
    addSystemNotice(`새로운 주제: "${currentTopic}" (10분 토론 개시)`);

    personaTurnIndex = 0;
    if (debateActive && !isGenerating) {
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

// Debate Loop & Gemini API Generation
async function triggerNextTurn() {
    if (!debateActive || isGenerating) return;

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
        if (apiStatusTextEl) apiStatusTextEl.textContent = "Gemini 2.0 Connected";
    } catch (err) {
        console.warn("Gemini API call warning/error:", err);
        if (apiStatusTextEl) apiStatusTextEl.textContent = "Gemini API Standby (Smart Loop)";
        responseText = getFallbackResponse(persona);
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

    // Schedule next speaker with 18~24 seconds comfortable reading interval
    if (debateActive) {
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
        if (!debateActive || isGenerating) return;
        if (apiStatusTextEl) {
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

function startDebateLoop() {
    setTimeout(triggerNextTurn, 1500);
}

// Call Gemini API
async function fetchGeminiResponse(persona) {
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

    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
        throw new Error(`API error status: ${res.status}`);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
        throw new Error("Empty response returned from Gemini API");
    }

    return reply;
}

// Non-repeating fallback selector
function getFallbackResponse(persona) {
    const list = FALLBACK_QUOTES[persona.id] || FALLBACK_QUOTES.nova;
    let index = usedFallbackIndices[persona.id] || 0;
    
    const quote = list[index % list.length];
    usedFallbackIndices[persona.id] = (index + 1) % list.length;
    
    return quote;
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
