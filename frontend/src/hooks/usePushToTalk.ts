import { useEffect } from "react";

import { print } from "graphql";

import { SubscriptionHotkeyEventsDocument } from "../api/gql/graphql";
import type { SubscriptionHotkeyEventsSubscription } from "../api/gql/graphql";
import { getGraphqlWsClient } from "../api/graphqlClient";

export interface HotkeyEventFrame {
  kind: "press" | "release";
  accelerator: string;
  observedAt: string;
}

export interface UsePushToTalkHandlers {
  onPress?: (event: HotkeyEventFrame) => void;
  onRelease?: (event: HotkeyEventFrame) => void;
}

export const usePushToTalk = (handlers: UsePushToTalkHandlers): void => {
  useEffect(() => {
    const wsClient = getGraphqlWsClient();
    const unsubscribe = wsClient.subscribe<SubscriptionHotkeyEventsSubscription>(
      { query: print(SubscriptionHotkeyEventsDocument) },
      {
        next: (value) => {
          if (!value.data) return;
          const frame = value.data.hotkeyEvents;
          if (frame.kind === "press") {
            handlers.onPress?.({ kind: "press", accelerator: frame.accelerator, observedAt: frame.observedAt });
          } else if (frame.kind === "release") {
            handlers.onRelease?.({ kind: "release", accelerator: frame.accelerator, observedAt: frame.observedAt });
          }
        },
        error: () => {},
        complete: () => {},
      }
    );
    return () => {
      unsubscribe();
      void wsClient.dispose();
    };
  }, [handlers]);
};
