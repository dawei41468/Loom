# Loom - "weave your days together"

A beautiful mobile-first couples calendar PWA built with React, TypeScript, and Tailwind v4.

## 🚀 Features

- **Mobile-first PWA** - Installable, works offline
- **Beautiful woven UI** - Shared events display with gradient overlays  
- **iOS-style navigation** - Bottom tab bar with 5 main sections
- **Real-time sync ready** - Mock API compatible with FastAPI backend
- **Bilingual** - English & Chinese (中文) support
- **Dark/Light themes** - Follows system preferences

## 🎨 Design System

- **Tailwind v4 CSS-first** approach (no config file)
- **Loom brand colors**: Indigo primary, Orange partner, Teal user, Violet shared
- **Premium feel**: Rounded corners, subtle shadows, smooth animations
- **Semantic tokens**: All colors defined in CSS custom properties

## 📱 App Structure

### Bottom Navigation (5 tabs)
- **Today** (`/`) - Dashboard with timeline & next events
- **Calendar** (`/calendar`) - 3-Day/Week/Agenda views with filters  
- **Add** (`/add`) - Natural language event creation + proposals
- **Tasks** (`/tasks`) - Lightweight to-do lists with due dates
- **Settings** (`/settings`) - Profile, partner connection, language/theme

### Additional Pages
- **Onboarding** (`/onboarding`) - 4-step setup flow
- **Event Detail** (`/event/:id`) - iOS bottom sheet with tabs

## 🔧 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State**: Zustand with localStorage persistence
- **Routing**: React Router with mobile-first navigation
- **Icons**: Lucide React
- **Dates**: date-fns for parsing/formatting
- **PWA**: Service worker + manifest for offline support

## 🗄️ Mock API & Backend Ready

All API calls go through `src/api/client.ts` which provides:
- **Mock mode** (default) - Runs entirely frontend with realistic data
- **Real API mode** - Ready to connect to FastAPI backend

### Switch to Real API:
```bash
# In your .env file:
VITE_USE_REAL_API=true
VITE_API_BASE_URL=http://localhost:8000/api
```

The mock API includes:
- ✅ User authentication & profile management
- ✅ Event CRUD with visibility controls
- ✅ Proposal system (suggest times to partner)  
- ✅ Task management with due dates
- ✅ Partner connection workflow
- ✅ Availability overlap calculation

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server  
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 PWA Installation

1. Visit the app in mobile browser
2. Tap "Add to Home Screen" 
3. App works offline with cached events/tasks

## 🌍 Internationalization

Switch between English/Chinese in Settings. All text uses the translation system in `src/i18n/index.ts`.

## 🎯 Key Components

- **DayTimeline** - Hour-by-hour view with overlapping events
- **EventBlock** - Color-coded event cards (user/partner/shared)
- **ProposalCard** - Accept/decline time suggestions
- **BottomNavigation** - iOS-style tab bar
- **ToastContainer** - Success/error notifications

## 📊 Woven Events

Shared events between partners display with a beautiful gradient that "weaves" the partner colors together, creating the signature Loom visual effect.

## 🔄 State Management

Zustand store with these slices:
- `auth` - User & partner info
- `events` - Calendar events & proposals  
- `tasks` - To-do items
- `ui` - Toasts, theme, language, filters

---

**Built for love, designed for life.** 💕