# backend/knowledge.py
"""
Dense, comprehensive knowledge base about Shahsawar Orakzai for Vector RAG.
Includes full resume details, metrics, architecture deep-dives, live URLs, and verified links.
"""

CHUNKS = [
    {
        "id": "shahsawar_photo",
        "title": "Photos of Shahsawar",
        "category": "bio",
        "content": (
            "If the visitor asks for a photo, picture, portrait, image or snapshot of Shahsawar (including \"swimming photo\", \"chess photo\", or just \"swimming\"/\"chess\" when clearly about an image), reply with an html <img> tag and no other words.\n"
            "Choose the file by topic: assets/professionalpic.webp for a general portrait or headshot; assets/swimmingpic.webp for swimming, medals, coaching or athletics; assets/chesspic.webp for chess. Emit all three in that order only if they ask for every photo.\n"
            "Every tag must carry class=\"nx-chat-photo\", alt text describing the photo, and loading=\"lazy\". Example:\n"
            '<img class="nx-chat-photo" src="assets/professionalpic.webp" alt="Shahsawar Orakzai in a suit and tie" loading="lazy">'
            "Never describe a photograph in words and never invent any other image URL.\n"
        )
    },    {
        "id": "identity_overview",

        "title": "Identity, Bio & Quick Facts",
        "category": "bio",
        "content": (
            "Shahsawar Orakzai is a Full-Stack AI Engineer, backend systems architect, "
            "and Computer Science undergraduate maintaining a perfect 4.0 CGPA at the University of Agriculture, Peshawar (UAP). "
            "He specializes in designing autonomous multi-agent systems, sub-250ms vector RAG architectures, and high-throughput "
            "async backends. Beyond software engineering, he competed for a decade as a National Swimmer winning 10+ medals "
            "(including Gold at National Junior Swimming Championships), serves as IT Manager & Head Coach for KP Swimming Association, "
            "and trains tactical foresight in competitive chess.\n"
            "• Location: Peshawar, Pakistan\n"
            "• Email: shahsawar.dev@gmail.com\n"
            "• Phone: +92 343 8925150\n"
            "• Portfolio: https://orakzai.io\n"
            "• GitHub: https://github.com/orakzai-io\n"
            "• LinkedIn: https://linkedin.com/in/orakzai-io\n"
            "• Hugging Face: https://huggingface.co/orakzai-io\n"
            "• Twitter/X: https://x.com/orakzai_io\n"
            "• Instagram: https://www.instagram.com/orakzai.io/"
        )
    },
    {
        "id": "core_traits_discipline",
        "title": "Core Traits, Professional DNA & Work Ethic",
        "category": "traits",
        "content": (
            "Key Personal & Professional Traits of Shahsawar Orakzai:\n"
            "1. High Attention to Detail: Obsesses over architectural elegance, type safety, strict runtime schema "
            "validation via Pydantic, sub-250ms query SLAs, and cryptographic precision (e.g. zero-knowledge AES-256-GCM in VaultGuard).\n"
            "2. Fast Learner & Intellectual Curiosity: Maintains a perfect 4.0 CGPA at the University of Agriculture, Peshawar (UAP), "
            "earned dual Harvard University credentials (CS50x & CS50P), and rapidly self-masters state-of-the-art AI tooling "
            "(Qdrant, pgvector, FastEmbed, Groq SLMs, LangChain, n8n).\n"
            "3. Athletic Discipline & Execution Speed: Forged over a 10-year career as a competitive National Swimmer (10+ Medals, "
            "including Gold at National Junior Swimming Championships). Operates with elite stamina, laser focus, and composure under deadline pressure.\n"
            "4. Strategic Problem-Solving: Competitive chess player who approaches system design with tactical foresight, "
            "anticipating edge cases, concurrency bottlenecks, and failure modes well before writing code."
        )
    },
    {
        "id": "education_credentials",
        "title": "Education, Academic Standing & Harvard CS50 Certifications",
        "category": "education",
        "content": (
            "Academic Credentials and Formal Certifications for Shahsawar Orakzai:\n"
            "1. Bachelor of Science in Computer Science (BSCS):\n"
            "   - Institution: University of Agriculture, Peshawar (UAP), Pakistan\n"
            "   - Duration: October 2024 – October 2028 (Expected)\n"
            "   - Academic Performance: Perfect 4.0 CGPA\n"
            "   - Core Coursework: Programming Fundamentals, Data Structures & Algorithms (DSA), "
            "Object-Oriented Programming (OOP), Database Systems, System Design.\n"
            "2. Harvard University CS50x: Introduction to Computer Science\n"
            "   - Issued: February 2026 (Remote)\n"
            "   - Verification URL: https://certificates.cs50.io/46d6924e-c5e2-49f5-8639-90d52ebb90d1.pdf\n"
            "   - Focus: C, memory allocation, pointers, algorithmic complexity, data structures, and computer science foundations.\n"
            "3. Harvard University CS50P: Introduction to Programming with Python\n"
            "   - Issued: October 2025 (Remote)\n"
            "   - Verification URL: https://certificates.cs50.io/9847b334-9e42-4281-a696-a6e5cc35b008.pdf\n"
            "   - Focus: Advanced Python programming, OOP, functional paradigms, error handling, regex, and unit testing."
        )
    },
    {
        "id": "experience_freelance",
        "title": "Work Experience — Independent Full-Stack AI Engineer",
        "category": "experience",
        "content": (
            "Role: Full-Stack AI Engineer (Independent Freelancer / Remote)\n"
            "Timeline: Present (Active)\n"
            "Key Deliverables & Engineering Metrics:\n"
            "• Delivered 5+ production-grade full-stack AI applications integrating LLMs, autonomous AI agents, "
            "vector databases (pgvector / Qdrant), and modern TypeScript user interfaces with 100% on-time delivery.\n"
            "• Architected scalable FastAPI backends delivering sub-200ms average response times under zero-downtime production deployments.\n"
            "• Designed multi-tenant RAG retrieval pipelines, JWT auth systems, hybrid search mechanisms, and structured LLM tool-calling workflows.\n"
            "• Client projects include enterprise document search, asynchronous scraping intelligence, and zero-knowledge data platforms."
        )
    },
    {
        "id": "experience_mindgigs",
        "title": "Work Experience — Python Developer Intern at MINDGIGS",
        "category": "experience",
        "content": (
            "Role: Python Developer Intern at MINDGIGS (Peshawar, Pakistan)\n"
            "Timeline: December 2025 – February 2026\n"
            "Key Contributions & Engineering Metrics:\n"
            "• Engineered high-throughput RESTful APIs using FastAPI and asyncio, boosting API request throughput by approximately 40% "
            "while enforcing strict runtime data validation via Pydantic schemas.\n"
            "• Integrated local Intel® Small LLMs (SLMs) for on-premise text extraction and summarization tasks without external API latency.\n"
            "• Built and containerized distributed data scraping pipelines with Docker, successfully processing 20,000+ records daily with "
            "automated error retries and PostgreSQL ingestion."
        )
    },
    {
        "id": "swimming_leadership",
        "title": "Athletic Discipline — National Swimmer, IT Manager & Head Coach",
        "category": "background",
        "content": (
            "Athletic Career, Coaching & Leadership (Khyber Pakhtunkhwa Swimming Association):\n"
            "• 10 Years as a National Swimmer: Competed on starting blocks representing KP province across Pakistan for a full decade. "
            "Won 10+ provincial and national medals, including a Gold Medal at the National Junior Swimming Championships.\n"
            "• IT Manager (KP Swimming Association): Spearheaded digital transformation by engineering an in-house database management system "
            "digitizing records for 200+ provincial athletes. Automated event administration and timing workflows, cutting administrative "
            "processing time by 90%.\n"
            "• Head Coach: Designed progressive physical conditioning and technical stroke mechanics programs, coaching and mentoring "
            "30+ junior swimmers to multiple regional and provincial podium finishes.\n"
            "• Engineering Philosophy: Views software performance through the lens of competitive swimming—obsessing over hundredths "
            "of a second, latency, continuous discipline, and high-pressure execution."
        )
    },
    {
        "id": "project_rednote_detail",
        "title": "Project Deep-Dive — REDNOTE (Enterprise Vector RAG System)",
        "category": "projects",
        "content": (
            "REDNOTE — Flagship Full-Stack RAG Document Assistant (June 2026):\n"
            "• Core Problem: Enterprise document search over dense PDFs is traditionally slow, hallucinatory, and non-contextual.\n"
            "• Architecture & Tech Stack: Python, FastAPI, autonomous AI Agents, pgvector, PostgreSQL, TypeScript, Docker, GitHub Actions CI/CD.\n"
            "• Performance Metric: Achieved sub-250ms query response times across 10,000+ indexed chunks using PostgreSQL with the pgvector extension.\n"
            "• Ingestion Pipeline: Automated end-to-end processing pipeline including PDF upload, recursive chunking, dense vector embeddings, "
            "and cosine similarity ranking.\n"
            "• Security & Authentication: Complete JWT authentication with secure session management, guest-to-registered user conversions, and rate limits.\n"
            "• DevOps: Fully containerized with multi-stage Docker builds. Automated GitHub Actions CI/CD pipeline building and deploying in under 3 minutes.\n"
            "• Code Repository: https://github.com/orakzai-io/Rednote.git\n"
            "• Live Production Demo: https://orakzai-io-rednote.hf.space"
        )
    },
    {
        "id": "project_scraper_detail",
        "title": "Project Deep-Dive — Async Web Scraper & Groq LLM Pipeline",
        "category": "projects",
        "content": (
            "Async Web Scraper & Intelligence Ingestion Pipeline (April 2026):\n"
            "• Core Problem: High-volume web scraping frequently suffers from rate-limiting, unstructured schemas, and manual data cleanup.\n"
            "• Architecture & Tech Stack: Python, asyncio, n8n workflow automation, Groq LLM, PostgreSQL, TypeScript, Docker.\n"
            "• Throughput & Reliability: Distributed asynchronous pipeline processing 50,000+ raw web pages daily into PostgreSQL with a 99.2% extraction success rate.\n"
            "• AI Transformation: Leveraged Groq LLM inference for ultra-fast natural language parsing, content extraction, and intelligent rate-limiting.\n"
            "• Real-Time Telemetry: Built a custom TypeScript monitoring dashboard with 3-second interval polling, reducing manual verification overhead by 90%.\n"
            "• Code Repository: https://github.com/orakzai-io/Async-Web-Scraper.git\n"
            "• Live Production Demo: https://orakzai-io-async-web-scraper.hf.space"
        )
    },
    {
        "id": "project_vaultguard_detail",
        "title": "Project Deep-Dive — VaultGuard (Zero-Knowledge Credential Vault)",
        "category": "projects",
        "content": (
            "VaultGuard — Zero-Knowledge Cryptographic Credential Vault:\n"
            "• Core Problem: Traditional password managers expose user master secrets to server-side attacks or database breaches.\n"
            "• Cryptographic Design: Implements PBKDF2 (Password-Based Key Derivation Function 2) with 100,000+ iterations for master-key generation, "
            "combined with client-side authenticated AES-256-GCM symmetric encryption.\n"
            "• Zero-Knowledge Guarantee: Cryptographic encryption and decryption occur strictly on the client side in sub-50ms latency. "
            "Neither the PostgreSQL database nor server host ever sees plaintext passwords or encryption keys.\n"
            "• Tech Stack: Python, JavaScript, AES-256-GCM, PBKDF2, PostgreSQL, Docker containerization.\n"
            "• Code Repository: https://github.com/orakzai-io/Vault-Guard.git\n"
            "• Video Walkthrough & Demo: https://youtu.be/-OcbtZTuibo?si=o0BBKnni7OCR09bJ"
        )
    },
    {
        "id": "project_portfolio_detail",
        "title": "Project Deep-Dive — 3D Cyber-Mech Portfolio & BOTRON AI Assistant",
        "category": "projects",
        "content": (
            "Personal 3D Interactive Portfolio (orakzai.io):\n"
            "• Concept & Vision: A living cyberpunk 3D WebGL experience moving away from generic static templates. "
            "Starred by BOTRON, an interactive 3D robot model with real-time inverse-kinematics cursor gaze tracking and procedural dot-matrix LED eyes.\n"
            "• 3D & Graphics Engine: Custom Three.js stage, PMREM environment lighting, procedural room reflection, mathematical 3D spherical skills globe "
            "rendered on 2D canvas with zero WebGL context overhead.\n"
            "• Choreography & Performance: Lenis smooth-scroll engine synchronized with a GSAP ScrollTrigger ticker. Render loop targets 60 FPS during active scroll, touch and cursor tracking, and throttles to 20 FPS when idle so the tab stays cheap and cool.\n"
            "• Asset Optimization: Extracted the binary GLB model directly from raw glTF buffers and optimized it to 322 KB with the Meshopt decoder, cutting it roughly in half for fast mobile loading.\n"
            "• Deliberate Low-Power Render Path: The Three.js renderer requests a low-power GPU, disables antialiasing and shadow maps, drops the ground plane, and runs 70 atmosphere particles. A second, richer quality tier (380 particles, shadow maps, higher DPR) is preserved in docs/quality-tiers.md.\n"
            "• AI Assistant (BOTRON): Autonomous AI wired to a vector RAG pipeline with Groq LLM (120B/27B/20B automatic multi-model failover).\n"
            "• Code Repository: https://github.com/orakzai-io/Personal-Portfolio.git\n"
            "• Live Website: https://orakzai.io"
        )
    },
    {
        "id": "skills_ai_llm_full",
        "title": "Technical Skills Matrix — AI, LLMs & Vector Retrieval",
        "category": "skills",
        "content": (
            "Comprehensive AI & LLM Technical Competencies:\n"
            "• RAG Systems: Dense semantic vector search, recursive semantic chunking, hybrid keyword-vector retrieval, sub-250ms query latency.\n"
            "• Vector Databases & Indexes: pgvector (IVFFlat and HNSW indexing in PostgreSQL), Qdrant, ChromaDB, FastEmbed.\n"
            "• LLM APIs & Frameworks: Groq Cloud API (Llama, Qwen, GPT-OSS), OpenAI API (GPT-4o, o1, o3-mini), LangChain, LangSmith (observability & tracing).\n"
            "• Autonomous Agents: Multi-agent orchestration, state loops, tool-calling pipelines, structured Pydantic outputs, system guardrails.\n"
            "• Prompt Engineering: Few-shot elicitation, system persona architecture, structured JSON schemas, hallucination suppression.\n"
            "• Local SLMs: Intel Small LLMs (SLMs) and quantized models deployed on CPU edge environments."
        )
    },
    {
        "id": "skills_backend_devops_full",
        "title": "Technical Skills Matrix — Backend, Systems & DevOps",
        "category": "skills",
        "content": (
            "Comprehensive Backend, Systems & DevOps Competencies:\n"
            "• Core Languages: Python (Asyncio, OOP, high concurrency, algorithms), TypeScript, JavaScript (ES6+), C/C++ (memory management, data structures), SQL, Bash.\n"
            "• Backend Frameworks: FastAPI, Pydantic (data validation, strict serialization), SQLAlchemy (async ORM, connection pooling), RESTful API design.\n"
            "• Databases: PostgreSQL (complex indexing, CTEs, relational modeling, pgvector), SQLite, Redis caching patterns.\n"
            "• DevOps & Cloud: Docker (multi-stage lightweight builds), Docker Compose, GitHub Actions (automated CI/CD deploying under 3 mins), Git, Linux/POSIX Bash, Hugging Face Spaces, Vercel, Cloudflare."
        )
    },
    {
        "id": "skills_frontend_graphics_full",
        "title": "Technical Skills Matrix — Frontend, 3D WebGL & Tools",
        "category": "skills",
        "content": (
            "Comprehensive Frontend, WebGL & Tooling Competencies:\n"
            "• Web & 3D Graphics: Three.js (3D scenes, GLTF/GLB loaders, Meshopt, lighting, shadows, cameras), WebGL, HTML5 Canvas math projections, GSAP motion, Lenis smooth scroll.\n"
            "• Frontend Frameworks & Styling: React, TypeScript, Modern CSS3 (Glassmorphism, CSS variables, cyber-mech HUD design, responsive grid/flexbox, accessibility).\n"
            "• Automation & Developer Tooling: n8n platform (webhook triggers, automated event ETL flows), Git/GitHub (feature branch, rebase, PR workflows), VS Code, pgAdmin."
        )
    },
    {
        "id": "testimonials_reviews",
        "title": "Client Testimonials & Verified Recommendations",
        "category": "testimonials",
        "content": (
            "Verified Client & Peer Reviews:\n"
            "1. Vivek Pippala (AI Engineer · Verified via Upwork, 5/5 Stars):\n"
            "   \"Shahsawar optimized our RAG search pipeline using pgvector and FastAPI, delivering sub-second response times across indexed document chunks.\"\n"
            "2. Awais Khan (Software Engineer · Direct Client, 5/5 Stars):\n"
            "   \"His technical mastery of async Python, REST APIs, and Docker containerization significantly boosted our backend throughput.\"\n"
            "3. Muhammad Husnain (Web Developer · Direct Collaboration, 5/5 Stars):\n"
            "   \"One of the most talented full-stack devs I've worked with — integrated modern LLM endpoints and TypeScript interfaces cleanly.\""
        )
    },
    {
        "id": "contact_hiring_availability",
        "title": "Contact Details, Hiring Availability & Engagement Terms",
        "category": "contact",
        "content": (
            "How to Reach Shahsawar Orakzai & Availability:\n"
            "• Available Roles: Open to Full-Stack AI Engineer positions, RAG & Vector Systems Consulting, and Autonomous Agent Development.\n"
            "• Email: shahsawar.dev@gmail.com | shaso@orakzai.io\n"
            "• Phone: +92 343 8925150\n"
            "• Direct Message Form: Available on portfolio via Formspree (https://formspree.io/f/meevnwzk)\n"
            "• Portfolio: https://orakzai.io\n"
            "• LinkedIn: https://linkedin.com/in/orakzai-io\n"
            "• GitHub: https://github.com/orakzai-io\n"
            "• Twitter / X: https://x.com/orakzai_io\n"
            "• Hugging Face: https://huggingface.co/orakzai-io"
        )
    }
]
