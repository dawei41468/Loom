# Weave Your Days - Project Review

## Overview
**Weave Your Days** (now called **Loom**) is a full-stack web application designed for couples to coordinate schedules, proposals, and tasks together. It uses a React + TypeScript frontend, a FastAPI backend, and MongoDB for persistence.

## Architecture

### Tech Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query for server state; React Context for UI/auth state
- **Routing**: React Router v6
- **API Client**: Custom API client with token management
- **Data Fetching**: TanStack React Query
- **UI Components**: Radix UI primitives with custom styling
- **PWA**: Service Worker + Web App Manifest (production-only SW registration)
- **Offline Actions**: IndexedDB-backed offline action queue for event chat + checklist operations

#### Backend
- **Framework**: FastAPI with Python
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Pydantic models
- **CORS**: Configured for cross-origin requests
- **Documentation**: Auto-generated OpenAPI/Swagger
- **Rate limiting**: slowapi (notably on auth endpoints)
- **Caching**: Redis in production (optional) with in-memory fallback; Redis is intentionally disabled in development
- **Reminders**: Background reminders loop exists but is gated by `FEATURE_PUSH_NOTIFICATIONS` (disabled by default)
- **Service Layer**: Service layer modules under `backend/app/service_layer/` for events, proposals, tasks, chat, checklist, partner

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
- Partner connection and disconnection handling.
- Invite-link flow for partner connection via invite tokens.

#### Real-time System
- **WebSocket Integration**: Real-time WebSockets for partner-level updates and per-event updates.
- Real-time notifications for proposals and events.
- Heartbeat mechanism to ensure stable connections.
- Client-side offline action queue (IndexedDB) for chat/checklist mutations.
- Polling still exists as a fallback mechanism (30s) when authenticated.

#### UI/UX & PWA
- Fully responsive, mobile-first design with a consistent UI/UX.
- Dark/light theme support.
- Comprehensive toast notification system.
- PWA capabilities with offline support via a service worker (cached app shell + limited cached GET API responses).
- Full calendar implementation with multiple views and filters.

### ⚠️ Partially Implemented Features

- **Partner invite via email**: Email infrastructure exists, but the current partner flow is invite-links (token URLs). Email sending is not the primary/required invite mechanism in the current backend routes.
- **Availability overlap**: Current `availability` endpoints use a simplified “partner events” heuristic rather than using the actual connected partner relationship.

### 📋 Planned or Future Enhancements

- Recurring events support.
- Integration with external calendars (Google Calendar, Outlook).
- Advanced search and filtering capabilities.
- Data export/import functionality.
- Monitoring and analytics dashboard.
- Comprehensive tests (backend + frontend).
- Production observability (structured logs, error tracking, metrics).

## File Structure

