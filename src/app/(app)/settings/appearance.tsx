"use client";

import { useEffect, useState } from "react";
import { readThemePref, saveThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearancePicker() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    // localStorage only exists in the browser, so read it after mount.
    setPref(readThemePref()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  return (
    <div>
      <p className="font-semibold">Appearance</p>
      <div className="mt-3 flex rounded-full bg-border/60 p-1" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={pref === o.value}
            onClick={() => {
              setPref(o.value);
              saveThemePref(o.value);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              pref === o.value ? "bg-surface shadow-sm" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
