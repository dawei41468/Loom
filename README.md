# Loom - Weave Your Days Together

*weave your days together*

A modern couples' scheduling and coordination app that helps partners plan, share, and coordinate their schedules seamlessly.

## ✨ Features

### 🎯 **Core Functionality**
- **Event Management**: Create, view, and manage personal and shared events
- **Partner Coordination**: Invite partners and coordinate schedules together
- **Time Proposals**: Propose meeting times and get instant responses
- **Calendar Integration**: Full calendar view with event filtering and navigation
- **Task Management**: Personal task lists with due dates and completion tracking
- **Availability Finding**: Automatically find overlapping free time slots

### 🔐 **Authentication & User Management**
- Secure user registration and login
- JWT-based authentication with refresh tokens
- Partner invitation and connection system
- Profile management with customizable preferences

### 📱 **User Experience**
- **Responsive Design**: Optimized for mobile and desktop
- **Real-time Updates**: Automatic data refresh every 30 seconds
- **Offline Support**: Service worker for offline functionality
- **Dark/Light Theme**: System-aware theme switching
- **Toast Notifications**: Real-time feedback for all actions
- **Loading States**: Skeleton loaders and progress indicators

### 🛠 **Technical Features**
- **Type-Safe**: Full TypeScript implementation
- **API-First**: Comprehensive REST API with FastAPI
- **Database**: MongoDB with proper data modeling
- **State Management**: React Context with optimistic updates
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
- **MongoDB** - NoSQL database with flexible schemas
- **Pydantic** - Data validation and serialization
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

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

### ✅ **Fully Implemented**
- Complete user authentication system
- Partner invitation and connection
- Event creation, viewing, and management
- Proposal system with accept/decline
- Calendar view with filtering
- Task management
- Real-time polling updates
- Responsive mobile-first design
- Comprehensive error handling
- Toast notification system

### 🔄 **In Progress**
- Settings page profile persistence
- Individual event detail loading
- Data fetching pattern standardization
- Context API integration improvements

### 📋 **Planned Features**
- WebSocket real-time updates
- Push notifications
- Calendar integrations (Google, Outlook)
- Advanced availability algorithms
- Shared checklists for events
- Time zone management
- Recurring events
- Event reminders and notifications

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
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Backend
cd backend
uvicorn app.main:app --reload  # Start with auto-reload
```

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

**Loom** - Making coordination effortless, one shared moment at a time.
