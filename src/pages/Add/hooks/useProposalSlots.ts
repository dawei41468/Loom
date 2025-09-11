import { useState, useCallback } from 'react';

export type ProposalSlot = { date: string; startTime: string; endTime: string };

export function useProposalSlots(initial: ProposalSlot) {
  const [proposalSlots, setProposalSlots] = useState<ProposalSlot[]>([initial]);

  const addProposalSlot = useCallback((seed?: ProposalSlot) => {
    setProposalSlots((prev) => [
      ...prev,
      seed ?? prev[0] ?? initial,
    ]);
  }, [initial]);

  const removeProposalSlot = useCallback((index: number) => {
    setProposalSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }, []);

  const updateProposalSlot = useCallback((index: number, updates: Partial<ProposalSlot>) => {
    setProposalSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)));
  }, []);

  // Optional helper: keep first slot in sync from external NL parsing when there's exactly 1 slot
  const syncFirstSlot = useCallback((date: string, startTime: string, endTime: string) => {
    setProposalSlots((prev) => {
      if (prev.length !== 1) return prev;
      return [{ date, startTime, endTime }];
    });
  }, []);

  return {
    proposalSlots,
    setProposalSlots,
    addProposalSlot,
    removeProposalSlot,
    updateProposalSlot,
    syncFirstSlot,
  };
}
