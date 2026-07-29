import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

export type ConnectivityState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  /** True when the device reports no usable network. */
  isOffline: boolean;
};

async function readConnectivity(): Promise<ConnectivityState> {
  try {
    const state = await Network.getNetworkStateAsync();
    const isConnected = Boolean(state.isConnected);
    const isInternetReachable =
      state.isInternetReachable === null || state.isInternetReachable === undefined
        ? null
        : Boolean(state.isInternetReachable);
    const isOffline = !isConnected || isInternetReachable === false;
    return { isConnected, isInternetReachable, isOffline };
  } catch {
    return { isConnected: true, isInternetReachable: null, isOffline: false };
  }
}

/**
 * Live connectivity from expo-network.
 * Polls on focus/app-active because Network.addNetworkStateListener availability varies by SDK.
 */
export function useConnectivity(pollMs = 4000): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>({
    isConnected: true,
    isInternetReachable: null,
    isOffline: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const next = await readConnectivity();
      if (!cancelled) setState(next);
    }

    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, pollMs);

    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [pollMs]);

  return state;
}

export { readConnectivity };
