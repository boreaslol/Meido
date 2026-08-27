import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Transform = { x: number; y: number; scale: number };

const MIN = 0.15;
const MAX = 12;

type Props = {
  svg: string;
  onClose: () => void;
};

export function ZoomModal({ svg, onClose }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const [transform, setTransform] = useState<Transform>(transformRef.current);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);

  const commit = useCallback((next: Transform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const svgEl = stageRef.current?.querySelector("svg");
    if (!viewport || !svgEl) return;
    svgEl.style.maxWidth = "none";
    svgEl.style.width = "auto";
    svgEl.style.height = "auto";
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    const box = svgEl.getBBox();
    const pad = 72;
    const availableW = Math.max(viewport.clientWidth - pad, 80);
    const availableH = Math.max(viewport.clientHeight - pad, 80);
    const nextScale = Math.min(
      availableW / Math.max(box.width, 1),
      availableH / Math.max(box.height, 1),
      1.6,
    );
    commit({
      x: (viewport.clientWidth - box.width * nextScale) / 2 - box.x * nextScale,
      y: (viewport.clientHeight - box.height * nextScale) / 2 - box.y * nextScale,
      scale: Math.max(nextScale, MIN),
    });
  }, [commit]);

  useEffect(() => {
    const frame = requestAnimationFrame(fit);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
    };
  }, [fit, svg]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "0") fit();
      if (event.key === "+" || event.key === "=") zoomBy(1.18);
      if (event.key === "-" || event.key === "_") zoomBy(1 / 1.18);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(event.clientX, event.clientY, factor);
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  });

  function zoomAt(clientX: number, clientY: number, factor: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const prev = transformRef.current;
    const nextScale = Math.min(MAX, Math.max(MIN, prev.scale * factor));
    const ratio = nextScale / prev.scale;
    commit({
      scale: nextScale,
      x: px - (px - prev.x) * ratio,
      y: py - (py - prev.y) * ratio,
    });
  }

  function zoomBy(factor: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const prev = transformRef.current;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: prev.x,
      originY: prev.y,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    commit({
      ...transformRef.current,
      x: drag.originX + (event.clientX - drag.x),
      y: drag.originY + (event.clientY - drag.y),
    });
  }

  function onPointerUp(event: React.PointerEvent) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  const percent = Math.round(transform.scale * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg/92 text-fg"
      role="dialog"
      aria-modal="true"
      aria-label="图表全屏查看"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <p className="text-xs tracking-wide text-muted">
          滚轮缩放 · 拖拽平移 · Esc 关闭
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="缩小"
            onClick={() => zoomBy(1 / 1.2)}
          >
            <Minus />
          </Button>
          <span className="min-w-12 text-center font-mono text-xs tabular-nums text-muted">
            {percent}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="放大"
            onClick={() => zoomBy(1.2)}
          >
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="适应窗口" onClick={fit}>
            <RotateCcw />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="关闭" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={fit}
      >
        <div
          ref={stageRef}
          className="mermaid-zoom-stage origin-top-left will-change-transform"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
