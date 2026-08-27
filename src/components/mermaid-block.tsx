import { Expand, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { ZoomModal } from "@/components/zoom-modal";
import { formatMermaidError, renderMermaidSvg, tidySvg } from "@/lib/mermaid";
import { useReaderStore } from "@/lib/reader-store";

type Props = {
  source: string;
  id: string;
};

export function MermaidBlock({ source, id }: Props) {
  const isDark = useReaderStore((s) => s.isDark);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    renderMermaidSvg(source, isDark)
      .then((raw) => {
        if (!cancelled) setSvg(tidySvg(raw));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatMermaidError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [source, isDark]);

  if (error) {
    return (
      <figure className="my-6 overflow-hidden rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <figcaption className="mb-2 flex items-center gap-2 text-sm font-medium text-danger">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          这张图无法渲染
        </figcaption>
        <pre className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
          {error}
        </pre>
        <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted">
          源码
        </p>
        <pre className="overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-muted">
          {source}
        </pre>
      </figure>
    );
  }

  return (
    <>
      <figure className="group relative my-6 overflow-hidden rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
        {svg ? (
          <button
            type="button"
            className="block w-full cursor-zoom-in text-left"
            onClick={() => setOpen(true)}
            aria-label="打开图表全屏查看"
          >
            <div
              className="mermaid-inline mx-auto max-h-[28rem] overflow-hidden [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[28rem] [&_svg]:w-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </button>
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            正在绘制图表
          </div>
        )}
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-bg/80 px-2 py-1 text-xs text-muted opacity-100 shadow-[var(--shadow-border)] sm:opacity-0 sm:transition-opacity sm:duration-(--motion-quick) sm:group-hover:opacity-100">
          <Expand className="size-3.5" aria-hidden />
          点击放大
        </div>
      </figure>
      {open && svg ? (
        <ZoomModal svg={svg} onClose={() => setOpen(false)} />
      ) : null}
      <span className="sr-only" id={id}>
        Mermaid 图
      </span>
    </>
  );
}
