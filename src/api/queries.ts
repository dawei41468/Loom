// React Query keys and query functions for Loom app
import { apiClient } from './client';

// Query Keys
export const queryKeys = {
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  eventMessages: (eventId: string) => ['events', eventId, 'messages'] as const,
  eventChecklist: (eventId: string) => ['events', eventId, 'checklist'] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  proposals: ['proposals'] as const,
  proposal: (id: string) => ['proposals', id] as const,
  partner: ['partner'] as const,
  user: ['user'] as const,
};

// Query Functions
export const eventQueries = {
  getEvents: () => apiClient.getEvents(),
  getEvent: (id: string) => apiClient.getEvent(id),
};

export const taskQueries = {
  getTasks: () => apiClient.getTasks(),
  getTask: (id: string) => apiClient.getTask(id),
};

export const proposalQueries = {
  getProposals: () => apiClient.getProposals(),
  getProposal: (id: string) => apiClient.getProposal(id),
};

export const partnerQueries = {
  getPartner: () => apiClient.getPartner(),
  checkEmailRegistered: (email: string) => apiClient.checkEmailRegistered(email),
  generateInviteToken: (expiresInDays?: number) => apiClient.generateInviteToken(expiresInDays),
  checkInviteToken: (token: string) => apiClient.checkInviteToken(token),
};

export const userQueries = {
  getMe: () => apiClient.getMe(),
};

export const eventChatQueries = {
  getEventMessages: (eventId: string) => apiClient.getEventMessages(eventId),
};

export const eventChecklistQueries = {
  getEventChecklist: (eventId: string) => apiClient.getEventChecklist(eventId),
};