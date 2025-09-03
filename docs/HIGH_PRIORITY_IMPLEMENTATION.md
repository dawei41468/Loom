# High Priority Implementation Guide

This document provides detailed implementation plans for the four high-priority gaps identified in the project review.

## 1. Wire Up Proposal Accept/Decline Buttons

### Current Issue
The Accept/Decline buttons in `src/pages/Index.tsx` (lines 148-155) have no onClick handlers, making the proposal system unusable.

### Implementation Steps

#### Step 1: Update Index.tsx Component
```typescript
// Add these imports at the top
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// Inside the Index component, add these mutations
const queryClient = useQueryClient();

const acceptProposalMutation = useMutation({
  mutationFn: ({ proposalId, selectedTimeSlot }: {
    proposalId: string;
    selectedTimeSlot: { start_time: string; end_time: string }
  }) => apiClient.acceptProposal(proposalId, selectedTimeSlot),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    addToast({
      type: 'success',
      title: 'Proposal accepted!',
      description: 'A new event has been created.',
    });
  },
  onError: (error) => {
    addToast({
      type: 'error',
      title: 'Failed to accept proposal',
      description: error.message,
    });
  },
});

const declineProposalMutation = useMutation({
  mutationFn: (proposalId: string) => apiClient.declineProposal(proposalId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    addToast({
      type: 'info',
      title: 'Proposal declined',
      description: 'The proposal has been declined.',
    });
  },
  onError: (error) => {
    addToast({
      type: 'error',
      title: 'Failed to decline proposal',
      description: error.message,
    });
  },
});

// Update the button onClick handlers
<div className="flex space-x-2 sm:ml-4">
  <button
    onClick={() => {
      // For now, accept the first proposed time slot
      const firstTimeSlot = proposal.proposed_times[0];
      if (firstTimeSlot) {
        acceptProposalMutation.mutate({
          proposalId: proposal.id,
          selectedTimeSlot: {
            start_time: firstTimeSlot.start_time,
            end_time: firstTimeSlot.end_time,
          },
        });
      }
    }}
    disabled={acceptProposalMutation.isPending}
    className="loom-chip loom-chip-primary text-xs hover-scale flex-1 sm:flex-initial"
  >
    {acceptProposalMutation.isPending ? 'Accepting...' : 'Accept'}
  </button>
  <button
    onClick={() => declineProposalMutation.mutate(proposal.id)}
    disabled={declineProposalMutation.isPending}
    className="loom-chip text-xs hover-scale border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] flex-1 sm:flex-initial"
  >
    {declineProposalMutation.isPending ? 'Declining...' : 'Decline'}
  </button>
</div>
```

#### Step 2: Add Time Slot Selection Modal (Optional Enhancement)
For better UX, create a modal to let users choose which time slot to accept:

```typescript
// Add state for modal
const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

// Add modal component
{selectedProposal && (
  <TimeSlotSelectionModal
    proposal={selectedProposal}
    onAccept={(timeSlot) => {
      acceptProposalMutation.mutate({
        proposalId: selectedProposal.id,
        selectedTimeSlot: timeSlot,
      });
      setSelectedProposal(null);
    }}
    onCancel={() => setSelectedProposal(null)}
    isLoading={acceptProposalMutation.isPending}
  />
)}
```

### Files to Modify
- `src/pages/Index.tsx` - Add mutations and wire up buttons
- `src/api/client.ts` - Ensure acceptProposal and declineProposal methods exist (they do)

### Testing
1. Create a proposal from one user
2. Login as the recipient user
3. Verify Accept/Decline buttons work
4. Verify events are created on acceptance
5. Verify proposal status updates

---

## 2. Implement Proper Partner Selection

### Current Issue
The partner system in `backend/app/routers/partner.py` automatically assigns the first other user as partner, which is unrealistic for production.

### Implementation Steps

#### Step 1: Create Partnership Model
Add to `backend/app/models.py`:

