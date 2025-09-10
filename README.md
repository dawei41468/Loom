# Loom - Weave Your Days Together

*weave your days together*

A modern couples' scheduling and coordination app that helps partners plan, share, and coordinate their schedules seamlessly.

## ✨ Features

### 🎯 **Core Functionality**
- **Event Management**: Create, view, and manage personal and shared events with visibility controls.
- **Partner Coordination**: Invite partners via email and coordinate schedules together.
- **Time Proposals**: Propose meeting times with multiple slots and get instant accept/decline responses.
- **Event Collaboration**: Engage in real-time chat and manage shared checklists for each event.
- **Calendar Integration**: A full calendar view with month, week, and day modes, plus event filtering.
- **Task Management**: Personal task lists with due dates and completion tracking.
- **Availability Finding**: Automatically find overlapping free time slots between partners.

### 🔐 **Authentication & User Management**
- Secure user registration and login with email/password.
- JWT-based authentication with secure refresh tokens.
- Full partner invitation and connection/disconnection workflow.
- User profile management with customizable preferences.

### 📱 **User Experience**
- **Real-time Collaboration**: Instant updates for chat, events, and proposals via WebSockets.
- **Responsive PWA**: A mobile-first, installable Progressive Web App that works offline.
- **Beautiful Woven UI**: A unique design system where shared events "weave" partner colors together.
- **Dark/Light Theme**: System-aware theme switching.
- **Toast Notifications**: Real-time feedback for all user actions.

### 🛠 **Technical Features**
- **Type-Safe**: Full TypeScript implementation
- **API-First**: Comprehensive REST API with FastAPI
- **Database**: MongoDB with proper data modeling
- **State Management**: React Context (`useReducer`) & TanStack React Query
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Performance**: Code splitting, lazy loading, and caching

## 🏗️ Architecture

### Frontend (`/src`)
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── pages/              # Route components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── api/                # API client and utilities
└── types/              # TypeScript type definitions
```

### Backend (`/backend`)
```
backend/
├── app/
│   ├── routers/        # API route handlers
│   ├── models/         # Pydantic models
│   ├── auth/           # Authentication utilities
│   ├── database/       # MongoDB connection
│   └── middleware/     # Custom middleware
└── requirements.txt    # Python dependencies
```

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Query** - Powerful data fetching and caching
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **Lucide Icons** - Consistent icon system

### Backend
- **FastAPI** - Modern, fast web framework for Python
- **WebSockets** - For real-time, bidirectional communication.
- **MongoDB** - NoSQL database with the async `motor` driver.
- **Pydantic** - Data validation and serialization.
- **JWT** - JSON Web Tokens for authentication.
- **Bcrypt** - Password hashing.

### DevOps & Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Docker** - Containerization (planned)

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- MongoDB (local or cloud instance)

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Start FastAPI server
uvicorn app.main:app --reload --port 7500
```

### Environment Variables

Create `.env` in the backend directory:
```env
# Database
MONGODB_URL=mongodb://localhost:27017/loom
DATABASE_NAME=loom

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# API
API_V1_STR=/api/v1
PROJECT_NAME=Loom API
```

## 📊 Current Status

### ✅ **Functionally Complete**
- **Core Features**: All primary features are implemented and stable, including user authentication, partner invitations (via email), event/task management, the proposal system, and availability finding.
- **Real-time System**: The application uses WebSockets for instant updates, replacing the old polling system.
- **Advanced Collaboration**: Event-specific chat and shared checklists are fully functional.
- **Data Persistence**: All data loading and persistence issues have been resolved. The app correctly fetches and saves data for all sections.
- **UI/UX**: The application is fully responsive, mobile-first, and includes a polished UI with dark/light themes.

### ⚠️ **Partially Implemented**
- **Push Notifications**: The frontend service worker is ready to receive push notifications, but the backend service to send them is not yet implemented.

### 📋 **Planned Features**
- **Comprehensive Testing**: Adding `pytest` and `React Testing Library` test suites.
- **Recurring Events**: Support for creating events that repeat on a schedule.
- **Calendar Integrations**: Allowing users to sync with Google Calendar or Outlook.

## 📚 API Documentation

