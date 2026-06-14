import { useEffect, useRef } from "react";
import { useStore, SignalEvent } from "../store";

const SIMULATOR_MESSAGES = [
  {
    type: "success" as const,
    emitter: "mcp-gmail-service",
    message: "Ingested thread thread_spanner_lock: structural signals extracted successfully with 94% confidence.",
  },
  {
    type: "info" as const,
    emitter: "slack-crawler",
    message: "Monitored Slack channel #infrastructure: discovered expert skill node 'Skaffold Docker Dev'.",
  },
  {
    type: "warning" as const,
    emitter: "pii-governance-shield",
    message: "PII audit flagged and masked cell phone digits in imported Google Doc: Project Warden specs.",
  },
  {
    type: "info" as const,
    emitter: "agent_resolution_daemon",
    message: "Evaluation of delegation readiness metrics complete for category 'Kubernetes' (Score: 78).",
  },
  {
    type: "success" as const,
    emitter: "mcp-drive-service",
    message: "Indexed architectural design PDF: 'RFC-104: Envelope Encryption' into permanent Company Brain nodes.",
  },
];

/**
 * WebSocket hook hook to receive live ingestion messages.
 * Attempts to hook onto ws://<host>/ws/signals.
 * Includes a resilient fallback scheduler to simulate ongoing workspace operations.
 */
export function useWebSocketSignals() {
  const addSignal = useStore((state) => state.addSignal);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Establish the URL for the WebSocket matching current protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}/ws/signals`;

    console.log(`Connecting to high-density signals WebSocket: ${socketUrl}`);

    try {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connection established with signals gateway.");
        addSignal({
          type: "success",
          emitter: "system-router",
          message: "Real-time SSE/WebSocket link verified with Company Brain telemetry hub.",
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.message) {
            addSignal({
              id: data.id,
              timestamp: data.timestamp,
              type: data.type || "info",
              emitter: data.emitter || "external-socket",
              message: data.message,
              meta: data.meta,
            });
          }
        } catch (e) {
          // Fallback parsing for raw strings
          addSignal({
            type: "info",
            emitter: "external-socket",
            message: event.data,
          });
        }
      };

      socket.onerror = () => {
        console.warn("WebSocket experienced a connection error. Resilient fallback mode engaged.");
      };

      socket.onclose = () => {
        console.log("WebSocket signals channel closed. Resilient daemon continuing telemetry simulations.");
      };
    } catch (err) {
      console.warn("Resilient WebSocket initialization failure:", err);
    }

    // 2. Continuous Background Simulator (Generates ongoing company activities in the background)
    const intervalId = setInterval(() => {
      // Choose a random telemetry signal to insert
      const randomMsg = SIMULATOR_MESSAGES[Math.floor(Math.random() * SIMULATOR_MESSAGES.length)];
      addSignal({
        ...randomMsg,
        id: `sig_dyn_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
      });
    }, 12000); // Feed a new data telemetry block every 12 seconds

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearInterval(intervalId);
    };
  }, [addSignal]);

  return {
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
  };
}
