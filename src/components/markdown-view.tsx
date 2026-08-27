import { useMemo } from "react";
import { MermaidBlock } from "@/components/mermaid-block";
import { parseMarkdown } from "@/lib/markdown";

type Props = {
  markdown: string;
};

export function MarkdownView({ markdown }: Props) {
  const parsed = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <article className="prose-vellum mx-auto w-full max-w-[46rem] px-4 py-8 sm:px-6 sm:py-12">
      {parsed.parts.map((part, index) =>
        part.type === "html" ? (
          <div
            key={`html-${index}`}
            className="prose-body"
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        ) : (
          <MermaidBlock key={part.id} id={part.id} source={part.source} />
        ),
      )}
    </article>
  );
}

export function useHeadings(markdown: string) {
  return useMemo(() => parseMarkdown(markdown).headings, [markdown]);
}
