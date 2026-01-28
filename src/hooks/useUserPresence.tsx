import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRESENCE_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes

export const useUserPresence = (userId: string | null) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  const updatePresence = useCallback(async () => {
    if (!userId || !isVisibleRef.current) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        console.error("Error updating presence:", error);
      }
    } catch (err) {
      console.error("Error updating presence:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Update presence immediately on mount
    updatePresence();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL);

    // Handle visibility change
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) {
        updatePresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, updatePresence]);

  return { updatePresence };
};
