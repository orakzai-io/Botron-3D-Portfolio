# 🤖 BOTRON RAG Microservice (FastAPI + Groq + Vector Retrieval)

High-performance Retrieval-Augmented Generation (RAG) backend for Shahsawar Orakzai's interactive 3D portfolio.

---

## ⚡ Architecture
- **Framework:** FastAPI (Python 3.11)
- **Vector Retrieval:** FastEmbed (`BAAI/bge-small-en-v1.5`) with cosine similarity
- **LLM Generation:** Groq Cloud (`llama-3.3-70b-versatile` or `llama-3.1-8b-instant`)
- **Knowledge Base:** Chunked facts on projects (REDNOTE, Async Scraper, VaultGuard), tech stack, swimming career, and contact details.

---

## 🚀 Quickstart (Local Development)

### 1. Create a virtual environment & install requirements
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure your Groq API Key
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and set your `GROQ_API_KEY` and model list:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
# Prioritized: 120B (Best) -> 27B (Mid) -> 20B (Fallback):
GROQ_MODELS=openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b
PORT=8000
```

### 3. Run the server
```bash
python main.py
# Or with uvicorn directly:
uvicorn main:app --reload --port 8000
```

The interactive Swagger docs will be live at: `http://localhost:8000/docs`

---

## 🌐 1-Click Free Deployment to Hugging Face Spaces (Docker)

1. Create a new Space on [Hugging Face Spaces](https://huggingface.co/spaces).
2. Choose **Docker** as the SDK.
3. Push the files in this `backend/` folder to your Hugging Face Space repo.
4. In Space Settings -> **Repository Secrets**, add:
   - Secret Name: `GROQ_API_KEY`
   - Secret Value: Your Groq API key
5. Your Space URL will be:
   `https://<your-username>-<space-name>.hf.space/chat`
6. Put this URL in your frontend at `js/ui/chat.js`:
   ```javascript
   const RAG_API_URL = "https://<your-username>-<space-name>.hf.space/chat";
   ```
