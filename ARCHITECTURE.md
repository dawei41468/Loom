# New Data Architecture - Preventing Infinite Loop Errors

## Overview
This refactoring restructures the data management to prevent infinite loop errors by implementing several key architectural improvements.

## Root Causes of Previous Issues
1. **Monolithic store** - Large store with mixed concerns caused unnecessary re-renders
2. **Object selectors** - Created new objects on every render, breaking React's reference equality
3. **Store actions in useEffect deps** - Caused infinite loops when actions were included in dependency arrays
4. **Async operations in store** - setTimeout in store actions created subscription issues

## New Architecture

### 1. Focused Store Pattern
- **Before**: One large store with all state
- **After**: Separate stores for different concerns:
  - `src/stores/auth.ts` - Authentication state
  - `src/stores/events.ts` - Events and proposals
  - `src/stores/tasks.ts` - Task management
  - `src/stores/ui.ts` - UI preferences only

### 2. Atomic Selectors
- **Before**: Object-based selectors that create new objects
- **After**: Atomic selectors that return primitive values
```typescript
// Before (creates new object every render)
const { user, partner, isAuthenticated } = useAuth();

// After (returns stable primitive values)
const user = useUser();
const partner = usePartner();
const isAuthenticated = useIsAuthenticated();
```

### 3. Separated Toast Management
- **Before**: Toasts stored in global state with async operations
- **After**: React Context + hook pattern
  - `src/hooks/useToasts.ts` - Local state management
  - `src/contexts/ToastContext.tsx` - Context provider
  - No global state subscription issues

### 4. Async Operation Pattern
- **Before**: Async operations mixed with store actions
- **After**: Custom hooks for async operations
  - `src/hooks/useAsyncOperation.ts` - Standardized async handling
  - Clean separation of concerns

## Benefits

### 1. Prevents Infinite Loops
- Store actions are stable references
- Atomic selectors prevent object recreation
- No async operations in store actions
- Local toast state prevents subscription issues

### 2. Better Performance
- Components only re-render when specific values change
- Smaller stores mean faster updates
- Reduced coupling between different concerns

### 3. Improved Developer Experience
- Clearer separation of concerns
- Easier to debug issues
- Type safety improvements
- More predictable behavior

### 4. Maintainability
- Smaller, focused files
- Single responsibility principle
- Easier to test individual stores
- Clear data flow patterns

## Migration Guide

### Store Usage (Before → After)
```typescript
// Before
import { useAuth, useEvents, useUI } from '../store';
const { user, partner } = useAuth();
const { events, setEvents } = useEvents();
const { addToast } = useUI();

// After
import { useUser, usePartner, useEvents, useEventsActions } from '../stores';
import { useToastContext } from '../contexts/ToastContext';
const user = useUser();
const partner = usePartner();
const events = useEvents();
const { setEvents } = useEventsActions();
const { addToast } = useToastContext();
```

### useEffect Dependencies
```typescript
// Before (WRONG - causes infinite loops)
useEffect(() => {
  // ...
}, [setEvents, addToast]);

// After (CORRECT - empty deps for one-time operations)
useEffect(() => {
  // ...
}, []);
```

## Key Principles for Future Development

1. **Use atomic selectors** - Select primitive values, not objects
2. **Separate actions from data** - Use action hooks for mutations
3. **Keep stores focused** - One concern per store
4. **No async in stores** - Use custom hooks for async operations
5. **Empty dependency arrays** - For one-time effects with store actions
6. **Use context for temporary state** - Like toasts, modals, etc.

This architecture prevents the types of infinite loop errors we encountered by following React best practices and maintaining clear separation of concerns.