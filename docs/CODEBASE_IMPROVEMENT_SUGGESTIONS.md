# Codebase Improvement Suggestions

This document provides a comprehensive analysis of the codebase and offers suggestions for improvement. The application is well-structured and uses modern technologies, but the following recommendations can enhance maintainability, performance, and security.

## Backend Suggestions

The backend is built on a solid foundation with FastAPI. The following suggestions focus on refining its structure and performance.

### 1. Code Structure and Maintainability ✅ **FULLY IMPLEMENTED**

*   **Refactor `websocket.py`**: This file is large and handles multiple responsibilities.
    *   **Suggestion**: Create a `NotificationService` to handle the logic for sending WebSocket notifications (e.g., `notify_proposal_created`, `notify_event_created`). This will decouple notification logic from connection management.
    *   **Suggestion**: Move utility functions like `_serialize_for_json` to a shared `utils.py` file.

*   **Isolate Business Logic from Routers**: The router files (e.g., `proposals.py`) currently contain business logic directly within API endpoints.
    *   **Suggestion**: Introduce a "service" or "repository" layer to abstract database interactions and business logic away from route handlers. For example, a `ProposalService` could contain methods like `create_proposal` and `accept_proposal`.

*   **Centralize WebSocket Route Definitions**: The WebSocket endpoint is currently defined in `main.py`.
    *   **Suggestion**: Move the WebSocket endpoint definition to a new `routers/websockets.py` file to keep all routing logic organized within the `routers` directory.

**Implementation Details**: Created `NotificationService` in `services.py`, extracted `serialize_for_json` to `utils.py`, centralized WebSocket routing in `routers/websockets.py`, and refactored `proposals.py` to use a service-layer (`service_layer/proposal_service.py`).

### 2. Performance and Scalability ✅ **FULLY IMPLEMENTED**

*   **Optimize Database Queries** ✅ Implemented
    *   Previously: Endpoints often did `update` followed by `find` to fetch the updated document.
    *   Now: Use MongoDB `find_one_and_update` with `ReturnDocument.AFTER` to return the updated document in a single operation across multiple areas:
        *   Proposals: `service_layer/proposal_service.py` (`accept_proposal`, `decline_proposal`).
        *   Events: `routers/events.py` → `EventsService.update_event()`.
        *   Tasks: `routers/tasks.py` → `TasksService.toggle_task()` and `TasksService.update_task()`.
        *   Auth: `routers/auth.py` → `update_current_user()`.

*   **Asynchronous Operations** ✅ Maintained
    *   **Suggestion**: Continue using `motor` and ensure all database calls and external API requests are `await`ed to leverage FastAPI's asynchronous capabilities.

**Additional Work Completed**

*   Service layer extraction beyond proposals:
    *   `service_layer/events_service.py` (event CRUD),
    *   `service_layer/event_messages_service.py` (event chat),
    *   `service_layer/checklist_service.py` (event checklist),
    *   `service_layer/tasks_service.py` (tasks),
    *   `service_layer/partner_service.py` (partner flows).
*   Routers (`events`, `tasks`, `partner`, `proposals`) now delegate to service methods; routers are thin and consistent.
*   Development cache behavior improved: Redis disabled by default in `dev`, with robust in-memory fallback in `app/cache.py`.
*   Codebase lint cleanup performed (unused imports, minor polish) — ruff checks pass.

### 3. Security ✅ **BASIC IMPLEMENTATION COMPLETE**

*   **Configuration Management**
    *   ✅ `.env` files are gitignored; production secrets are server‑managed.
    *   ✅ Startup validation added in `backend/app/main.py`:
        *   Fail‑fast in production if `SECRET_KEY` is a default placeholder.
        *   Fail‑fast in production if `CORS_ORIGINS` is empty (must be explicit).
        *   Log guidance in development to harden settings for production.
    *   ℹ️ Optional: Integrate a dedicated secrets manager (AWS Secrets Manager / Vault) — not required right now.

---

## Frontend Suggestions

The frontend is modern and well-architected. These suggestions aim to further improve its structure and performance.

### 1. Component Architecture and Reusability

