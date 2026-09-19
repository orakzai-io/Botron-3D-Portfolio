// js/ui/chat.js
// Interactive BOTRON RAG Copilot Chat Interface
// Built with a plug-and-play FastAPI/RAG backend hook + built-in local knowledge retriever.

// =========================================================================
// RAG BACKEND INTEGRATION HOOK
// When your FastAPI / Python RAG server is live, simply set this URL:
// e.g. const RAG_API_URL = "https://your-api-endpoint.hf.space/chat";
// =========================================================================
const RAG_API_URL = "http://localhost:8000/chat"; // Local Python FastAPI RAG endpoint

// Built-in Knowledge Base for local answers & offline fallback (Dense dataset + URLs)
const KNOWLEDGE_BASE = [
  {
    id: "greetings",
    keywords: ["hi", "hello", "hey", "greetings", "good morning", "good evening", "howdy", "sup", "who are you", "what are you", "botron", "help", "what can you do", "introduce yourself", "assistant", "start"],
    response: "Greetings! I am <strong>BOTRON</strong>, Shahsawar's autonomous cyber-mech AI copilot. I've indexed his entire engineering portfolio, verified Harvard credentials, 5+ production AI/RAG systems, 4.0 CGPA academics, and athletic background into my knowledge base.<br><br>Feel free to ask me anything — for example: <em>'Tell me about REDNOTE'</em>, <em>'What is his tech stack?'</em>, <em>'What was his role at MINDGIGS?'</em>, or <em>'How do I contact Shaso?'</em>"
  },
  {
    id: "who_is_shaso",
    keywords: ["who is", "who is shaso", "about shaso", "about shahsawar", "bio", "biography", "background", "summary", "overview", "intro", "introduction", "tell me about him", "tell me about shaso", "who is he", "profile", "creator", "identity"],
    response: "<strong>Shahsawar Orakzai (Shaso)</strong> is a Full-Stack AI Engineer, backend systems architect, and Computer Science undergraduate maintaining a <strong>perfect 4.0 CGPA</strong> at the University of Agriculture, Peshawar (UAP).<br>• <strong>Specialization:</strong> Autonomous multi-agent systems, sub-250ms vector RAG architectures, and high-throughput async Python/FastAPI backends.<br>• <strong>Industry Track Record:</strong> Independent Freelancer delivering 5+ production AI applications and former Python Developer Intern at <strong>MINDGIGS</strong>.<br>• <strong>Athletic Discipline:</strong> 10 years as a National Swimmer winning 10+ provincial/national medals, Head Coach & IT Manager for KP Swimming Association, and competitive chess player."
  },
  {
    id: "traits_strengths",
    keywords: [
      "trait", "traits", "strength", "strengths", "attention to detail", "fast learner", "disciplined", "discipline",
      "work ethic", "mindset", "personality", "qualities", "characteristics", "speed", "problem solving", "habit", "habits", "attitude"
    ],
    response: "<strong>Core Traits & Professional DNA of Shahsawar (Shaso):</strong><br>• <strong>High Attention to Detail:</strong> Obsesses over architectural elegance, type safety, strict runtime schema validation via Pydantic, zero-knowledge cryptographic guarantees (VaultGuard), and sub-250ms query SLAs.<br>• <strong>Fast Learner & Adaptable:</strong> Maintains a <strong>perfect 4.0 CGPA</strong> in Computer Science at UAP, completed dual <strong>Harvard CS50x & CS50P</strong> certifications, and rapidly self-masters bleeding-edge AI tooling (Qdrant, pgvector, FastEmbed, Groq SLMs, n8n).<br>• <strong>Athletic Discipline & Speed:</strong> Cultivated over a decade as a <strong>National Swimmer (10+ Medals, Gold Medalist)</strong>. Brings an athlete's stamina, composure under pressure, and relentless work ethic to intense engineering deadlines.<br>• <strong>Strategic Problem-Solving:</strong> Competitive chess player who designs modular architectures with tactical foresight, planning several moves ahead for edge cases, scale, and clean abstractions."
  },
  {
    id: "projects_all",
    keywords: ["project", "projects", "work", "built", "builds", "showcase", "apps", "applications", "creations", "what did he make", "portfolio projects", "software", "systems"],
    response: "<strong>Shahsawar's Flagship Engineering Projects:</strong><br>1. <strong>REDNOTE:</strong> Enterprise RAG document search assistant with sub-250ms vector queries over 10,000+ chunks (<a href='https://orakzai-io-rednote.hf.space' target='_blank' style='color:#00f0ff;'>Live Demo ↗</a> | <a href='https://github.com/orakzai-io/Rednote.git' target='_blank' style='color:#00f0ff;'>Code ↗</a>).<br>2. <strong>Async Web Scraper:</strong> Distributed intelligence pipeline handling 50k+ raw web pages daily with Groq LLM normalization & n8n (<a href='https://orakzai-io-async-web-scraper.hf.space' target='_blank' style='color:#00f0ff;'>Live Demo ↗</a> | <a href='https://github.com/orakzai-io/Async-Web-Scraper.git' target='_blank' style='color:#00f0ff;'>Code ↗</a>).<br>3. <strong>VaultGuard:</strong> Zero-knowledge credential vault with client-side AES-256-GCM + PBKDF2 (<a href='https://github.com/orakzai-io/Vault-Guard.git' target='_blank' style='color:#00f0ff;'>Code ↗</a> | <a href='https://youtu.be/-OcbtZTuibo?si=o0BBKnni7OCR09bJ' target='_blank' style='color:#00f0ff;'>Video ↗</a>).<br>4. <strong>3D Cyber-Mech Portfolio:</strong> Three.js WebGL canvas stage with inverse-kinematics gaze tracking & BOTRON copilot (<a href='https://orakzai.io' target='_blank' style='color:#00f0ff;'>Live ↗</a>)."
  },
  {
    id: "rednote",
    keywords: ["rednote", "rag", "vector", "pgvector", "retrieval", "chunk", "chunks", "document", "pdf", "qdrant", "fastembed", "embedding", "embeddings", "semantic"],
    response: "<strong>REDNOTE</strong> is Shaso's flagship RAG document assistant:<br>• <strong>Performance:</strong> Sub-250ms semantic search queries over 10,000+ indexed chunks using PostgreSQL + <strong>pgvector</strong>.<br>• <strong>Pipeline:</strong> Automated PDF upload, recursive chunking, dense embeddings, JWT auth, and autonomous AI agents.<br>• <strong>DevOps:</strong> Dockerized with GitHub Actions CI/CD deploying in &lt;3 minutes.<br>• <a href='https://orakzai-io-rednote.hf.space' target='_blank' style='color:#00f0ff;'>Live Demo ↗</a> | <a href='https://github.com/orakzai-io/Rednote.git' target='_blank' style='color:#00f0ff;'>Source Code ↗</a>"
  },
  {
    id: "scraper",
    keywords: ["scraper", "async", "scraping", "groq", "n8n", "pipeline", "50k", "crawl", "crawler", "extraction", "distributed"],
    response: "<strong>Async Web Scraper & Intelligence Pipeline:</strong><br>• Distributed pipeline processing <strong>50k+ raw web pages daily</strong> into PostgreSQL at a <strong>99.2% extraction success rate</strong>.<br>• Rate-limited and normalized via <strong>Groq LLM</strong> inference + <strong>n8n</strong> workflow automation.<br>• Real-time TypeScript monitoring dashboard with 3-second interval polling, cutting manual verification by 90%.<br>• <a href='https://orakzai-io-async-web-scraper.hf.space' target='_blank' style='color:#00f0ff;'>Live Demo ↗</a> | <a href='https://github.com/orakzai-io/Async-Web-Scraper.git' target='_blank' style='color:#00f0ff;'>Source Code ↗</a>"
  },
  {
    id: "vaultguard",
    keywords: ["vault", "vaultguard", "security", "encryption", "password", "crypto", "aes", "pbkdf2", "credentials", "zero-knowledge"],
    response: "<strong>VaultGuard (Zero-Knowledge Credential Vault):</strong><br>• Client-side authenticated <strong>AES-256-GCM</strong> encryption with <strong>PBKDF2</strong> master-key derivation (100k+ iterations).<br>• <strong>Sub-50ms</strong> cryptographic latency; server and PostgreSQL host never possess plaintext secrets or master keys.<br>• Built with Python, JavaScript, PostgreSQL, Docker.<br>• <a href='https://github.com/orakzai-io/Vault-Guard.git' target='_blank' style='color:#00f0ff;'>Source Code ↗</a> | <a href='https://youtu.be/-OcbtZTuibo?si=o0BBKnni7OCR09bJ' target='_blank' style='color:#00f0ff;'>Video Demo ↗</a>"
  },
  {
    id: "portfolio_3d",
    keywords: ["portfolio", "3d", "three", "webgl", "nexbot", "botron", "canvas", "animation", "shaders", "lenis", "gsap", "stage"],
    response: "<strong>3D Cyber-Mech Portfolio (orakzai.io):</strong><br>• Custom Three.js WebGL canvas stage starring NEXBOT with real-time inverse-kinematics cursor gaze tracking.<br>• Lenis smooth-scrolling synchronized with GSAP ScrollTrigger ticker at locked 60 FPS.<br>• Mathematical 3D holographic skills globe and integrated BOTRON vector RAG copilot.<br>• <a href='https://orakzai.io' target='_blank' style='color:#00f0ff;'>Live Site ↗</a> | <a href='https://github.com/orakzai-io/Personal-Portfolio.git' target='_blank' style='color:#00f0ff;'>Source Code ↗</a>"
  },
  {
    id: "experience",
    keywords: ["experience", "work", "job", "career", "mindgigs", "freelance", "intern", "internship", "employment", "history", "roles", "companies"],
    response: "<strong>Professional Work Experience:</strong><br>1. <strong>Independent Freelancer (Present · Remote):</strong> Delivered 5+ full-stack AI applications (LLMs, pgvector/Qdrant, TypeScript, Docker) with 100% on-time completion and sub-200ms FastAPI backends.<br>2. <strong>MINDGIGS (Dec 2025 – Feb 2026 · Peshawar):</strong> Python Developer Intern. Lifted REST API throughput by ~40% with FastAPI/asyncio, integrated Intel Small LLMs (SLMs), and built Docker scraping pipelines handling 20k+ daily records.<br>3. <strong>KP Swimming Association (Present · Seasonal):</strong> IT Manager & Coach. Digitized database records for 200+ athletes (cutting admin time 90%) and coached 30+ swimmers to podium finishes."
  },
  {
    id: "education",
    keywords: ["education", "degree", "university", "cgpa", "gpa", "cs50", "harvard", "certificate", "certificates", "school", "uap", "academic", "courses", "study"],
    response: "<strong>Academic Background & Harvard Credentials:</strong><br>• <strong>BS Computer Science (BSCS):</strong> University of Agriculture, Peshawar (Oct 2024 – Oct 2028 Expected) with a <strong>perfect 4.0 CGPA</strong>.<br>• <strong>Harvard CS50x (Feb 2026):</strong> Intro to Computer Science (<a href='https://certificates.cs50.io/46d6924e-c5e2-49f5-8639-90d52ebb90d1.pdf' target='_blank' style='color:#00f0ff;'>Verify Certificate ↗</a>).<br>• <strong>Harvard CS50P (Oct 2025):</strong> Programming with Python (<a href='https://certificates.cs50.io/9847b334-9e42-4281-a696-a6e5cc35b008.pdf' target='_blank' style='color:#00f0ff;'>Verify Certificate ↗</a>)."
  },
  {
    id: "swimming",
    keywords: ["swim", "swimming", "athlete", "medal", "medals", "sports", "coach", "chess", "championship", "kp", "gold"],
    response: "<strong>Athletic Discipline & Leadership:</strong><br>• Spent <strong>10 years as a National Swimmer</strong> representing KP province across Pakistan, earning <strong>10+ provincial and national medals</strong> including <strong>Gold at National Junior Swimming Championships</strong>.<br>• Serves as <strong>Head Coach & IT Manager</strong> for KP Swimming Association, mentoring 30+ swimmers and digitizing records for 200+ athletes.<br>• Off the terminal, trains tactical foresight and pattern recognition in competitive chess."
  },
  {
    id: "testimonials",
    keywords: ["testimonial", "testimonials", "review", "reviews", "feedback", "clients", "client", "upwork", "rating", "recommendation", "recommendations"],
    response: "<strong>Verified Client & Peer Recommendations:</strong><br>• <strong>Vivek Pippala (AI Engineer · Upwork 5★):</strong> <em>'Shahsawar optimized our RAG search pipeline using pgvector and FastAPI, delivering sub-second response times across indexed document chunks.'</em><br>• <strong>Awais Khan (Software Engineer · 5★):</strong> <em>'His technical mastery of async Python, REST APIs, and Docker containerization significantly boosted our backend throughput.'</em><br>• <strong>Muhammad Husnain (Web Developer · 5★):</strong> <em>'One of the most talented full-stack devs I've worked with — integrated modern LLM endpoints and TypeScript cleanly.'</em>"
  },
  {
    id: "tech_stack",
    keywords: ["stack", "skills", "tech", "technologies", "languages", "tools", "python", "fastapi", "react", "typescript", "backend", "frontend", "devops", "docker", "postgres", "sql"],
    response: "<strong>Technical Stack Matrix (25 Core Competencies):</strong><br>• <strong>AI & LLMs:</strong> RAG Architectures, pgvector, Qdrant, ChromaDB, FastEmbed, Groq API, OpenAI API, LangChain, LangSmith, Autonomous Agents, Prompt Engineering.<br>• <strong>Backend & Data:</strong> Python, FastAPI, Asyncio, Pydantic, PostgreSQL, SQLAlchemy, C/C++.<br>• <strong>DevOps & Cloud:</strong> Docker, GitHub Actions CI/CD (&lt;3 min builds), Linux/Bash, Hugging Face, Vercel.<br>• <strong>Frontend:</strong> TypeScript, JavaScript ES6+, React, Modern CSS3, HTML5.<br>• <strong>Tools:</strong> n8n automation, Git/GitHub, VS Code, pgAdmin."
  },
  {
    id: "contact",
    keywords: ["contact", "hire", "email", "phone", "reach", "github", "linkedin", "social", "resume", "cv", "touch", "call", "message"],
    response: "<strong>Contact & Professional Coordinates:</strong><br>• <strong>Email:</strong> <a href='mailto:shahsawar.dev@gmail.com' style='color:#00f0ff;'>shahsawar.dev@gmail.com</a> | <a href='mailto:shaso@orakzai.io' style='color:#00f0ff;'>shaso@orakzai.io</a><br>• <strong>Phone:</strong> +92 343 8925150<br>• <strong>Resume:</strong> <a href='assets/Shahsawar.dev.pdf' download style='color:#00f0ff;'>Download PDF ↗</a><br>• <strong>GitHub:</strong> <a href='https://github.com/orakzai-io' target='_blank' style='color:#00f0ff;'>github.com/orakzai-io ↗</a><br>• <strong>LinkedIn:</strong> <a href='https://linkedin.com/in/orakzai-io' target='_blank' style='color:#00f0ff;'>linkedin.com/in/orakzai-io ↗</a><br>• <strong>Hugging Face:</strong> <a href='https://huggingface.co/orakzai-io' target='_blank' style='color:#00f0ff;'>huggingface.co/orakzai-io ↗</a><br>• <strong>Twitter/X:</strong> <a href='https://x.com/orakzai_io' target='_blank' style='color:#00f0ff;'>@orakzai_io ↗</a>"
  }
];

