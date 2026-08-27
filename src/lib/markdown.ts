import hljs from "highlight.js";
import { marked, type Token, type Tokens } from "marked";
import { escapeHtml, slugify } from "@/lib/utils";

export type Heading = {
  id: string;
  text: string;
  level: number;
};

export type DocPart =
  | { type: "html"; html: string }
  | { type: "mermaid"; source: string; id: string };

export type ParsedDoc = {
  parts: DocPart[];
  headings: Heading[];
};

const renderer = new marked.Renderer();

renderer.heading = function ({ tokens, depth, text }: Tokens.Heading) {
  const id = slugify(text);
  const inner = this.parser.parseInline(tokens);
  return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
};

renderer.code = function ({ text, lang }: Tokens.Code) {
  const language = lang?.trim().split(/\s+/)[0] ?? "";
  if (language === "mermaid") {
    return "";
  }
  const valid = Boolean(language && hljs.getLanguage(language));
  const inner = valid
    ? hljs.highlight(text, { language }).value
    : escapeHtml(text);
  const label = language ? escapeHtml(language) : "code";
  return `<pre class="code-block"><div class="code-meta"><span>${label}</span></div><code class="hljs${language ? ` language-${escapeHtml(language)}` : ""}">${inner}</code></pre>\n`;
};

renderer.html = function () {
  return "";
};

marked.use({
  gfm: true,
  breaks: false,
  renderer,
});

function isMermaidFence(token: Token): token is Tokens.Code {
  if (token.type !== "code") return false;
  const language = token.lang?.trim().split(/\s+/)[0] ?? "";
  return language === "mermaid";
}

export function parseMarkdown(source: string): ParsedDoc {
  const tokens = marked.lexer(source);
  const headings: Heading[] = [];
  const parts: DocPart[] = [];
  let buffer: Token[] = [];
  let mermaidIndex = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const html = marked.parser(buffer);
    if (html.trim()) {
      parts.push({ type: "html", html });
    }
    buffer = [];
  };

  for (const token of tokens) {
    if (token.type === "heading") {
      headings.push({
        id: slugify(token.text),
        text: token.text,
        level: token.depth,
      });
    }
    if (isMermaidFence(token)) {
      flush();
      parts.push({
        type: "mermaid",
        source: token.text.trim(),
        id: `mermaid-${mermaidIndex++}`,
      });
    } else {
      buffer.push(token);
    }
  }
  flush();

  return { parts, headings };
}
