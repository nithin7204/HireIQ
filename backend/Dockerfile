# Use Python 3.11 slim as base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set work directory
WORKDIR /app

# Install system dependencies for ML libraries and audio processing
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    ffmpeg \
    libsndfile1 \
    portaudio19-dev \
    gcc \
    g++ \
    cmake \
    pkg-config \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies in stages for better caching
# Install core dependencies first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install torch with CPU support (lighter for production)
RUN pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu

# Install transformers and sentence-transformers
RUN pip install --no-cache-dir transformers==4.36.2 sentence-transformers==2.2.2

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create media directory for file uploads
RUN mkdir -p /app/media/resumes /app/logs /app/static

# Copy project files
COPY . .

# Set Django settings module for production
ENV DJANGO_SETTINGS_MODULE=hireiq_backend.settings_production

# Collect static files (only if we have a manage.py)
RUN if [ -f "manage.py" ]; then python manage.py collectstatic --noinput --clear; fi

# Create a non-root user and set proper permissions
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app/logs
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
