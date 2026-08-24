"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const label =
    theme === "system"
      ? `Theme: System (${resolvedTheme})`
      : theme === "dark"
      ? "Theme: Dark"
      : "Theme: Light";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`theme-toggle-btn ${className}`}
      title={label}
      aria-label={label}
    >
      {theme === "system" ? (
        <Laptop size={17} className="theme-toggle-icon" />
      ) : resolvedTheme === "dark" ? (
        <Moon size={17} className="theme-toggle-icon" />
      ) : (
        <Sun size={17} className="theme-toggle-icon" />
      )}
    </button>
  );
}