The API is fully documented with OpenAPI/Swagger. When running the backend server, visit:
- **Swagger UI**: `http://localhost:7500/docs`
- **ReDoc**: `http://localhost:7500/redoc`
- **OpenAPI JSON**: `http://localhost:7500/openapi.json`

### Key Endpoints
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/events` - List user events
- `POST /api/v1/events` - Create new event
- `POST /api/v1/partner/invite` - Invite partner
- `POST /api/v1/proposals` - Create time proposal
- `GET /api/v1/availability/find-overlap` - Find free time slots

## 🧪 Development

### Available Scripts
```bash
# Frontend
npm run dev  # Runs on port 7100 dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Backend
cd backend
uvicorn app.main:app --reload  # Start with auto-reload
```

## 🧑‍💻 Local development (post‑production)

Local setup is aligned with production paths while using dev ports.

- Frontend dev server: `http://localhost:7100` (Vite)
- Backend dev server: `http://localhost:7500` (FastAPI)
- API base path: `/api`

### 1) Backend

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Use the dev env file expected by app.config (APP_ENV=development by default)
cp .env.example .env.development

# Start FastAPI on port 7500
uvicorn app.main:app --reload --port 7500
```

The backend reads `backend/.env.development` in development. Ensure `CORS_ORIGINS` includes `http://localhost:7100`.

### 2) Frontend

Create a project‑root `.env.development` with API base URL:

```bash
echo "VITE_API_BASE_URL=http://localhost:7500/api" > .env.development
```

Then run Vite:

```bash
npm install
npm run dev  # serves on http://localhost:7100
```

### 3) WebSocket URL

The frontend `src/hooks/useWebSocket.ts` derives the WS endpoint from `VITE_API_URL` or `VITE_API_BASE_URL`. With the above env, it will connect to:

- `ws://localhost:7500/api/partner/ws?token=...`

which matches the backend route defined in `backend/app/main.py` (`/partner/ws`) under the API prefix `/api`.

### Code Quality
- **ESLint**: Configured for React/TypeScript best practices
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking enabled
- **Git Hooks**: Pre-commit hooks for quality checks

### Testing
```bash
# Frontend tests (when implemented)
npm run test

# Backend tests (when implemented)
cd backend
pytest
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🛡️ Production Deployment (Tencent HK)

This project is deployed similar to LOS on a Tencent Lighthouse (Hong Kong) server.

- Server: `ubuntu@124.156.174.180`
- Domain: `https://loom.studiodtw.net`
- Backend: PM2 process `loom-backend` bound to `127.0.0.1:4100` (FastAPI via Gunicorn/Uvicorn)
- Frontend: Static files served by Nginx from `/var/www/loom-frontend`
- Nginx vhost file in repo: `nginx/loom.studiodtw.net`

### Server‑managed secrets

- The real backend env file lives on the server at `~/Loom/backend/.env.production`.
- The repo only contains `backend/.env.production.example` (placeholders, no secrets).
- `.env.production` is gitignored and is excluded from deploy uploads.
- Deploy does not delete the remote backend directory to preserve the server env file.

### One‑time setup

- Ensure Cloudflare Origin certificates exist on the server:
  - `/etc/ssl/certs/cloudflare-origin.crt`
  - `/etc/ssl/private/cloudflare-origin.key`
- Install PM2, Python 3, and Node.js on the server.
- DNS A record for `loom.studiodtw.net` should point to the server IP.

### Deploy steps
```bash
# From repo root
bash deploy-nginx-loom.sh     # install/update Nginx vhost and reload
bash deploy-backend.sh        # upload backend (without .env.production), install deps, start PM2
bash deploy-frontend.sh       # build on server, copy to /var/www/loom-frontend
```

### Health checks

- Backend local: `curl -I http://127.0.0.1:4100/health`
- Public API: `https://loom.studiodtw.net/api/health`
- Site: `https://loom.studiodtw.net`

### Troubleshooting

- PM2 logs: `pm2 logs loom-backend`
- Nginx test/reload: `sudo nginx -t && sudo systemctl reload nginx`

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- **shadcn/ui** - Beautiful UI components
- **FastAPI** - Excellent Python web framework
- **React Query** - Powerful data fetching
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide** - Consistent icon system

## 📞 Support

For questions or support, please create an issue in the repository.

---

**Loom** - Built for love, designed for life. 💕