```python
class PartnershipBase(BaseModel):
    user1_id: str
    user2_id: str
    status: Literal["pending", "accepted", "declined"] = "pending"
    invited_by: str  # User ID who sent the invitation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None

class Partnership(MongoBaseModel, PartnershipBase):
    pass

class PartnershipCreate(BaseModel):
    invited_user_email: str
```

#### Step 2: Update Partner Router
Replace `backend/app/routers/partner.py` content:

```python
from ..models import Partnership, PartnershipCreate

@router.post("/invite", response_model=ApiResponse)
async def invite_partner(
    partnership_data: PartnershipCreate,
    current_user: User = Depends(get_current_user)
):
    """Invite a user to be your partner"""
    db = get_database()

    # Find the user to invite
    invited_user = await db.users.find_one({"email": partnership_data.invited_user_email})
    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email"
        )

    if str(invited_user["_id"]) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself"
        )

    # Check if partnership already exists
    existing_partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "user2_id": str(invited_user["_id"])},
            {"user1_id": str(invited_user["_id"]), "user2_id": str(current_user.id)}
        ]
    })

    if existing_partnership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partnership already exists or is pending"
        )

    # Create partnership
    partnership_dict = {
        "user1_id": str(current_user.id),
        "user2_id": str(invited_user["_id"]),
        "status": "pending",
        "invited_by": str(current_user.id),
        "created_at": datetime.utcnow()
    }

    result = await db.partnerships.insert_one(partnership_dict)

    return ApiResponse(
        data={"partnership_id": str(result.inserted_id)},
        message="Partnership invitation sent successfully"
    )

@router.get("", response_model=ApiResponse)
async def get_partner(current_user: User = Depends(get_current_user)):
    """Get current user's partner"""
    db = get_database()

    # Find accepted partnership
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "status": "accepted"},
            {"user2_id": str(current_user.id), "status": "accepted"}
        ]
    })

    if not partnership:
        return ApiResponse(data=None, message="No active partnership found")

    # Determine partner user ID
    partner_id = (
        partnership["user2_id"]
        if partnership["user1_id"] == str(current_user.id)
        else partnership["user1_id"]
    )

    # Get partner user data
    partner_user = await db.users.find_one({"_id": ObjectId(partner_id)})
    if not partner_user:
        return ApiResponse(data=None, message="Partner user not found")

    partner_data = {
        "id": str(partner_user["_id"]),
        "display_name": partner_user.get("display_name", "Partner"),
        "color_preference": "partner",
        "timezone": partner_user.get("timezone", "UTC"),
        "invite_status": "accepted",
        "connected_at": partnership.get("accepted_at")
    }

    partner = Partner(**partner_data)
    return ApiResponse(data=partner.dict(), message="Partner retrieved successfully")

@router.post("/accept/{partnership_id}", response_model=ApiResponse)
async def accept_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """Accept a partnership invitation"""
    db = get_database()

    partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify user is the recipient
    if (partnership["user1_id"] != str(current_user.id) and
        partnership["user2_id"] != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Not authorized")

    if partnership["invited_by"] == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot accept your own invitation")

    # Update partnership
    await db.partnerships.update_one(
        {"_id": ObjectId(partnership_id)},
        {
            "$set": {
                "status": "accepted",
                "accepted_at": datetime.utcnow()
            }
        }
    )

    return ApiResponse(message="Partnership accepted successfully")

@router.post("/decline/{partnership_id}", response_model=ApiResponse)
async def decline_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """Decline a partnership invitation"""
    db = get_database()

    partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify user is the recipient
    if (partnership["user1_id"] != str(current_user.id) and
        partnership["user2_id"] != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Delete partnership (or mark as declined)
    await db.partnerships.delete_one({"_id": ObjectId(partnership_id)})

    return ApiResponse(message="Partnership declined successfully")
```

#### Step 3: Update Frontend Partner Management
Create a new page or component for partner management:

