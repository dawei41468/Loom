# Loom App Features Implementation Plan

## Overview
This comprehensive document outlines the implementation plan for adding advanced features to the Loom app, including:
- **Event Chat & Checklist**: Allow partners to communicate about specific events and create shared checklists
- **Email Notifications**: Send invitation emails and notifications to users
- **Enhanced User Experience**: Real-time updates, push notifications, and improved interactions

## Current Status
### ✅ **Completed Core Integrations**
- Calendar page data loading with React Query
- Settings page profile persistence
- EventDetail page individual loading and delete functionality
- AuthContext API integration
- Standardized React Query data fetching
- Polling integration fixes

### ✅ **Completed Advanced Features**
- Event chat functionality (fully implemented)
- Event checklist functionality (fully implemented)

### ❌ **Missing Advanced Features**
- Email sending infrastructure
- Real-time notifications
- Push notification system
- WebSocket real-time updates
- Offline synchronization queue

## Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 Database Models
- [x] Create `event_messages` table for chat messages
  - Fields: id, event_id, sender_id, message, created_at, updated_at
- [x] Create `event_checklist_items` table for checklist items
  - Fields: id, event_id, title, description, completed, completed_by, completed_at, created_by, created_at, updated_at
- [x] Add relationships and foreign key constraints
- [x] Create database migration scripts

#### 1.2 Backend API Endpoints
- [x] **Chat Endpoints** (`/api/events/{event_id}/messages`)
  - `GET /api/events/{event_id}/messages` - Get all messages for an event
  - `POST /api/events/{event_id}/messages` - Send a new message
  - `DELETE /api/events/{event_id}/messages/{message_id}` - Delete a message (owner only)
- [x] **Checklist Endpoints** (`/api/events/{event_id}/checklist`)
  - `GET /api/events/{event_id}/checklist` - Get all checklist items for an event
  - `POST /api/events/{event_id}/checklist` - Create a new checklist item
  - `PUT /api/events/{event_id}/checklist/{item_id}` - Update checklist item (toggle completion)
  - `DELETE /api/events/{event_id}/checklist/{item_id}` - Delete checklist item

#### 1.3 Backend Validation & Security
- [x] Add Pydantic models for request/response validation
- [x] Implement authorization checks (only event participants can access)
- [ ] Add rate limiting for message sending
- [x] Add input sanitization and validation

### Phase 1.5: Email Infrastructure

#### 1.5.1 Email Service Setup
- [ ] Choose email service provider (SendGrid, Mailgun, AWS SES, or SMTP)
- [ ] Add email service dependencies to `requirements.txt`
- [ ] Create email service configuration in backend settings
- [ ] Add email-related environment variables to `.env.example`

#### 1.5.2 Email Templates & Service
- [ ] Create email service module (`backend/app/email.py`)
- [ ] Design HTML email templates for partnership invitations
- [ ] Implement email sending functions
- [ ] Add email queue/background processing (optional)

#### 1.5.3 Email Integration
- [ ] Update `/partner/invite` endpoint to send invitation emails
- [ ] Add email verification for invited users
- [ ] Create email templates for various notifications
- [ ] Add unsubscribe functionality (for future notifications)

### Phase 2: Frontend Infrastructure

#### 2.1 Email Frontend Integration
- [ ] Add email verification status to user types
- [ ] Add email preferences to settings
- [ ] Create email verification component (if needed)

#### 2.2 TypeScript Types
- [x] Add chat-related types to `src/types.ts`:
  ```typescript
  interface EventMessage {
    id: string;
    event_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    updated_at: string;
    sender?: User; // populated from API
  }

  interface ChecklistItem {
    id: string;
    event_id: string;
    title: string;
    description?: string;
    completed: boolean;
    completed_by?: string;
    completed_at?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
  }
  ```

#### 2.2 API Client Methods
- [x] Add chat methods to `src/api/client.ts`:
  - `getEventMessages(eventId: string)`
  - `sendEventMessage(eventId: string, message: string)`
  - `deleteEventMessage(eventId: string, messageId: string)`
- [x] Add checklist methods to `src/api/client.ts`:
  - `getEventChecklist(eventId: string)`
  - `createChecklistItem(eventId: string, item: { title: string; description?: string })`
  - `updateChecklistItem(eventId: string, itemId: string, updates: { completed: boolean })`
  - `deleteChecklistItem(eventId: string, itemId: string)`

#### 2.3 Query Management
- [x] Add query keys to `src/api/queries.ts`:
  - `eventMessages: (eventId: string) => ['events', eventId, 'messages']`
  - `eventChecklist: (eventId: string) => ['events', eventId, 'checklist']`
