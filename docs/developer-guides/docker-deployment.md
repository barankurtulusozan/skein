# 🐳 Docker Deployment Guide

Skein can be built and deployed in isolated containers using Docker Compose. This guides you through building the images, managing local database persistence, and configuring OpenAI-compatible credentials.

---

## 🚀 Running with Docker Compose

Ensure you have [Docker](https://www.docker.com/) and Docker Compose installed.

### 1. Configure environment keys
Provide your OpenAI API key to the backend executor using environment variables:

```bash
# Set your OpenAI API key in your current shell
export OPENAI_API_KEY="your-api-key-here"
```

### 2. Build and launch services
Start both backend Fastify server and Nginx web client services in detached mode:

```bash
# Build and spin up the containers
docker compose up --build -d
```

- **Frontend Builder Canvas**: http://localhost:3000
- **Fastify Backend REST API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

### 3. Stop containers
To stop the services and release ports:

```bash
docker compose down
```

---

## 💾 Volume Persistence

The `docker-compose.yml` mounts a volume named `db-data` mapping to `/app/apps/server/db` inside the server container.
All saved workflows and run execution history logs are preserved inside this volume even if you stop, rebuild, or update the container image.

---

## 🔍 Log Verification

To inspect running logs or debug execution steps:

```bash
# Stream server logs
docker compose logs -f server

# Stream client logs
docker compose logs -f web
```
