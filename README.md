# SimpleAndLightweightERP

The goal of this little project is give a good experience with a open-source selfhosted ERP system with a lightweight and simple installation.

## Quick Start with Docker

### Production Deployment

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Build and start the services:**
   ```bash
   docker-compose up -d
   ```

3. **Verify the application is running:**
   ```bash
   curl http://localhost:3000/health
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

5. **Stop the services:**
   ```bash
   docker-compose down
   ```

### Development Mode

For development with live code reloading and debugging support:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will:
- Mount your source code for live changes
- Expose port 9229 for Node.js debugging
- Use development environment settings

To rebuild after dependency changes:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## Configuration

Environment variables can be configured in the `.env` file:

- `BACKEND_PORT` - Backend service port (default: 3000)
- `NODE_ENV` - Environment mode (production/development)
- `LOCALDATABASE_PATH` - SQLite database location
- `API_KEY` - API authentication key

## Available Endpoints

- `GET /health` - Health check endpoint
- `GET /testApi` - Test API endpoint

## Project Structure

```
SimpleAndLightweightERP/
├── backend/          # Backend Node.js application
├── frontend/         # Frontend application (coming soon)
├── docker-compose.yml           # Production configuration
├── docker-compose.dev.yml       # Development configuration
└── .env.example                 # Environment template
```