- [x] Add query functions for chat and checklist data

### Phase 3: Chat Feature Implementation

#### 3.1 Email Notifications for Chat
- [ ] Send email notifications for new messages (optional)
- [ ] Add email preferences for chat notifications
- [ ] Implement email templates for message notifications

#### 3.2 Chat UI Components
- [x] Create `EventChat.tsx` component with:
  - Message list display
  - Message input field
  - Send button with loading state
  - Auto-scroll to latest messages
  - Message timestamps and sender avatars
- [x] Add real-time message updates (polling every 30 seconds)
- [x] Add message deletion for owners
- [x] Add empty state when no messages exist

#### 3.2 Chat Integration
- [x] Replace placeholder chat tab in `EventDetail.tsx`
- [x] Add React Query for message fetching and mutations
- [x] Add error handling and loading states
- [x] Add optimistic updates for sent messages

### Phase 4: Checklist Feature Implementation

#### 4.1 Checklist UI Components
- [x] Create `EventChecklist.tsx` component with:
  - Checklist item list
  - Add new item form
  - Check/uncheck functionality
  - Delete items (creator only)
  - Progress indicator (completed/total items)
- [ ] Add drag-and-drop reordering (optional enhancement)
- [x] Add item descriptions and due dates (optional)

#### 4.2 Checklist Integration
- [x] Replace placeholder checklist tab in `EventDetail.tsx`
- [x] Add React Query for checklist data and mutations
- [x] Add optimistic updates for item creation/completion
- [x] Add proper error handling and loading states

### Phase 5: Real-time Features (Optional)

#### 5.1 WebSocket Integration
- [ ] Add WebSocket connection for real-time updates
- [ ] Implement message broadcasting
- [ ] Add checklist item update broadcasting
- [ ] Handle connection errors and reconnection

#### 5.2 Push Notifications
- [ ] Add push notifications for new messages
- [ ] Add notifications for checklist item completions
- [ ] Implement notification preferences

### Phase 5.5: WebSocket Real-time Updates

#### 5.5.1 WebSocket Server Setup
- [ ] Add WebSocket support to FastAPI backend
- [ ] Create WebSocket connection manager
- [ ] Implement room-based messaging for events
- [ ] Add connection authentication and authorization

#### 5.5.2 Real-time Event Broadcasting
- [ ] Broadcast new messages to event participants
- [ ] Broadcast checklist item updates
- [ ] Broadcast event changes (updates, deletions)
- [ ] Handle connection lifecycle (connect/disconnect/reconnect)

#### 5.5.3 Frontend WebSocket Integration
- [ ] Add WebSocket client to React app
- [ ] Implement real-time message updates
- [ ] Add connection status indicators
- [ ] Handle reconnection logic and error states

### Phase 6.5: Offline Synchronization

#### 6.5.1 Offline Queue System
- [ ] Implement IndexedDB for offline action storage
- [ ] Create offline action queue management
- [ ] Add conflict resolution strategies
- [ ] Implement retry mechanisms for failed syncs

#### 6.5.2 Background Sync Integration
- [ ] Update service worker background sync handler
- [ ] Implement offline action processing
- [ ] Add sync status indicators
- [ ] Handle large offline action queues

#### 6.5.3 Offline UI/UX
- [ ] Add offline status indicators
- [ ] Implement offline mode UI states
- [ ] Add manual sync triggers
- [ ] Handle offline form submissions

### Phase 6: Testing & Polish

#### 6.1 Unit Tests
- [ ] Add tests for email service functionality
- [ ] Add tests for chat API endpoints
- [ ] Add tests for checklist API endpoints
- [ ] Add tests for partnership invitation endpoints
- [ ] Add tests for WebSocket functionality
- [ ] Add tests for offline synchronization
- [ ] Add tests for push notification service
- [ ] Add tests for React components
- [ ] Add tests for React Query hooks

#### 6.2 Integration Tests
- [ ] Test end-to-end chat functionality
- [ ] Test end-to-end checklist functionality
- [ ] Test real-time updates (if implemented)
- [ ] Test WebSocket connections and messaging
- [ ] Test offline queue and synchronization
- [ ] Test push notification delivery
- [ ] Test email sending and delivery
- [ ] Test error scenarios and edge cases

#### 6.3 UI/UX Polish
- [ ] Add loading skeletons for chat/checklist
- [ ] Add smooth animations for message appearance
- [ ] Add proper mobile responsiveness
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

## Technical Considerations

### Security
- Ensure only event participants can access chat/checklist
- Validate all user inputs to prevent XSS
- Implement proper authorization for message/checklist operations

