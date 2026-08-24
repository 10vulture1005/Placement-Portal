"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribe(callback: () => void) {
  const onStorage = () => callback();
  const onMedia = () => {
    updateDocumentTheme(getThemeFromStorage());
    callback();
  };

  window.addEventListener("storage", onStorage);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onMedia);

  return () => {
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onMedia);
  };
}

function getThemeFromStorage(): Theme {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem("tnp-theme");
  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }
  return "system";
}

function getThemeSnapshot(): string {
  if (typeof window === "undefined") return "system:light";
  const theme = getThemeFromStorage();
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return `${theme}:${isDark ? "dark" : "light"}`;
}

function getServerSnapshot(): string {
  return "system:light";
}

function updateDocumentTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot);
  const [themePart, resolvedPart] = snapshot.split(":") as [Theme, "light" | "dark"];
  const theme = themePart || "system";
  const resolvedTheme = resolvedPart || "light";

  useEffect(() => {
    updateDocumentTheme(theme);
  }, [theme, resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem("tnp-theme", newTheme);
    updateDocumentTheme(newTheme);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
