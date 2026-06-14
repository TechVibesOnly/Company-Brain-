import { create } from "zustand";
import { Integration } from "../lib/api";
import { IngestionAuditLog } from "../types";

export interface SignalEvent {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  emitter: string;
  message: string;
  meta?: any;
}

interface CompanyBrainState {
  // Session State
  user: {
    email: string;
    role: string;
    verified: boolean;
  };
  
  // Real-time signals feed
  signalsFeed: SignalEvent[];
  addSignal: (signal: Omit<SignalEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }) => void;
  clearFeed: () => void;
  
  // Integrations Sync
  integrationsList: Integration[];
  setIntegrations: (integrations: Integration[]) => void;
  toggleIntegrationState: (id: string) => void;
}

// Initial feed events to represent active organizational learning on load
const INITIAL_SIGNALS: SignalEvent[] = [
  {
    id: "sig_init_1",
    timestamp: new Date(Date.now() - 15000).toISOString(),
    type: "success",
    emitter: "mcp-gmail-service",
    message: "Identity sync completed successfully for operator account: tanyarajeshsingh155@gmail.com",
  },
  {
    id: "sig_init_2",
    timestamp: new Date(Date.now() - 9000).toISOString(),
    type: "info",
    emitter: "crawling-slack-daemon",
    message: "Parsed Slack archive #auth-team (48 items). Found no unencrypted KMS raw keys.",
  },
  {
    id: "sig_init_3",
    timestamp: new Date(Date.now() - 3000).toISOString(),
    type: "warning",
    emitter: "pii-governance-shield",
    message: "PII Shield scrubbed high cross-origin activity email records during daily crawl sweep.",
  }
];

export const useStore = create<CompanyBrainState>((set) => ({
  user: {
    email: "tanyarajeshsingh155@gmail.com",
    role: "Lead Platform Architect",
    verified: true,
  },

  signalsFeed: INITIAL_SIGNALS,

  addSignal: (signal) =>
    set((state) => {
      const newSignal: SignalEvent = {
        id: signal.id || `sig_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: signal.timestamp || new Date().toISOString(),
        type: signal.type,
        emitter: signal.emitter,
        message: signal.message,
        meta: signal.meta,
      };
      // Keep feed clean and non-leaking memory up to 100 historical logs
      const updatedFeed = [newSignal, ...state.signalsFeed].slice(0, 100);
      return { signalsFeed: updatedFeed };
    }),

  clearFeed: () => set({ signalsFeed: [] }),

  integrationsList: [],
  
  setIntegrations: (integrations) => set({ integrationsList: integrations }),
  
  toggleIntegrationState: (id) =>
    set((state) => ({
      integrationsList: state.integrationsList.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "Active" ? "Inactive" : "Active",
              lastSynced: item.status === "Active" ? "Disabled" : "Just now",
            }
          : item
      ),
    })),
}));
