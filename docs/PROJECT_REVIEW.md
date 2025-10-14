# Weave Your Days - Project Review

## Overview
**Weave Your Days** (now called **Loom**) is a sophisticated full-stack web application designed for couples to coordinate their schedules and tasks together. The app features a modern React frontend with a FastAPI backend, using MongoDB for data persistence.

## Architecture

### Tech Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context + useReducer
- **Routing**: React Router v6
- **API Client**: Custom API client with token management
- **Data Fetching**: TanStack React Query
- **UI Components**: Radix UI primitives with custom styling
- **PWA**: Service Worker and Web App Manifest
- **Push Notifications**: Web Push API with VAPID keys and topic-based subscriptions

#### Backend
- **Framework**: FastAPI with Python
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Pydantic models
- **CORS**: Configured for cross-origin requests
- **Documentation**: Auto-generated OpenAPI/Swagger
- **Push Notifications**: pywebpush for Web Push with VAPID
- **Reminders**: Background task for event reminders via push
- **Service Layer**: Dedicated services for events, proposals, tasks, chat, checklists, partner

## Current Implementation Status

### ✅ Fully Implemented Features

#### Authentication System
- User registration and login with email/password.
- JWT-based authentication with refresh tokens.
- Password hashing with bcrypt.
- Protected routes and onboarding flow.
- Full user profile management with backend persistence.

#### Events & Proposals
- Full CRUD operations for events with visibility controls (shared, private, title_only).
- Real-time proposal system with accept/decline functionality.
- Automatic event creation from accepted proposals.
- Support for multiple time slots in proposals.
- Event chat and shared checklists.

#### Partner & Availability
- Complete partner invitation system via email.
- Partner connection and disconnection handling.
- Availability finder to identify overlapping free time between partners.

#### Real-time System
- **WebSocket Integration**: Replaced polling with a robust WebSocket system for instant, bidirectional communication.
- Real-time notifications for proposals, events, and partner status changes.
- Heartbeat mechanism to ensure stable connections.
- Offline message queuing.

#### UI/UX & PWA
- Fully responsive, mobile-first design with a consistent UI/UX.
- Dark/light theme support.
- Comprehensive toast notification system.
- PWA capabilities with offline support via a service worker.
- Full calendar implementation with multiple views and filters.

### ⚠️ Partially Implemented Features

- None (all core features complete; push notifications now fully implemented with backend service, topics, and integration).

### 📋 Planned or Future Enhancements

- Recurring events support.
- Integration with external calendars (Google Calendar, Outlook).
- Advanced search and filtering capabilities.
- Data export/import functionality.
- Monitoring and analytics dashboard.

## File Structure

```
/Loom/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # MongoDB connection
│   │   ├── models.py            # Pydantic models
│   │   ├── websocket.py         # WebSocket utilities
│   │   ├── email.py             # Email utilities (invite email)
│   │   ├── services.py          # Service helpers (incl. push notifications)
│   │   ├── cache.py             # In-memory cache (dev) / pluggable
│   │   ├── reminders.py         # Background reminders task
│   │   ├── middleware.py        # Custom middleware
│   │   ├── security.py          # Security utilities
│   │   ├── utils.py             # Shared utilities
│   │   └── routers/
│   │       ├── auth.py          # Authentication & profile
│   │       ├── events.py        # Event CRUD + chat/checklist routes
│   │       ├── tasks.py         # Task CRUD
│   │       ├── proposals.py     # Proposal system
│   │       ├── partner.py       # Partner connect/disconnect, invites
│   │       ├── availability.py  # Availability finding
│   │       ├── websockets.py    # WebSocket endpoints
│   │       └── push.py          # Push notification subscriptions
│   └── requirements.txt         # Python dependencies (incl. pywebpush)
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (accordion, alert, etc.)
│   │   ├── forms/               # Reusable form primitives (DatePicker, TimePicker, etc.)
│   │   ├── CustomCalendar.tsx   # Calendar UI
│   │   ├── EventChat.tsx        # Event chat UI
│   │   ├── EventChecklist.tsx   # Event checklist UI
│   │   ├── Layout.tsx           # Main layout
│   │   ├── NotificationSettings.tsx # Push notification preferences
│   │   ├── OfflineIndicator.tsx # Offline status
│   │   ├── QRCodeModal.tsx      # QR code utilities
│   │   └── ...
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── CalendarUIContext.tsx
│   │   ├── PushNotificationContext.tsx # Push notification management
│   │   ├── ToastContext.tsx
│   │   └── UIContext.tsx
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Calendar.tsx
│   │   ├── Add/                 # Event/Proposal forms (AddPage.tsx, EventForm.tsx, ProposalForm.tsx)
│   │   ├── Partner.tsx
│   │   ├── Invite.tsx
│   │   ├── Settings.tsx
│   │   ├── Tasks.tsx
│   │   ├── Proposals.tsx
│   │   └── EventDetail.tsx
│   ├── api/
│   │   ├── client.ts            # API client with token refresh
│   │   └── queries.ts           # React Query keys and wrappers
│   ├── hooks/
│   │   ├── useWebSocket.ts      # WebSocket setup
│   │   ├── usePartnerWebSocket.ts
│   │   ├── useOfflineQueue.ts   # Offline queueing for chat/checklist
│   │   ├── usePolling.ts        # Fallback polling (secondary to WS)
│   │   ├── useAsyncOperation.ts # Async helpers
│   │   └── ...
│   ├── types.ts                 # TypeScript definitions
│   ├── i18n/                    # Internationalization
│   └── index.css                # Tailwind CSS v4
├── public/                      # Static assets (icons, sw.js, sounds)
├── docs/                        # Documentation (reviews, guides, plans)
├── nginx/                       # Nginx configs for staging/production
├── scripts/                     # Build scripts (e.g., generate-icons.mjs)
└── package.json                 # Frontend dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password
- `DELETE /api/auth/me` - Delete account

### Events
- `GET /api/events` - Get user's events
- `POST /api/events` - Create event
- `GET /api/events/{id}` - Get specific event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `GET /api/events/{id}/messages` - List event chat messages
- `POST /api/events/{id}/messages` - Send message
- `DELETE /api/events/{id}/messages/{messageId}` - Delete message
- `GET /api/events/{id}/checklist` - List checklist items
- `POST /api/events/{id}/checklist` - Create checklist item
- `PUT /api/events/{id}/checklist/{itemId}` - Update checklist item
- `DELETE /api/events/{id}/checklist/{itemId}` - Delete checklist item

### Tasks
- `GET /api/tasks` - Get user's tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/{id}` - Get specific task
- `PATCH /api/tasks/{id}/toggle` - Toggle completion
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Proposals
- `GET /api/proposals` - Get user's proposals
- `POST /api/proposals` - Create proposal
- `POST /api/proposals/{id}/accept` - Accept proposal
- `POST /api/proposals/{id}/decline` - Decline proposal
- `GET /api/proposals/{id}` - Get specific proposal

