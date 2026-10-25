FROM python:3.10-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y build-essential

# Install Python requirements
COPY requirements.txt .
# Increase timeout to 120 seconds and add default retries
RUN pip install --no-cache-dir --default-timeout=120 -r requirements.txt

# Copy backend source code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]