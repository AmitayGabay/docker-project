# Use a Python 3.11 image optimized for size
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies first (leverages Docker caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code (including main.py)
COPY . .

# Expose the port that Uvicorn (FastAPI server) will run on
EXPOSE 8000

# Command to run the application using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]