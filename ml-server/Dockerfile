FROM python:3.11-slim

RUN useradd -m -u 1001 appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

# Dedicated directory for model weights — mounted as a volume so downloads persist
RUN mkdir -p /models && chown appuser:appuser /models

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

# 2 workers: enough for concurrent frame batches without overloading CPU
# --timeout 120: allow slow frames on first inference after cold start
CMD ["gunicorn", "--workers", "2", "--timeout", "120", "--bind", "0.0.0.0:5000", "app:app"]
