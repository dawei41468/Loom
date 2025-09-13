# Notifications Implementation Plan (Web Push)

This document outlines the plan for adding Web Push notifications to the Loom PWA. It is tailored to the existing stack: React (Vite + TypeScript + Tailwind), FastAPI (Python, Pydantic), MongoDB, and JWT auth.

## Confirmed Decisions

- Email fallback is enabled (sender: `loom-noreply@studiodtw.net`) for high-priority events.
- No iOS App Store wrapper; rely on PWA installed to Home Screen for iOS web push.
- Safe to include minimal context in notification bodies (no sensitive data).
- Topic defaults are accepted as proposed.

## Goals

- Deliver timely, relevant notifications to users regarding proposals, chats, checklists, invites, and reminders.
- Keep the solution simple and maintainable, with minimal new infrastructure.
- Respect user preferences, platform constraints, and privacy.

---

## Phase 1 — Use Cases and Taxonomy

- **User-facing event types**
  - **Proposals**: awaiting your approval; approved/rejected; updated.
  - **Chat**: new message in shared event; thread reply. (Chats only occur between connected partners; `@` mention is implied and not required.)
  - **Checklists**: new item assigned to you; due soon/overdue; item completed in a followed event.
  - **Invites**: invited to shared event; invite accepted/declined; role changed.
  - **Reminders**: event about to start; RSVP deadline; payment/receipt deadline.
  - **System updates**: access changed; data export completed; admin announcement.
  

- **Topics (preferences)**
  - `proposals`, `chat`, `checklists`, `invites`, `reminders`, `system`.
  - Subtypes can be added later as needed (e.g., `reminders.start`, `reminders.deadline`).

- **Success criteria (Phase 1)**
  - Taxonomy agreed and documented (this document).
  - Critical vs optional defaults identified for future opt-in.

---

## Phase 2 — Delivery Matrix and Fallbacks

- **Primary**: Web Push (Service Worker + Notifications API).
- **Fallback**:
  - In-app notifications/badges/toasts if push denied/unsupported.
  - Email fallback is enabled for high-priority events (e.g., proposals awaiting approval, new invites) via `loom-noreply@studiodtw.net`.
- **iOS strategy**:
  - Encourage Add to Home Screen to enable Web Push on iOS (iOS 16.4+). Provide a gentle guide. No App Store wrapper will be used.
- **User control**:
  - Per-topic toggles in Settings. Defaults: proposals/reminders ON; chat/checklists optional.
  
- **Notification body policy**:
  - Include minimal, non-sensitive context in the notification body (e.g., “Proposal ‘Q4 Budget’ needs approval”).

---

## Phase 3 — Backend Architecture (FastAPI + MongoDB)

- **VAPID keys**
  - Generate per environment (dev/test/prod). Store in env vars. Never overwrite local `.env` files automatically.

- **Data model**
  - `push_subscriptions`:
    ```json
    {
      "_id": "...",
      "user_id": "...",
      "endpoint": "https://...",
      "keys": { "p256dh": "...", "auth": "..." },
      "ua": "user-agent",
      "platform": "web|ios_pwa|android_pwa|desktop",
      "created_at": "ISO",
      "updated_at": "ISO",
      "active": true,
      "topics": ["proposals", "chat", ...]
    }
    ```
  - `notification_events` (append-only log):
    ```json
    {
      "_id": "...",
      "user_id": "...",
      "type": "proposals|chat|...",
      "subtype": "awaiting_approval|mention|...",
      "entity_ref": { "proposal_id": "...", "chat_id": "...", "event_id": "..." },
      "payload_summary": "short string for debugging/analytics",
      "created_at": "ISO",
      "delivery_status": [{"subscription_id": "...", "status": "success|failed", "error": "..."}],
      "dedupe_key": "type:entity:user:bucket"
    }
    ```

- **APIs**
  - `POST /push/subscribe` — Upsert subscription (auth required).
  - `DELETE /push/subscribe` — Deactivate subscription.
  - `POST /push/test` — Send a test to caller (dev/test only; feature-flagged).
  - Internal domain hooks — Triggered by proposal/chat/checklist events.

- **Sending path**
  - Phase 1: Synchronous send via BackgroundTask using `pywebpush` (best-effort). Prune on `410 Gone`.
  - Later: Introduce a queue only if volume requires (keep simple first).

- **Idempotency**
  - Use `dedupe_key` to avoid duplicates (type + entity + user + time bucket).

- **Topic filtering**
  - Enforce per-user topic preferences at send time. Fallback to server defaults if unset.

---

## Phase 4 — Frontend UX (React)

- **Onboarding**
  - Explain benefits. Then request permission.
  - On iOS without installation, show Add-to-Home-Screen guide. Offer "Remind me later".

- **Settings (`src/pages/Settings.tsx`)**
  - Section: Notifications
    - Global toggle: Enable Push Notifications
    - Topic toggles: proposals, chat, checklists, invites, reminders, system
    - "Send test notification" (dev/test only)

- **Lifecycle**
  - Register Service Worker
  - Request permission → create subscription → POST to backend with selected topics
  - Update/refresh subscription on SW updates or browser changes
  - Unsubscribe flow to clean up server records

- **In-app fallback**
  - For unsupported/denied, rely on in-app toasts/badges and an inbox if applicable.

---

## Phase 5 — Security, Privacy, Reliability

- **Auth binding** — Only authenticated users can register subscriptions; bind user_id on creation.
- **Validation & pruning** — Remove invalid/expired subs on send failure (`410`).
- **Rate limiting** — Prevent floods for chat/noisy events; apply per-user rate limits.
- **Data minimization** — Keep payload minimal; avoid sensitive data in notification text.
- **Preferences** — Honor opt-in/out; provide "unsubscribe from all".
- **Compliance** — Clear privacy policy and permission rationale in-app.

---

## Phase 6 — Rollout

- **Feature flag**: `FEATURE_PUSH_NOTIFICATIONS` per environment.
- **Dev**: Enable test button; manual triggers.
- **Test/Staging**: Limited cohort; validate iOS install + deep links.
- **Prod**: Gradual rollout; monitor delivery success/failure and prune invalid endpoints.

---

## Phase 7 — QA & Monitoring

- **Matrix**
  - Browsers: Chrome/Edge/Firefox/Safari (desktop)
  - Mobile: Chrome/Firefox on Android; Safari iOS (installed PWA)
  - States: permission default/denied/granted; installed vs not; online/offline; SW updated

- **Regression areas**
  - Auth/JWT, SW scope/updates, routing, caching

- **Monitoring**
  - Server logs for send outcomes and pruning
  - Client telemetry for permission states and SW activation

---

## Open Questions

 - Any regulatory constraints for payload content and data retention?