### Availability
- `POST /api/availability/find-overlap` - Find available slots
- `GET /api/availability/user-busy` - Get busy times

### Partner
- `GET /api/partner` - Get partner info
- `POST /api/partner/invite` - Invite partner
- `POST /api/partner/accept/{id}` - Accept partnership
- `POST /api/partner/decline/{id}` - Decline partnership

### Push Notifications
- `POST /api/push/subscribe` - Create/update push subscription
- `DELETE /api/push/subscribe` - Deactivate subscription
- `PUT /api/push/subscribe/topics` - Update notification topics
- `POST /api/push/test` - Send test notification (dev only)

## Critical Gaps to Address

The core feature set is robust, stable, and production-ready. Remaining gaps focus on testing, monitoring, and enhancements.

### High Priority
1.  **Comprehensive Testing**: Add unit/integration tests for backend (pytest) and frontend (React Testing Library, Vitest) to cover services, components, and API flows.

### Medium Priority
1.  **Monitoring & Logging**: Implement structured logging (e.g., structlog) and metrics (Prometheus) for production observability.
2.  **Error Boundaries & Resilience**: Add global error handling in frontend and retry logic for WebSocket/push failures.

### Low Priority (Future Enhancements)
1.  **Recurring Events**: Support repeating events with scheduling rules.
2.  **Calendar Integrations**: Sync with Google Calendar/Outlook via OAuth.
3.  **Advanced Analytics**: Usage insights and export features.

## Development Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Use .env.development (see backend/.env.example)
uvicorn app.main:app --reload --port 7500
```

### Frontend
```bash
npm install
npm run dev  # Runs on port 7100 (see vite.config.ts)
```

### Environment Variables
```env
# Backend (.env.example)
ENV=dev
PROJECT_NAME=Loom
API_V1_STR=/api
SECRET_KEY=CHANGE_ME_LONG_RANDOM
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_MINUTES=10080
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=loom
CORS_ORIGINS=["http://localhost:7100","http://localhost:7500"]

# Frontend (.env.example)
VITE_API_BASE_URL=http://localhost:7500/api
VITE_USE_REAL_API=false
```

## Key Improvements Made

### Since Original Review
1.  **Real-time System Overhaul**: Replaced polling with WebSocket integration for instant updates.
2.  **Data Persistence Corrected**: Resolved loading issues; full React Query adoption for server state.
3.  **Advanced Features Implemented**: Event chat, shared checklists, email invites, push notifications (full Web Push with topics), event reminders (background task).
4.  **State Management Refined**: Context + useReducer for UI; React Query for data; optimistic updates across CRUD.
5.  **Codebase Refinements**: Service layer extracted (events, proposals, tasks, chat, checklists); large components broken down (AddPage, forms); many improvements from `docs/CODEBASE_IMPROVEMENT_SUGGESTIONS.md` implemented.
6.  **Deployment Enhancements**: PM2 configs, Nginx setups, staging/production envs, deploy scripts.

## Recommendations

1. **Add comprehensive testing** - Unit/integration tests for services, components, APIs.
2. **Enhance monitoring** - Logging, metrics, error tracking for production.
3. **Harden resilience** - WebSocket reconnects, push retry logic, offline handling.
4. **Implement advanced features** - Recurring events, external calendar sync.
5. **Performance tuning** - List virtualization, bundle optimization if needed.

## Conclusion

The project has matured considerably. Push notifications, reminders, and code refactors (service layer, optimistic updates) are now complete. Core features are stable and production-ready.

The codebase follows modern practices: async FastAPI backend with service abstraction, React Query for data, Context for UI state, and full PWA support including push.

**Current Status**: Fully functional for core scheduling/coordination. Next: testing suite and monitoring for sustained production use.