### Performance
- Implement pagination for large message lists
- Add message caching and optimistic updates
- Consider lazy loading for checklist items

### Scalability
- Design database schema to handle many messages per event
- Consider message archiving for old events
- Plan for potential high-frequency message sending

## Dependencies
- Backend: SQLAlchemy models, FastAPI routers, email service (SendGrid/Mailgun/AWS SES)
- Frontend: React Query for data management
- Database: PostgreSQL tables and relationships
- Email: Email service provider API keys and templates
- Real-time (optional): WebSocket support, Socket.IO or native WebSockets
- Offline (optional): IndexedDB, Service Worker background sync
- Push Notifications (optional): Web Push API, VAPID keys

## Estimated Timeline
- Phase 1 (Backend Infrastructure): 2-3 days
- Phase 1.5 (Email Infrastructure): 1-2 days
- Phase 2 (Frontend Infrastructure): 1-2 days
- Phase 3 (Chat Implementation): 2-3 days
- Phase 4 (Checklist Implementation): 2-3 days
- Phase 5 (Real-time & Notifications): 3-5 days (optional)
- Phase 5.5 (WebSocket Real-time Updates): 2-3 days (optional)
- Phase 6.5 (Offline Synchronization): 2-3 days (optional)
- Phase 6 (Testing & Polish): 2-3 days

## Success Criteria
- [ ] Users receive email invitations when invited to partner
- [x] Users can send and receive messages about specific events
- [x] Users can create, complete, and delete checklist items
- [ ] Email notifications work properly (if implemented)
- [ ] Real-time WebSocket updates work for chat and checklist
- [ ] Offline actions sync properly when connection restored
- [ ] Push notifications are delivered for important events
- [x] All features work seamlessly on mobile and desktop
- [x] Proper error handling and loading states
- [ ] Comprehensive test coverage

## Next Steps
1. **Immediate Priority**: Implement email infrastructure (Phase 1.5)
2. Start with Phase 1: Backend database models and API endpoints
3. Implement basic chat functionality first
4. Add checklist functionality
5. Add email notifications for chat/checklist activities
6. **Optional Enhancements**:
   - Phase 5.5: WebSocket real-time updates
   - Phase 6.5: Offline synchronization
   - Push notification system
7. Thorough testing and polish

## Email-Specific Success Criteria
- [ ] Partnership invitation emails are sent successfully
- [ ] Email templates are properly formatted and branded
- [ ] Email delivery is reliable and monitored
- [ ] Users can manage email notification preferences
- [ ] Proper error handling for email failures

## Critical Missing Infrastructure

### 🚨 **Email System - HIGH PRIORITY**
The partnership invitation system currently creates database records but **does NOT send actual emails**. This is a critical gap that needs immediate attention:

- **Current State**: Clicking "Send Invitation" only creates a DB record
- **Missing**: Email delivery infrastructure and templates
- **Impact**: Users cannot actually invite partners via email
- **Solution**: Implement Phase 1.5 (Email Infrastructure) immediately

### ⚠️ **Real-time Communication - MEDIUM PRIORITY**
The app relies on inefficient 30-second polling instead of real-time updates:

- **Current State**: `usePolling` hook refreshes data every 30 seconds
- **Missing**: WebSocket connections for instant updates
- **Impact**: Delayed notifications, poor user experience
- **Solution**: Implement Phase 5.5 (WebSocket Real-time Updates)

### ⚠️ **Offline Synchronization - MEDIUM PRIORITY**
Service worker has background sync setup but no actual offline queue:

- **Current State**: `sw.js` has sync event handlers but empty implementation
- **Missing**: IndexedDB queue for offline actions
- **Impact**: No offline functionality despite PWA setup
- **Solution**: Implement Phase 6.5 (Offline Synchronization)

### ⚠️ **Push Notifications - LOW PRIORITY**
Notification infrastructure exists but isn't connected to backend:

- **Current State**: Service worker has push event handlers
- **Missing**: Backend notification service and user preferences
- **Impact**: No native notifications for important events
- **Solution**: Complete push notification system

### 📋 **Feature Status Summary**
- ✅ **Core App Functionality**: All critical integrations completed
- ✅ **Data Fetching**: React Query implementation complete
- ✅ **API Integration**: All endpoints properly connected
- ❌ **Email System**: Missing - prevents partner invitations from working
- ✅ **Advanced Features**: Chat and checklist fully implemented
- ⚠️ **Real-time Updates**: Polling-based, not real-time
- ⚠️ **Offline Support**: Infrastructure exists but not implemented
- ⚠️ **Push Notifications**: Partially implemented, not functional

---

*Last updated: 2025-09-04*
*Document updated to reflect completed chat and checklist implementation*