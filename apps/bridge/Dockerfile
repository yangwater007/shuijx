FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy only Python deps first
COPY apps/bridge/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only needed Python files
COPY ths_bridge_v3.py .
COPY apps/bridge/main.py apps/bridge/
COPY apps/bridge/tools/ apps/bridge/tools/

WORKDIR /app/apps/bridge

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
