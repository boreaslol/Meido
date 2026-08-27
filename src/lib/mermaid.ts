type MermaidApi = typeof import("mermaid").default;

let mermaidPromise: Promise<MermaidApi> | null = null;
let appliedTheme: "dark" | "neutral" | null = null;

async function getMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => mod.default);
  }
  return mermaidPromise;
}

export function formatMermaidError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error:\s*/i, "").replace(/\u001b\[[0-9;]*m/g, "").trim();
}

export async function renderMermaidSvg(
  source: string,
  isDark: boolean,
): Promise<string> {
  const mermaid = await getMermaid();
  const theme = isDark ? "dark" : "neutral";
  if (appliedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
      fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
      flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis" },
      sequence: { useMaxWidth: false },
      er: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
    });
    appliedTheme = theme;
  }

  const id = `vellum-${crypto.randomUUID().replaceAll("-", "")}`;
  const { svg } = await mermaid.render(id, source);
  return svg;
}

export function tidySvg(svg: string): string {
  return svg.replace(/max-width:\s*[\d.]+px;?/gi, "");
}