```typescript
// src/pages/Partner.tsx
const Partner = () => {
  const [email, setEmail] = useState('');
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();

  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiClient.invitePartner(email),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Invitation sent!',
        description: 'Partner invitation has been sent.',
      });
      setEmail('');
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to send invitation',
        description: error.message,
      });
    },
  });

  if (partner) {
    return (
      <div className="container py-4">
        <PageHeader title="Your Partner" subtitle={partner.display_name} />
        {/* Partner info display */}
      </div>
    );
  }

  return (
    <div className="container py-4">
      <PageHeader title="Find Your Partner" subtitle="Connect with someone special" />
      <div className="loom-card max-w-md mx-auto">
        <form onSubmit={(e) => {
          e.preventDefault();
          inviteMutation.mutate(email);
        }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter partner's email"
            className="w-full px-4 py-3 rounded-md border border-gray-300"
            required
          />
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="loom-btn-primary w-full mt-4"
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

### Files to Modify
- `backend/app/models.py` - Add Partnership models
- `backend/app/routers/partner.py` - Complete rewrite
- `src/pages/Partner.tsx` - New component (create)
- `src/App.tsx` - Add partner route
- `src/components/BottomNavigation.tsx` - Add partner navigation

### Testing
1. User A invites User B
2. User B receives invitation (need notification system)
3. User B accepts invitation
4. Both users see each other as partners
5. Partner-specific features work (color theming, shared events)

---

## 3. Add Real-time Updates

### Current Issue
No WebSocket connections or real-time notifications - users must manually refresh to see updates.

### Implementation Steps

#### Option A: WebSocket Implementation (Recommended)

##### Step 1: Backend WebSocket Support
Add to `backend/app/main.py`:

```python
from fastapi import WebSocket, WebSocketDisconnect
import json
from typing import Dict, List

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

    async def broadcast_to_partners(self, message: dict, user_id: str):
        # Find user's partner and send message to both
        # Implementation depends on partnership system
        pass

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
```

##### Step 2: Update API to Send Real-time Notifications
Modify routers to send WebSocket messages:

```python
# In events.py, after creating an event
await manager.send_personal_message({
    "type": "event_created",
    "data": event.dict()
}, str(current_user.id))

# Also notify partner if it's a shared event
if len(event.attendees) > 1:
    for attendee_id in event.attendees:
        if attendee_id != str(current_user.id):
            await manager.send_personal_message({
                "type": "event_created",
                "data": event.dict()
            }, attendee_id)
