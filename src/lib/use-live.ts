"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LiveSource = { table: string; filter?: string };

/**
 * Server-rendered `initial` data that stays in sync with Supabase Realtime.
 * Any change to the watched tables (from either phone) re-runs `fetcher`.
 * Also refetches when the app returns to the foreground or comes back online,
 * since phones drop websockets in the background.
 */
export function useLive<T>(initial: T, fetcher: () => Promise<T>, sources: LiveSource[]) {
  const [data, setData] = useState<T>(initial);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    try {
      setData(await fetcherRef.current());
    } catch (e) {
      console.error("[live] reload failed", e);
    }
  }, []);

  const sourcesKey = JSON.stringify(sources);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 150);
    };

    const channel = supabase.channel(`live-${Math.random().toString(36).slice(2)}`);
    for (const s of JSON.parse(sourcesKey) as LiveSource[]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: s.table, filter: s.filter },
        schedule,
      );
      // Realtime can't filter DELETE events, so listen to those unfiltered.
      if (s.filter) {
        channel.on("postgres_changes", { event: "DELETE", schema: "public", table: s.table }, schedule);
      }
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") schedule(); // catch anything missed while connecting
    });

    const onVisible = () => document.visibilityState === "visible" && schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", schedule);
      supabase.removeChannel(channel);
    };
  }, [sourcesKey, reload]);

  return { data, setData, reload };
}
