FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the fastembed model into the image layer at build time.
# This means ZERO network download on cold starts — the model is baked in.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')"

# Copy application source
COPY . .

# Binds to the port the platform injects. Hardcoding a port here (7860 for HF
# Spaces, 8000 locally) breaks on any host that assigns its own, which is what
# FastAPI Cloud does -- the container comes up healthy and the platform still
# reports the app as unreachable.
ENV PORT=8000
EXPOSE 8000

# sh -c so $PORT is expanded at runtime by the shell, not baked in at build time.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
