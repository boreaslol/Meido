import {
  BookOpen,
  ClipboardPaste,
  FolderOpen,
  Moon,
  PanelLeft,
  Sun,
  SunMoon,
  TriangleAlert,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ERROR_SAMPLE_DOC,
  ERROR_SAMPLE_FILENAME,
  SAMPLE_DOC,
  SAMPLE_FILENAME,
} from "@/lib/sample-doc";
import { useReaderStore, type ThemeMode } from "@/lib/reader-store";

async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

export function Toolbar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const filename = useReaderStore((s) => s.filename);
  const theme = useReaderStore((s) => s.theme);
  const isDark = useReaderStore((s) => s.isDark);
  const setDocument = useReaderStore((s) => s.setDocument);
  const setTheme = useReaderStore((s) => s.setTheme);
  const toggleToc = useReaderStore((s) => s.toggleToc);

  async function openFiles(files: FileList | File[] | null) {
    const file = files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    setDocument(text, file.name);
    toast.success(`已打开 ${file.name}`);
  }

  async function pasteMarkdown() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("剪贴板是空的");
        return;
      }
      setDocument(text, "pasted.md");
      toast.success("已从剪贴板粘贴");
    } catch {
      toast.error("无法读取剪贴板，请使用 Ctrl+V");
    }
  }

  const themeCycle: Record<ThemeMode, ThemeMode> = {
    system: "light",
    light: "dark",
    dark: "system",
  };
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : SunMoon;
  const themeLabel =
    theme === "dark"
      ? "深色"
      : theme === "light"
        ? "浅色"
        : isDark
          ? "跟随系统 · 深色"
          : "跟随系统 · 浅色";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg/85 px-2 py-2 backdrop-blur-md sm:px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="显示或隐藏目录"
            onClick={toggleToc}
          >
            <PanelLeft />
          </Button>
        </TooltipTrigger>
        <TooltipContent>目录</TooltipContent>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium tracking-tight text-fg">{filename}</p>
        <p className="hidden text-[0.7rem] text-muted sm:block">
          只读 · 点击图表即可放大
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.txt,.mdx"
        className="sr-only"
        onChange={(event) => {
          void openFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="打开文件"
            onClick={() => inputRef.current?.click()}
          >
            <FolderOpen />
          </Button>
        </TooltipTrigger>
        <TooltipContent>打开 Markdown</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="从剪贴板粘贴"
            onClick={() => void pasteMarkdown()}
          >
            <ClipboardPaste />
          </Button>
        </TooltipTrigger>
        <TooltipContent>粘贴</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="加载架构示例"
            onClick={() => {
              setDocument(SAMPLE_DOC, SAMPLE_FILENAME);
              toast.success("已加载架构示例");
            }}
          >
            <BookOpen />
          </Button>
        </TooltipTrigger>
        <TooltipContent>架构示例</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="加载语法错误示例"
            onClick={() => {
              setDocument(ERROR_SAMPLE_DOC, ERROR_SAMPLE_FILENAME);
              toast.success("已加载错误示例");
            }}
          >
            <TriangleAlert />
          </Button>
        </TooltipTrigger>
        <TooltipContent>错误示例</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`主题：${themeLabel}`}
            onClick={() => setTheme(themeCycle[theme])}
          >
            <ThemeIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{themeLabel}</TooltipContent>
      </Tooltip>
    </header>
  );
}