```
/Loom/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # MongoDB connection
│   │   ├── models.py            # Pydantic models
│   │   ├── websocket.py         # WebSocket connection manager + handlers
│   │   ├── email.py             # Email utilities
│   │   ├── services.py          # Notification helpers
│   │   ├── cache.py             # Redis (prod) / in-memory (dev) cache manager
│   │   ├── reminders.py         # Background reminders loop (feature-flagged)
│   │   ├── middleware.py        # Custom middleware
│   │   ├── security.py          # Security utilities
│   │   ├── utils.py             # Shared utilities
│   │   ├── routers/
│   │   │   ├── auth.py          # Authentication & profile
│   │   │   ├── events.py        # Event CRUD + chat/checklist routes + event WS
│   │   │   ├── tasks.py         # Task CRUD
│   │   │   ├── proposals.py     # Proposal system
│   │   │   ├── partner.py       # Partner connect/disconnect + invite tokens
│   │   │   ├── availability.py  # Availability finding
│   │   │   └── websockets.py    # Partner WebSocket endpoint
│   │   └── service_layer/       # Business logic + DB interaction layer
│   └── requirements.txt         # Python dependencies
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (accordion, alert, etc.)
│   │   ├── forms/               # Reusable form primitives (DatePicker, TimePicker, etc.)
│   │   ├── CustomCalendar.tsx   # Calendar UI
│   │   ├── EventChat.tsx        # Event chat UI
│   │   ├── EventChecklist.tsx   # Event checklist UI
│   │   ├── Layout.tsx           # Main layout
│   │   ├── OfflineIndicator.tsx # Offline status + pending queue indicator
│   │   ├── QRCodeModal.tsx      # QR code utilities
│   │   └── ...
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── CalendarUIContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── UIContext.tsx
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Calendar.tsx
│   │   ├── Add/                 # Event/Proposal forms
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
│   │   ├── useWebSocket.ts      # Per-event WebSocket
│   │   ├── usePartnerWebSocket.ts
│   │   ├── useOfflineQueue.ts   # IndexedDB offline action queue
│   │   ├── usePolling.ts        # Fallback polling
│   │   └── ...
│   ├── types.ts                 # TypeScript definitions
│   ├── i18n/                    # Internationalization
│   └── index.css                # Tailwind CSS
├── public/                      # Static assets (icons, sw.js, sounds)
├── docs/                        # Documentation
├── nginx/                       # Nginx configs
├── scripts/                     # Build scripts
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
- `WS /api/events/{id}/ws?token=...` - Event WebSocket (real-time updates)

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
- `POST /api/partner/generate-invite` - Generate invite token + invite URL
- `GET /api/partner/check-invite/{token}` - Validate invite token + inviter info
- `POST /api/partner/connect` - Connect using invite token
- `DELETE /api/partner` - Disconnect from current partner
- `GET /api/partner/check-email/{email}` - Check if email is registered
- `WS /api/partner/ws?token=...` - Partner WebSocket (partner + proposal + event notifications)

## Critical Gaps to Address

The core feature set is robust and usable end-to-end. Remaining gaps are primarily correctness (availability), operational hardening (tests/observability), and clarifying/finishing some “almost there” features.

### High Priority
1.  **Comprehensive Testing**: Add unit/integration tests for backend (pytest) and frontend (e.g., React Testing Library + a test runner) to cover services, components, and API flows.
2.  **Availability Correctness**: Update availability computation to use the *actual connected partner* instead of the current heuristic.

### Medium Priority
1.  **Monitoring & Logging**: Implement structured logging and production observability.
2.  **Offline Behavior Clarity**: Keep offline mutations as in-app queue sync (while app is open); do not rely on service worker background sync.

### Low Priority (Future Enhancements)
1.  **Recurring Events**: Support repeating events with scheduling rules.
2.  **Calendar Integrations**: Sync with Google Calendar/Outlook via OAuth.
3.  **Advanced Analytics**: Usage insights and export features.

## Development Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Backend selects env file based on APP_ENV:
# - production -> backend/.env.production
# - default -> backend/.env.development
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
# NOTE:
# - APP_ENV controls which env file is loaded (development/production)
# - ENV is the app's internal environment setting (often 'dev' in local)
APP_ENV=development
ENV=dev
PROJECT_NAME=Loom
API_V1_STR=/api
SECRET_KEY=CHANGE_ME_LONG_RANDOM
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_MINUTES=10080
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=loom
CORS_ORIGINS=["http://localhost:7100","http://localhost:7500"]

# Optional: used to generate invite URLs
FRONTEND_BASE_URL=http://localhost:7100

# Frontend (.env.example)
VITE_API_BASE_URL=http://localhost:7500/api
# Optional: origin-only base (used to build ws:// URLs). If omitted, VITE_API_BASE_URL is used.
VITE_API_URL=http://localhost:7500
```
## Deployment (Current)

### Production
- **Domain**: `https://loom.studiodtw.net`
- **Frontend**: served by nginx from `/var/www/loom-frontend`
- **Backend**: `gunicorn` (uvicorn worker) via PM2, bound to `127.0.0.1:4100` (see `ecosystem.config.js`)
- **API proxy**: nginx proxies `/api/` to `http://127.0.0.1:4100` (preserves the `/api` prefix)
- **WebSockets**:
  - Partner WS: `/api/partner/ws`
  - Event WS: `/api/events/{event_id}/ws`

### Deploy scripts (repo)
- **Backend**: `./deploy-backend.sh`
  - Copies `backend/` to server (excludes `venv` and `.env*` files)
  - Creates/updates `backend/venv`, installs `backend/requirements.txt`, restarts PM2 process

