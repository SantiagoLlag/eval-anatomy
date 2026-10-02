"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const THEMES = ["system", "light", "dark"] as const;
const subscribe = () => () => {};

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored theme on the client; avoid a hydration mismatch.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <label className="inline-flex items-center text-sm">
      <span className="sr-only">{t("label")}</span>
      <select
        value={mounted ? (theme ?? "system") : "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="h-10 rounded-md border border-border bg-background px-2"
      >
        {THEMES.map((v) => (
          <option key={v} value={v}>
            {t(v)}
          </option>
        ))}
      </select>
    </label>
  );
}