function findLocalAnswer(query) {
  const clean = query.toLowerCase().replace(/[?!.,;:'"()]/g, " ").trim();
  if (!clean) return "";

  const words = clean.split(/\s+/).filter(Boolean);

  // 1. Direct match scoring across all knowledge base entries
  let bestItem = null;
  let bestScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (clean === kw) {
        score += 25; // exact match
      } else if (clean.includes(kw)) {
        // Multi-word phrase or compound keyword match
        score += kw.includes(" ") ? 16 : (kw.length > 4 ? 9 : 4);
      } else if (words.includes(kw)) {
        score += 8;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  if (bestItem && bestScore >= 4) {
    return bestItem.response;
  }

  // 2. Intelligent, context-rich fallback instead of a repetitive error message
  return `I have indexed Shahsawar's full engineering dossier. Here is a quick snapshot:
<br>• <strong>AI & Systems:</strong> High-throughput FastAPI backends, vector RAG (<a href="https://github.com/orakzai-io/Rednote.git" target="_blank" style="color:#00f0ff;">REDNOTE</a>), and autonomous agent workflows.
<br>• <strong>Academics:</strong> 4.0 CGPA Computer Science major at UAP with dual <strong>Harvard CS50x & CS50P</strong> credentials.
<br>• <strong>Core Traits:</strong> High attention to detail, rapid learner, athletic discipline, and strategic problem-solving.
<br><br>Would you like details on his <strong>projects</strong>, <strong>technical stack</strong>, <strong>work experience</strong>, or <strong>contact info</strong>?`;
}

export function initChat() {
  const fab = document.getElementById("nx-chat-fab");
  const win = document.getElementById("nx-chat-window");
  const closeBtn = document.getElementById("nx-chat-close-btn");
  const messagesContainer = document.getElementById("nx-chat-messages");
  const input = document.getElementById("nx-chat-input");
  const sendBtn = document.getElementById("nx-chat-send-btn");
  const suggestionsContainer = document.getElementById("nx-chat-suggestions");
  const botronBubble = document.getElementById("botron-bubble");
  const scrollBtn = document.getElementById("nx-chat-scroll-btn");

  if (!win || !input || !messagesContainer) return;

  let isOpen = false;

  function syncBubbleState(open) {
    if (!botronBubble) return;
    const textEl = botronBubble.querySelector("p");
    if (!textEl) return;
    if (open) {
      textEl.innerHTML = `// <span style="color:#00f0ff">RAG COPILOT ONLINE • [CLICK TO CLOSE]</span>`;
    } else {
      textEl.innerHTML = `// <span style="color:#00f0ff">COPILOT MINIMIZED • [CLICK TO REOPEN]</span>`;
    }
  }

  function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
      // Second tick ensures layout updates (typing dots, markdown render) are accounted for
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: smooth ? "smooth" : "auto"
        });
        updateScrollBtn();
      }, 50);
    });
  }

  function openChat() {
    isOpen = true;
    win.classList.add("is-open");
    win.setAttribute("aria-hidden", "false");
    syncBubbleState(true);
    input.focus();
    scrollToBottom(false);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove("is-open");
    win.setAttribute("aria-hidden", "true");
    syncBubbleState(false);
  }

  function toggleChat() {
    if (isOpen) closeChat();
    else openChat();
  }

  if (fab) fab.addEventListener("click", toggleChat);
  if (closeBtn) closeBtn.addEventListener("click", closeChat);

  // Hide BOTRON chat button when reaching footer so all social icons are clean to scan
  const footerEl = document.querySelector(".nx-footer");

  function updateFabFooterVisibility() {
    if (!fab || !footerEl) return;
    const footerRect = footerEl.getBoundingClientRect();
    // When the footer enters the bottom of the viewport
    const isAtFooter = footerRect.top <= (window.innerHeight - 10);
    if (isAtFooter) {
      fab.classList.add("is-footer-hidden");
    } else {
      fab.classList.remove("is-footer-hidden");
    }
  }

  if (footerEl && fab) {
    if ("IntersectionObserver" in window) {
      const footerObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              fab.classList.add("is-footer-hidden");
            } else {
              updateFabFooterVisibility();
            }
          });
        },
        { rootMargin: "0px 0px -10px 0px", threshold: 0 }
      );
      footerObs.observe(footerEl);
    }

    window.addEventListener("scroll", updateFabFooterVisibility, { passive: true });
    window.addEventListener("resize", updateFabFooterVisibility, { passive: true });
    updateFabFooterVisibility();
  }

  // Hook into the 3D robot speech bubble — click to toggle open/close
  if (botronBubble) {
    botronBubble.addEventListener("click", () => {
      toggleChat();
    });
  }

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeChat();
    }
  });

  // Hide the quick suggestion chips after the user asks their first question
  function hideSuggestions() {
    if (suggestionsContainer && !suggestionsContainer.classList.contains("is-hidden")) {
      suggestionsContainer.classList.add("is-hidden");
    }
  }

  function getTimeString() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatMarkdown(text) {
    if (!text) return "";
    // If already contains HTML markup from knowledge base, preserve it
    if (/<(strong|em|a|code|br|span|ul|li)[\s>]/i.test(text)) {
      return text;
    }
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return html
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^[-•*]\s+(.*)$/gm, "• $1")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }

  function appendMessage(text, sender = "bot", meta = null) {
    const msgEl = document.createElement("div");
    msgEl.className = `nx-chat-msg nx-chat-msg--${sender}`;

    let metaHtml = "";
    if (meta && meta.sources && meta.sources.length) {
      const topSources = meta.sources
        .slice(0, 2)
        .map((s) => `${s.title.split("—")[0].trim()}`)
        .join(", ");
      const sim = meta.sources[0]?.similarity ? ` • ${(meta.sources[0].similarity * 100).toFixed(0)}% MATCH` : "";
      const latency = meta.retrieval_time_ms ? ` • ${meta.retrieval_time_ms}ms` : "";
      metaHtml = `
        <div class="nx-chat-meta">
          <span class="nx-meta-badge">⚡ VECTOR RAG</span>
          <span class="nx-meta-details">${topSources}${sim}${latency}</span>
        </div>
      `;
    }

    const contentHtml = sender === "user" ? text : formatMarkdown(text);

    msgEl.innerHTML = `
      <div class="nx-chat-bubble">${contentHtml}</div>
      ${metaHtml}
      <span class="nx-chat-time">${getTimeString()}</span>
    `;
    messagesContainer.appendChild(msgEl);
    scrollToBottom(true);
  }

  // --- Scroll-to-bottom button ---
  function updateScrollBtn() {
    if (!scrollBtn) return;
    const distFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    if (distFromBottom > 80) {
      scrollBtn.classList.add("is-visible");
    } else {
      scrollBtn.classList.remove("is-visible");
    }
  }

  messagesContainer.addEventListener("scroll", updateScrollBtn, { passive: true });

  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      scrollToBottom(true);
    });
  }

  function showTypingIndicator() {
    const typingEl = document.createElement("div");
    typingEl.className = "nx-chat-typing";
    typingEl.id = "nx-chat-typing";
    typingEl.innerHTML = `
      <span class="nx-chat-typing-dot"></span>
      <span class="nx-chat-typing-dot"></span>
      <span class="nx-chat-typing-dot"></span>
      <span class="nx-chat-typing-txt">RETRIEVING FROM KNOWLEDGE BASE...</span>
    `;
    messagesContainer.appendChild(typingEl);
    scrollToBottom(true);
  }

  function removeTypingIndicator() {
    const typingEl = document.getElementById("nx-chat-typing");
    if (typingEl) typingEl.remove();
  }

  async function handleSendMessage(text) {
    const query = text || input.value.trim();
    if (!query) return;

    // Disappear suggested options after the first user question
    hideSuggestions();

    appendMessage(query, "user");
    input.value = "";
    showTypingIndicator();

    // 1. If FastAPI backend URL is set and accessible, query it via HTTP POST
    if (RAG_API_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for local server
        const response = await fetch(RAG_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          removeTypingIndicator();
          appendMessage(data.answer || data.response || "No response generated.", "bot", data);
          return;
        }
      } catch (err) {
        console.warn("[RAG] API fetch failed or offline, falling back to smart local retriever:", err);
      }
    }

    // 2. High-precision local semantic retriever fallback
    setTimeout(() => {
      removeTypingIndicator();
      const answer = findLocalAnswer(query);
      appendMessage(answer, "bot");
    }, 400);
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", () => handleSendMessage());
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Handle Quick Chips click
  if (suggestionsContainer) {
    suggestionsContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".nx-chat-chip");
      if (chip && chip.dataset.query) {
        handleSendMessage(chip.dataset.query);
      }
    });
  }
}

// Auto-boot chat once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChat);
} else {
  initChat();
}
