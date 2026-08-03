import { useNotification, type OpenNotificationParams } from "@refinedev/core";
import { useMemo } from "react";

/**
 * Refine types `OpenNotificationParams["type"]` as `"success" | "error" | "progress"`,
 * where `"progress"` is the undoable-mutation countdown rather than a severity.
 * The antd notification provider forwards every other value straight to
 * `notification.open({ type })`, and antd accepts `"info"` and `"warning"` too,
 * so both render correctly at runtime and only the type is too narrow.
 *
 * Rather than casting at each of the ~30 call sites, this hook widens the
 * signature once. If the notification provider is ever swapped for one that
 * cannot render these severities, this is the single place to map them down.
 */
export type AppNotificationType = "success" | "error" | "info" | "warning" | "progress";

export type AppNotificationParams = Omit<OpenNotificationParams, "type"> & {
  type: AppNotificationType;
};

export const useAppNotification = () => {
  const { open, close } = useNotification();

  return useMemo(
    () => ({
      open: open as ((params: AppNotificationParams) => void) | undefined,
      close,
    }),
    [open, close]
  );
};
