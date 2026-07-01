import { useState, useMemo } from "react";
import hljs from "highlight.js";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps { code: string; lang: string; }

export function normalizeLang(lang: string): string {
  const map: Record<string, string> = {
    sh: "bash", shell: "bash", zsh: "bash", bash: "bash",
    bat: "dos", cmd: "dos", dos: "dos",
    py: "python", js: "javascript", ts: "typescript",
    jsx: "javascript", tsx: "typescript",
    rb: "ruby", rs: "rust", go: "go", sql: "sql",
    json: "json", yml: "yaml", yaml: "yaml",
    md: "markdown", mdx: "markdown",
    html: "xml", hbs: "handlebars",
    txt: "plaintext", text: "plaintext", plain: "plaintext",
    redis: "redis",
  };
  return map[lang.toLowerCase()] || lang;
}

export const CodeBlock = ({ code, lang }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  const html = useMemo(() => {
    if (!code) return "";
    const l = normalizeLang(lang || "");
    try {
      if (l && hljs.getLanguage(l)) return hljs.highlight(code, { language: l }).value;
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [code, lang]);

  const displayLang = lang || (() => { try { return hljs.highlightAuto(code).language || ""; } catch { return ""; } })();

  return (
    <>
      <style>{`
        .hljs { color: rgba(255,255,255,0.92); background: transparent !important; }
        .hljs-keyword, .hljs-selector-tag, .hljs-type { color: #C084FC; }
        .hljs-title, .hljs-title.class_, .hljs-title.function_, .hljs-name { color: #A78BFA; }
        .hljs-number, .hljs-literal, .hljs-attribute { color: #38BDF8; }
        .hljs-string, .hljs-attr, .hljs-value { color: #EDE9FE; }
        .hljs-comment, .hljs-quote { color: rgba(255,255,255,0.25); font-style: italic; }
        .hljs-built_in, .hljs-builtin-name { color: #A78BFA; }
        .hljs-meta { color: rgba(255,255,255,0.4); }
        .hljs-section { color: #C084FC; font-weight: bold; }
        .hljs-deletion { color: #f87171; }
        .hljs-addition { color: #34d399; }
        .hljs-selector-pseudo { color: #38BDF8; }
        .hljs-params { background: rgba(56,189,248,0.14); border-radius: 6px; padding: 2px 8px; }
        .hljs-variable, .hljs-template-variable { color: rgba(255,255,255,0.75); }
        .hljs-symbol, .hljs-bullet { color: #38BDF8; }
        .hljs-link { color: #38BDF8; text-decoration: underline; }
        .hljs-emphasis { font-style: italic; }
        .hljs-strong { font-weight: bold; }
        .hljs-formula { color: #C084FC; }
      `}</style>
    <div className="group my-6 relative overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: "linear-gradient(135deg, rgba(16,10,28,0.92) 0%, rgba(28,14,52,0.88) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 20px 80px rgba(168,85,247,0.18), 0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" style={{ background: "#0A0814" }}>
        {/* Radial purple glows */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.25), transparent 55%)" }} />
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.1), transparent 50%)" }} />
        {/* Dotted grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
          <defs>
            <pattern id={`dot-grid-${displayLang || "code"}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(168,85,247,0.5)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dot-grid-${displayLang || "code"})`} />
        </svg>
        {/* Center subtle highlight */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 40%, rgba(168,85,247,0.06), transparent 60%)" }} />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between h-[40px] px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        {/* Left: window dots + language label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[8px]">
            <span className="w-[12px] h-[12px] rounded-full" style={{ background: "rgba(255,255,255,0.15)", boxShadow: "0 0 6px rgba(255,255,255,0.04)" }} />
            <span className="w-[12px] h-[12px] rounded-full" style={{ background: "rgba(255,255,255,0.12)", boxShadow: "0 0 6px rgba(255,255,255,0.03)" }} />
            <span className="w-[12px] h-[12px] rounded-full" style={{ background: "rgba(255,255,255,0.09)", boxShadow: "0 0 6px rgba(255,255,255,0.02)" }} />
          </div>
          <span className="text-[11px] font-mono font-medium ml-2" style={{ color: "rgba(255,255,255,0.35)" }}>{displayLang || "code"}</span>
        </div>

        {/* Right: copy button (always visible) */}
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-[11px] transition-all duration-300 px-3 py-1.5 rounded-lg"
          style={{
            background: copied ? "rgba(125,231,135,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${copied ? "rgba(125,231,135,0.2)" : "rgba(255,255,255,0.07)"}`,
            color: copied ? "rgba(125,231,135,0.9)" : "rgba(255,255,255,0.4)",
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

        {/* Code content */}
      <div className="relative flex overflow-x-auto scrollbar-none" style={{ padding: "28px 24px" }}>
        {/* Line numbers */}
        <div
          className="select-none text-right shrink-0"
          style={{
            paddingRight: "16px",
            color: "rgba(255,255,255,0.18)",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "13px",
            lineHeight: "1.8",
            minWidth: `${String(lines.length).length + 2}ch`,
            borderRight: "1px solid rgba(255,255,255,0.04)",
            marginRight: "16px",
          }}
        >
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        {/* Code */}
        <pre
          className="overflow-x-auto scrollbar-none"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "13px",
            lineHeight: "1.8",
            color: "rgba(255,255,255,0.92)",
            margin: 0,
            whiteSpace: "pre",
          }}
        >
          <code
            className="hljs"
            style={{ background: "transparent", color: "rgba(255,255,255,0.92)", padding: 0, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "13px" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
    </>
  );
};