- **Frontend**: `./deploy-frontend.sh`
  - Uploads a tarball of repo frontend files, builds on server, copies `dist/` to nginx web root
- **nginx**: `./deploy-nginx-loom.sh`
  - Uploads `nginx/loom.studiodtw.net` to `/etc/nginx/sites-available/`, symlinks into `sites-enabled`, tests config, reloads nginx

## Design / Implementation Notes (Consolidated)

### What is already implemented
- **Backend service layer**: routers delegate to `backend/app/service_layer/*`.
- **React Query server state**: queries are the source of truth for server-derived lists/details; mutations use optimistic cache updates + invalidation.
- **Forms primitives**: shared inputs in `src/components/forms/` are used across Add flows and event chat/checklist.
- **Real-time updates**: WebSocket hooks update caches for partner/proposal/event updates.
- **Offline support**:
  - In-app IndexedDB offline action queue for chat/checklist mutations.
  - Service worker caching for app shell + GET API responses.

### Known limitations / technical debt
- **Service worker background sync** is intentionally not used; offline mutations sync via the in-app queue when the app is open.
- **Availability overlap** uses a simplified heuristic rather than the actual connected partner relationship.

### Push notifications (future: Push v1 plan)
- **Goal**: Send real-time notifications when the recipient is not actively in the app (complements WebSockets).
- **Platforms (v1)**: Android Chrome PWA + desktop Chromium browsers first; iOS Safari later.
- **Notification types (v1)**:
  - Chat: new message
  - Events: new event created
  - Proposals: accepted / declined
- **Content**: no message previews (title/body only; user opens Loom to view details).
- **Delivery**: pure Web Push (VAPID). No Firebase.
- **Frontend UX**:
  - Single setting: “Enable notifications”.
  - Request permission only after explicit user intent (avoid prompting on first load).
- **Backend responsibilities**:
  - Store push subscriptions per user (multiple devices).
  - Send push to partner on the trigger events above; never notify the actor.
  - Log per-delivery attempt; remove subscriptions that return 404/410.
- **Service worker responsibilities**:
  - Handle `push` event and display notification.
  - Handle `notificationclick` and deep-link into Loom (event/proposal/chat context).

## Feature Status (Condensed)

### Implemented
- **Auth**: register/login/refresh/me/update profile/change password/delete account.
- **Events**: CRUD + visibility + attendees.
- **Proposals**: create/list/accept/decline + event creation.
- **Event collaboration**: chat + checklist + real-time updates.
- **Partner**: invite tokens + connect/disconnect + partner WebSocket.
- **PWA + offline**: SW caching + IndexedDB offline action queue.

### Next (high-value)
- **Testing**: backend + frontend coverage.
- **Observability**: structured logging and production monitoring.
- **Correctness**: partner-aware availability.

## Key Improvements Made

### Since Original Review
1.  **Real-time System Overhaul**: Replaced polling with WebSocket integration for instant updates.
2.  **Data Persistence Corrected**: Resolved loading issues; full React Query adoption for server state.
3.  **Advanced Features Implemented**: Event chat, shared checklists, email utilities, reminders loop (feature-flagged).
4.  **State Management Refined**: Context + UI-only state; React Query for server state; optimistic updates across CRUD.
5.  **Codebase Refinements**: Service layer extracted; routers are thinner and more consistent.
6.  **Deployment Enhancements**: PM2 + gunicorn configs, Nginx setup, deploy scripts.

## Recommendations

1. **Add comprehensive testing** - Unit/integration tests for services, components, APIs.
2. **Enhance monitoring** - Logging, metrics, error tracking for production.
3. **Harden resilience** - WebSocket reconnects, offline handling.
4. **Implement advanced features** - Recurring events, external calendar sync.
5. **Performance tuning** - List virtualization, bundle optimization if needed.

## Conclusion

The project has matured considerably. Core scheduling/proposals/tasks + chat/checklists are implemented with a clean service-layer backend and a React Query driven frontend.

The codebase follows modern practices: async FastAPI backend with service abstraction, React Query for data, Context for UI state, and PWA support.

**Current Status**: Functional for core scheduling/coordination. Next: testing suite, production observability, and addressing the identified partial areas (availability correctness).