*   **Break Down Large Components** ✅ **FULLY IMPLEMENTED**
    *   Previously: A monolithic `src/pages/Add.tsx` handled add-event and propose-time flows, form state, natural language parsing, and submission.
    *   Now: Decomposed into a container and focused child components/hooks:
        *   `src/pages/Add/AddPage.tsx` — container that orchestrates state, navigation, toasts, and submit handlers.
        *   `src/pages/Add/EventForm.tsx` — event-only UI (date, time, visibility, attendees, reminders) with `DatePicker` and `TimePicker`.
        *   `src/pages/Add/ProposalForm.tsx` — proposal slots UI with add/remove/update of multiple time options.
        *   `src/pages/Add/hooks/useProposalSlots.ts` — isolated state management for multiple proposal slots including `syncFirstSlot` helper.
      Natural language parsing is centralized in `src/utils/nlp.ts`, and date/time helpers live in `src/utils/datetime.ts`.

*   **Create a Shared `forms` Directory** ✅ **FULLY IMPLEMENTED**
    *   Implemented `src/components/forms/` with shared components:
        *   `TextInput` (with `variant="bare"`), `TextArea`, `SubmitButton` (with `fullWidth`), `DatePicker` (wrapper over `ui/calendar`, MM/DD/YYYY display, emits `yyyy-MM-dd`), `Select` (wrapper over `ui/select`), and moved `TimePicker` into `forms/`.
    *   Migrations completed:
        *   `src/pages/Add/AddPage.tsx`: composes `EventForm` and `ProposalForm`, and uses `TextInput`, `TextArea`, `DatePicker`, and `TimePicker` across event and proposal flows.
        *   `src/components/EventChat.tsx`: composer migrated to `TextInput` + `SubmitButton`; UI polished and grouped messages.
        *   `src/components/EventChecklist.tsx`: add-item form migrated to `TextInput`, `TextArea`, `SubmitButton`.
    *   Notes:
        *   `DatePicker` is custom (popover, no native overlay) to ensure MM/DD/YYYY display consistently; retains `yyyy-MM-dd` state for backend helpers.
        *   `Select` is a thin wrapper over `components/ui/select` for a consistent forms API.

### 2. State Management

*   **Consolidate State Management**: The current mix of React Context and `@tanstack/react-query` is effective.
    *   **Suggestion**: For server-derived state, rely more heavily on `@tanstack/react-query`'s cache as the single source of truth instead of duplicating it in a React Context. This can simplify state logic and reduce boilerplate.

*   **Optimistic Updates** ✅ **FULLY IMPLEMENTED**
    *   Implemented across key operations with `onMutate`/`onError`/`onSettled` patterns and cache rollbacks:
        *   Events: create (optimistic add with temp id), update (optimistic cache/context patch), delete (optimistic remove with rollback).
        *   Proposals: accept (optimistic status + selected time; reconcile with created event), decline (optimistic status).
        *   Tasks: add (optimistic temp), toggle (optimistic completed flag), delete (optimistic remove).
        *   Event Checklist: create (optimistic append), toggle complete (optimistic), delete (optimistic remove).
    *   Notes: All optimistic updates invalidate relevant queries on settle to keep caches synced.

### 3. Performance

*   **Code Splitting**: `React.lazy` is already used for code-splitting page components.
    *   **Suggestion**: Extend this by code-splitting larger, non-critical components that are not immediately visible to the user.

*   **Memoization**: `React.memo` is used in some places.
    *   **Suggestion**: Use React's developer tools to profile the application, identify unnecessary re-renders, and apply `React.memo`, `useMemo`, or `useCallback` where needed.

---

## General Suggestions

*   **Testing**: The codebase currently lacks test files.
    *   **Suggestion (Backend)**: Use `pytest` to write unit and integration tests for API endpoints and business logic.
    *   **Suggestion (Frontend)**: Use `React Testing Library` to write unit and integration tests for components and custom hooks.

*   **Documentation**: Adding documentation will improve long-term maintainability.
    *   **Suggestion**: Add comments to complex code sections and consider generating API documentation for the backend using FastAPI's built-in OpenAPI support.
