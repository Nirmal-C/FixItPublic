# 1. Use an official Python runtime as a parent image
FROM python:3.11-slim

# 2. Set environment variables
# Prevents Python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# Prevents Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED 1

# 3. Set work directory inside the container
WORKDIR /app

# 4. Install system dependencies for PostgreSQL (psycopg2)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python dependencies
# We copy this first to leverage Docker caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of your local project code into the container
COPY . .

# 7. Expose the port Django runs on
EXPOSE 8000

# 8. Command to run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]