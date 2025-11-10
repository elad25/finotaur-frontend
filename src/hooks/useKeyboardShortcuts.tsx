import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutHandlers {
  onCommandPalette?: () => void;
  onAddAlert?: () => void;
  onAddWatchlist?: () => void;
  onNewJournalEntry?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers = {}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // ⌘/Ctrl + K - Command Palette
      if (modKey && e.key === "k") {
        e.preventDefault();
        handlers.onCommandPalette?.();
        return;
      }

      // Single key shortcuts (only when not in input)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        // g + d - Dashboard
        case "d":
          if (e.key === "d") {
            navigate("/app/dashboard");
          }
          break;
        // g + c - Charts
        case "c":
          if (e.key === "c") {
            navigate("/app/charts");
          }
          break;
        // g + s - Screener
        case "s":
          if (e.key === "s") {
            navigate("/app/screener");
          }
          break;
        // g + e - Earnings
        case "e":
          if (e.key === "e") {
            navigate("/app/earnings");
          }
          break;
        // g + n - News
        case "n":
          if (e.key === "n") {
            navigate("/app/news");
          }
          break;
        // a - Add Alert
        case "a":
          if (e.key === "a") {
            e.preventDefault();
            handlers.onAddAlert?.();
          }
          break;
        // w - Add to Watchlist
        case "w":
          if (e.key === "w") {
            e.preventDefault();
            handlers.onAddWatchlist?.();
          }
          break;
        // j - New Journal Entry
        case "j":
          if (e.key === "j") {
            e.preventDefault();
            handlers.onNewJournalEntry?.();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, handlers]);
};
