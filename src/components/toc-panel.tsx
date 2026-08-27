import { useEffect, useState } from "react";
import type { Heading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type Props = {
  headings: Heading[];
};

export function TocPanel({ headings }: Props) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 1] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted">这份文档没有标题。</p>
    );
  }

  return (
    <nav aria-label="目录" className="px-2 py-3">
      <p className="px-2 pb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">
        目录
      </p>
      <ul className="flex flex-col gap-0.5">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block rounded-md py-1.5 pr-2 text-[0.8125rem] leading-snug text-muted transition-colors duration-(--motion-quick) hover:bg-surface hover:text-fg",
                heading.level === 1 && "pl-2 font-medium",
                heading.level === 2 && "pl-4",
                heading.level >= 3 && "pl-6",
                active === heading.id && "bg-surface text-fg",
              )}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
