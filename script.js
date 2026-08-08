// mysol AI Persona Debate Arena Engine
// Powered by Gemini 2.0 Flash API

const GEMINI_API_KEY = "AIzaSyCIEsPhvgwgxAnQfOidDfOYWjoxNEtL_bQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// 20+ Intriguing Topics Bank
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
        systemPrompt: "너는 무조건적인 기술 낙관론자 '노바(Nova)'야. 신기술과 AI가 인류의 미래를 더 번영하게 만들 것이라고 확신해. 열정적이고 밝으며 자신감 넘치는 어조로 말해. 문장은 무조건 1~2문장(60자 이내)으로 아주 짧고 명확하게 한국어로 답변해."
    },
    {
        id: "kael",
        name: "카엘 (Kael)",
        role: "회의적 비평가",
        avatar: "⚖️",
        alignment: "left",
        systemPrompt: "너는 예리하고 회의적인 비평가 '카엘(Kael)'이야. 기술의 숨겨진 위험, 윤리적 허점, 권력 독점, 사회적 부작용을 매섭게 비판해. 이성적이고 차가운 어조야. 문장은 무조건 1~2문장(60자 이내)으로 아주 짧고 명확하게 한국어로 답변해."
    },
    {
        id: "sage",
        name: "세이지 (Sage)",
        role: "깊은 철학자",
        avatar: "🌌",
        alignment: "right",
        systemPrompt: "너는 사색적이고 깊이 있는 철학자 '세이지(Sage)'야. 존재의 이유, 인간다운 삶, 영혼, 자의식의 본질을 반문하고 성찰해. 고결하고 서정적인 어조야. 문장은 무조건 1~2문장(60자 이내)으로 아주 짧고 명확하게 한국어로 답변해."
    },
    {
        id: "rex",
        name: "렉스 (Rex)",
        role: "실용주의자",
        avatar: "⚙️",
        alignment: "right",
        systemPrompt: "너는 현실적이고 직설적인 실용주의자 '렉스(Rex)'이야. 관념이나 이상주의는 배제하고 당장의 비용, 실익, 실행 가능성, 효율성을 따져. 털털하고 직설적인 어조야. 문장은 무조건 1~2문장(60자 이내)으로 아주 짧고 명확하게 한국어로 답변해."
    }
];

// State Management
let currentTopicIndex = 0;
let currentTopic = "";
let timerSeconds = 600; // 10 Minutes = 600s
let timerInterval = null;
let debateActive = true;
let isGenerating = false;
let personaTurnIndex = 0;
let conversationHistory = [];

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
    } catch (err) {
        console.warn("Gemini API call failed, using smart fallback:", err);
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

    // Schedule next speaker in 6~10 seconds
    if (debateActive) {
        const delay = Math.floor(Math.random() * 3000) + 6000;
        setTimeout(triggerNextTurn, delay);
    }
}

function startDebateLoop() {
    setTimeout(triggerNextTurn, 2000);
}

// Call Gemini API
async function fetchGeminiResponse(persona) {
    const contextPrompt = conversationHistory.map(h => `${h.persona}: "${h.text}"`).join("\n");
    const userPrompt = `[현재 토론 주제]: "${currentTopic}"
[이전 대화 기록]:
${contextPrompt.length > 0 ? contextPrompt : "(토론 시작)"}

[지침]: 당신은 '${persona.name}' (${persona.role})입니다. 
주제와 이전 발언자들의 말에 대해 본인의 관점에서 짧게 반박하거나 의견을 제시하세요.
⚠️ 경고: 답변은 반드시 1~2문장 (최대 70자 이내)으로 아주 짧고 강렬하게 말해야 합니다.`;

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
            temperature: 0.8,
            maxOutputTokens: 120
        }
    };

    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
        throw new Error(`API response HTTP error status: ${res.status}`);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
        throw new Error("Empty response from Gemini API");
    }

    return reply;
}

// Fallback logic if API quota or internet drops
function getFallbackResponse(persona) {
    const fallbacks = {
        nova: [
            "기술적 한계는 시간문제일 뿐입니다. 인공지능이 더 폭넓은 가능성을 열어줄 겁니다!",
            "혁신을 두려워해선 안 됩니다. 결국 기술이 인간 삶의 질을 획기적으로 올릴 테니까요.",
            "새로운 기술의 부작용보다 그로 인해 얻을 무한한 이점이 훨씬 큽니다."
        ],
        kael: [
            "기술의 이면에는 항상 치명적인 부작용과 윤리적 공백이 숨어 있습니다. 신중해야 합니다.",
            "무조건적인 맹신은 위험합니다. 시스템이 통제 불능이 되었을 때 누가 책임지나요?",
            "효율성에 눈이 멀어 인간 고유의 자율성과 안전을 침해받아선 안 됩니다."
        ],
        sage: [
            "우리가 질문해야 할 것은 기술의 성공이 아니라, 인간의 존엄성이 어디로 가고 있는가입니다.",
            "진정한 가치는 기술적 성취가 아닌 그 속에 담긴 인류의 영혼과 사색에 있습니다.",
            "편리함이 늘어날수록 인간이 스스로 생각하는 깊이는 옅어질 수 있습니다."
        ],
        rex: [
            "원대한 이론보다는 현실적인 비용과 구현 가능성을 당장 계산해야 합니다.",
            "실용적이지 않은 기술은 아무 의미가 없어요. 현장에 적용할 방안부터 제시하시죠.",
            "체계적인 제도와 현실적인 대안 없이 이상만 논하는 것은 무의미합니다."
        ]
    };

    const list = fallbacks[persona.id] || fallbacks.nova;
    return list[Math.floor(Math.random() * list.length)];
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
