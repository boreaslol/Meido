import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { MarkdownView, useHeadings } from "@/components/markdown-view";
import { TocPanel } from "@/components/toc-panel";
import { Toolbar } from "@/components/toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReaderStore } from "@/lib/reader-store";
import { cn } from "@/lib/utils";

export function AppShell() {
  const markdown = useReaderStore((s) => s.markdown);
  const isDark = useReaderStore((s) => s.isDark);
  const tocOpen = useReaderStore((s) => s.tocOpen);
  const theme = useReaderStore((s) => s.theme);
  const hydrate = useReaderStore((s) => s.hydrate);
  const applyResolvedDark = useReaderStore((s) => s.applyResolvedDark);
  const setDocument = useReaderStore((s) => s.setDocument);
  const toggleToc = useReaderStore((s) => s.toggleToc);
  const headings = useHeadings(markdown);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyResolvedDark();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, applyResolvedDark]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "o") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>('input[type="file"]')
          ?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const text = event.clipboardData?.getData("text/plain");
      if (!text?.trim()) return;
      event.preventDefault();
      setDocument(text, "pasted.md");
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [setDocument]);

  return (
    <TooltipProvider>
      <div
        className="flex min-h-dvh bg-bg text-fg"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (!file) return;
          void file.text().then((text) => setDocument(text, file.name));
        }}
      >
        {tocOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-10 bg-bg/50 md:hidden"
            aria-label="关闭目录"
            onClick={toggleToc}
          />
        ) : null}

        <aside
          className={cn(
            "z-20 shrink-0 overflow-y-auto border-r border-border bg-bg",
            "fixed inset-y-0 left-0 w-64 md:sticky md:top-0 md:h-dvh",
            tocOpen
              ? "translate-x-0"
              : "-translate-x-full md:w-0 md:border-r-0 md:translate-x-0",
          )}
        >
          {tocOpen ? <TocPanel headings={headings} /> : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar />
          <main className="min-w-0 flex-1 overflow-x-hidden bg-paper">
            <MarkdownView markdown={markdown} />
          </main>
        </div>

        {dragging ? (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-bg/70">
            <div className="rounded-2xl bg-surface px-6 py-5 text-sm shadow-[var(--shadow-border)]">
              放开以打开 Markdown
            </div>
          </div>
        ) : null}
      </div>
      <Toaster
        theme={isDark ? "dark" : "light"}
        position="bottom-center"
        richColors={false}
      />
    </TooltipProvider>
  );
}
