import { create } from "zustand";
import { SAMPLE_DOC, SAMPLE_FILENAME } from "@/lib/sample-doc";

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "vellum-theme";
const TOC_KEY = "vellum-toc";

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

type ReaderState = {
  markdown: string;
  filename: string;
  theme: ThemeMode;
  isDark: boolean;
  tocOpen: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setDocument: (markdown: string, filename: string) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleToc: () => void;
  applyResolvedDark: () => void;
};

export const useReaderStore = create<ReaderState>((set, get) => ({
  markdown: SAMPLE_DOC,
  filename: SAMPLE_FILENAME,
  theme: "system",
  isDark: false,
  tocOpen: false,
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const theme: ThemeMode =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : "system";
    const storedToc = window.localStorage.getItem(TOC_KEY);
    const tocOpen =
      storedToc === "1" ||
      (storedToc === null && window.matchMedia("(min-width: 768px)").matches);
    set({ theme, tocOpen, isDark: resolveDark(theme), hydrated: true });
  },
  setDocument: (markdown, filename) => set({ markdown, filename }),
  setTheme: (theme) => {
    window.localStorage.setItem(THEME_KEY, theme);
    set({ theme, isDark: resolveDark(theme) });
  },
  toggleToc: () => {
    const tocOpen = !get().tocOpen;
    window.localStorage.setItem(TOC_KEY, tocOpen ? "1" : "0");
    set({ tocOpen });
  },
  applyResolvedDark: () => set({ isDark: resolveDark(get().theme) }),
}));