```

##### Step 3: Frontend WebSocket Client
Create a WebSocket context:

```typescript
// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuthState } from './AuthContext';
import { useEventsActions } from './EventsContext';
import { useTasksActions } from './TasksContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthState();
  const { addEvent, updateEvent, removeEvent, addProposal, updateProposal } = useEventsActions();
  const { addTask, updateTask, removeTask } = useTasksActions();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user && !ws.current) {
      const websocket = new WebSocket(`ws://localhost:7500/ws/${user.id}`);

      websocket.onopen = () => {
        console.log('WebSocket connected');
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'event_created':
            addEvent(message.data);
            break;
          case 'event_updated':
            updateEvent(message.data.id, message.data);
            break;
          case 'event_deleted':
            removeEvent(message.data.id);
            break;
          case 'proposal_created':
            addProposal(message.data);
            break;
          case 'proposal_updated':
            updateProposal(message.data.id, message.data);
            break;
          case 'task_created':
            addTask(message.data);
            break;
          case 'task_updated':
            updateTask(message.data.id, message.data);
            break;
          // Add more cases as needed
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        ws.current = null;
      };

      ws.current = websocket;
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={null}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

#### Option B: Polling Implementation (Simpler)
If WebSockets are too complex, implement polling:

```typescript
// src/hooks/usePolling.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const usePolling = (intervalMs: number = 30000) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient, intervalMs]);
};
```

### Files to Modify
- `backend/app/main.py` - Add WebSocket support
- `backend/app/routers/*.py` - Add WebSocket notifications
- `src/contexts/WebSocketContext.tsx` - New context (create)
- `src/App.tsx` - Add WebSocketProvider

### Testing
1. User A creates an event
2. User B should see the event appear without refresh
3. Test with proposals and tasks
4. Verify connection handling and reconnections

---

## 4. Complete Calendar Page

### Current Issue
The calendar page exists but may lack full calendar functionality and integration.

### Implementation Steps

#### Step 1: Install Calendar Library
```bash
npm install react-big-calendar date-fns
npm install @types/react-big-calendar --save-dev
```

#### Step 2: Update Calendar Page
```typescript
// src/pages/Calendar.tsx
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

const CalendarPage = () => {
  const { events } = useEvents();
  const navigate = useNavigate();

  // Transform events for calendar
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    resource: event,
  }));

  const handleEventClick = (event: any) => {
    navigate(`/event/${event.id}`);
  };

  const handleSlotSelect = ({ start, end }: { start: Date; end: Date }) => {
    // Navigate to add event with pre-filled times
    navigate('/add', {
      state: {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }
    });
  };

  return (
    <div className="container py-4">
      <PageHeader title="Calendar" subtitle="View all your events" />
      <div className="loom-card">
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleEventClick}
            onSelectSlot={handleSlotSelect}
            selectable
            popup
            views={['month', 'week', 'day']}
            defaultView="month"
            className="loom-calendar"
          />
        </div>
      </div>
    </div>
  );
};
```

#### Step 3: Add Calendar Styles
```css
/* src/index.css */
.loom-calendar .rbc-calendar {
  background: hsl(var(--loom-surface));
  color: hsl(var(--loom-text));
}

.loom-calendar .rbc-header {
  background: hsl(var(--loom-primary-light));
  color: hsl(var(--loom-primary));
  padding: 8px;
  font-weight: 600;
}

.loom-calendar .rbc-event {
  background: hsl(var(--loom-primary));
  color: white;
  border-radius: var(--loom-radius-md);
  padding: 2px 6px;
}

.loom-calendar .rbc-today {
  background: hsl(var(--loom-primary-light));
}
```

#### Step 4: Add Calendar Navigation
Update `src/components/BottomNavigation.tsx` to highlight calendar when active.

### Files to Modify
- `src/pages/Calendar.tsx` - Complete rewrite with full calendar
- `src/index.css` - Add calendar styles
- `package.json` - Add calendar dependencies

### Testing
1. Navigate to calendar page
2. View events in month/week/day views
3. Click on events to view details
4. Click on time slots to create new events
5. Verify responsive design

---

## Implementation Priority and Timeline

### Phase 1 (Week 1): Critical User Experience
1. **Wire up proposal buttons** - 2-3 hours
2. **Complete calendar page** - 4-6 hours

### Phase 2 (Week 2): Core Functionality
1. **Implement proper partner selection** - 8-12 hours
2. **Add real-time updates** (start with polling) - 6-8 hours

### Phase 3 (Week 3): Polish and Testing
1. Add comprehensive error handling
2. Implement loading states
3. Add unit tests
4. Performance optimization

## Dependencies and Prerequisites

### Backend Dependencies
```python
# Add to requirements.txt
websockets==11.0.3
```

### Frontend Dependencies
```json
{
  "react-big-calendar": "^1.8.2",
  "date-fns": "^2.30.0"
}
```

## Risk Assessment

### High Risk
- WebSocket implementation may have browser compatibility issues
- Partner system changes affect core user relationships

### Medium Risk
- Calendar library integration may conflict with existing styles
- Real-time updates could impact performance

### Low Risk
- Proposal button wiring is isolated change
- Calendar page completion is additive feature

## Success Metrics

1. **Proposal acceptance flow**: Users can accept/decline proposals without errors
2. **Partner system**: Users can properly invite and connect with partners
3. **Real-time updates**: Changes appear within 30 seconds without manual refresh
4. **Calendar functionality**: Full calendar interaction with event creation and viewing

## Rollback Plan

Each feature should be implemented with feature flags to allow easy rollback:

```typescript
// Feature flags
const FEATURES = {
  REAL_TIME_UPDATES: true,
  ENHANCED_PARTNER_SYSTEM: true,
  FULL_CALENDAR: true,
  PROPOSAL_ACTIONS: true,
};
```

This implementation guide provides a comprehensive roadmap for addressing the high-priority gaps while maintaining code quality and user experience.