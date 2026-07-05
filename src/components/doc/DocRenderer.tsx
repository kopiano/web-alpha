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
  let tableRows: { header: string[]; rows: string[][] } | null = null;

  const flushTable = (idx: number) => {
    if (!tableRows) return;
    const { header, rows } = tableRows;
    els.push(
      <div key={`tbl-${idx}`} className="w-full overflow-hidden rounded-xl my-5"
        style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <table className="w-full border-collapse">
          {header.length > 0 && (
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
                {header.map((h, j) => (
                  <th key={j} className="text-left text-[11px] font-semibold text-white/40 uppercase tracking-[0.05em] px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                {row.map((c, j) => (
                  <td key={j} className="text-[12px] text-white/65 px-4 py-3">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = null;
  };

  lines.forEach((line, i) => {
    const k = `md-${i}`;
    if (line.startsWith("```")) {
      flushTable(i);
      if (inCode) { els.push(<CodeBlock key={k} code={code.join("\n")} lang={lang} />); code = []; lang = ""; inCode = false; }
      else { inCode = true; lang = line.slice(3).trim(); }
      return;
    }
    if (inCode) { code.push(line); return; }

    // Table row
    if (line.startsWith("| ")) {
      if (line.includes("---")) return;
      const cols = line.split("|").filter(Boolean).map(c => c.trim().replace(/`/g, ""));
      const isHeader = lines[i + 1]?.includes("---");
      if (isHeader) { tableRows = { header: cols, rows: [] }; return; }
      if (!tableRows) { tableRows = { header: [], rows: [] }; }
      tableRows.rows.push(cols);
      return;
    }

    // Non-table → flush pending table
    flushTable(i);

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      els.push(
        <h1 key={k} className="text-[28px] font-bold tracking-tight text-white/90 leading-[1.15] mb-6 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {line.slice(2)}
        </h1>
      );
    }
    else if (line.startsWith("## ")) {
      els.push(
        <h2 key={k} className="text-lg font-semibold tracking-tight text-white/85 mt-10 mb-3 pb-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {line.slice(3)}
        </h2>
      );
    }
    else if (line.startsWith("### ")) {
      els.push(
        <h3 key={k} className="text-[15px] font-semibold text-white/75 mt-7 mb-2">{line.slice(4)}</h3>
      );
    }
    else if (line.startsWith("- ")) {
      els.push(
        <div key={k} className="flex items-start gap-2.5 text-[13px] text-white/60 leading-relaxed pl-1 my-0.5">
          <span className="mt-[5px] shrink-0 block w-1 h-1 rounded-full bg-cyan-400/50" />
          <span className="flex-1">{line.slice(2)}</span>
        </div>
      );
    }
    else if (line.startsWith("> ")) {
      els.push(
        <div key={k} className="text-[13px] text-white/45 italic leading-relaxed my-5 pl-4 py-2.5 rounded-sm"
          style={{ borderLeft: "2px solid rgba(76,201,240,0.25)", background: "linear-gradient(to right, rgba(76,201,240,0.03), transparent)" }}>
          {line.slice(2)}
        </div>
      );
    }
    else if (line.trim()) {
      els.push(
        <p key={k} className="text-[13.5px] text-white/65 leading-[1.85] mb-2 tracking-[0.01em]">{line}</p>
      );
    }
  });

  if (inCode) els.push(<CodeBlock key="md-end" code={code.join("\n")} lang={lang} />);
  flushTable(lines.length);
  return els;
}
