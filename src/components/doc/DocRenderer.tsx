import { CodeBlock } from "@/components/doc/CodeBlock";
import type { ReactNode } from "react";

/* ─── Mini MD renderer ─── */
export function MiniMd(text: string) {
  const html = text
    .replace(/^### (.+)$/gm, '<div class="text-sm font-semibold text-white/80 mt-3 mb-1">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-bold text-white/85 mt-4 mb-2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-white mt-4 mb-2">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:rgba(255,255,255,0.92)">$1</strong>')
    .replace(/_(.+?)_/g, '<em style="color:rgba(255,255,255,0.6)">$1</em>')
    .replace(/~~(.+?)~~/g, '<del style="color:rgba(255,255,255,0.35)">$1</del>')
    .replace(/`(.+?)`/g, '<code style="color:#a5d6ff;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px;font-size:inherit">$1</code>')
    .replace(/> (.+)/g, '<div style="border-left:2px solid rgba(76,201,240,0.3);padding-left:12px;color:rgba(255,255,255,0.55);margin:4px 0">$1</div>')
    .replace(/^[\s]*[-*][\s]+(.+)/gm, '<div style="display:flex;gap:6px;color:rgba(255,255,255,0.6);padding:1px 0"><span style="color:rgba(76,201,240,0.5)">•</span><span>$1</span></div>')
    .replace(/\n{2,}/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br />');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ─── Markdown Renderer ─── */
export function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const els: ReactNode[] = [];
  let inCode = false, code: string[] = [], lang = "";
  let inTable = false;

  const pushTable = () => { inTable = false; };

  lines.forEach((line, i) => {
    const k = `md-${i}`;
    if (line.startsWith("```")) {
      if (inCode) { els.push(<CodeBlock key={k} code={code.join("\n")} lang={lang} />); code = []; lang = ""; inCode = false; }
      else { inCode = true; lang = line.slice(3).trim(); }
      return;
    }
    if (inCode) { code.push(line); return; }

    if (line.startsWith("## ")) { pushTable(); els.push(<h2 key={k} className="text-xl font-bold text-white/90 mt-8 mb-3">{line.slice(3)}</h2>); }
    else if (line.startsWith("# ")) { pushTable(); els.push(<h1 key={k} className="text-[26px] font-bold text-white leading-[1.08] mb-4">{line.slice(2)}</h1>); }
    else if (line.startsWith("### ")) { pushTable(); els.push(<h3 key={k} className="text-base font-semibold text-white/80 mt-6 mb-2">{line.slice(4)}</h3>); }
    else if (line.startsWith("| ")) {
      if (line.includes("---")) return;
      const cols = line.split("|").filter(Boolean).map(c => c.trim());
      const isHeader = lines[i + 1]?.includes("---");
      els.push(<div key={k} className="flex gap-4 px-3 py-1.5 text-[12px]" style={{ color: isHeader ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.7)" }}>{cols.map((c, j) => <span key={j} className="flex-1 [font-weight:inherit]">{c.replace(/`/g, "")}</span>)}</div>);
    } else if (line.startsWith("- ")) { pushTable(); els.push(<li key={k} className="text-[13px] text-white/60 ml-4 list-disc">{line.slice(2)}</li>); }
    else if (line.trim()) { pushTable(); els.push(<p key={k} className="text-[13px] text-white/65 leading-[1.9] mb-1">{line}</p>); }
    else { pushTable(); }
  });
  if (inCode) els.push(<CodeBlock key="md-end" code={code.join("\n")} lang={lang} />);
  return els;
}
