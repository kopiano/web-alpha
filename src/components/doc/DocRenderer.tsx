import { CodeBlock } from "@/components/doc/CodeBlock";
import type { ReactNode } from "react";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=<>?/\\|'"":;{}\[\],.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

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

/* ─── Inline markdown formatting ─── */
function inlineMd(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="text-[#a5d6ff] bg-white/[0.06] px-[5px] py-[1px] rounded text-[inherit]" style="font-size:inherit">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/85 font-semibold">$1</strong>')
    .replace(/_(.+?)_/g, '<em class="text-white/50">$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="text-white/30">$1</del>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400/80 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 transition-colors">$1</a>');
}

/* ─── Markdown Renderer ─── */
export function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const els: ReactNode[] = [];
  let inCode = false, code: string[] = [], lang = "";
  let tableRows: { header: string[]; rows: string[][] } | null = null;
  const headingCounts = new Map<string, number>();

  const makeHeadingId = (text: string) => {
    const base = slugify(text) || "heading";
    const count = headingCounts.get(base) || 0;
    headingCounts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  const flushTable = (idx: number) => {
    if (!tableRows) return;
    const { header, rows } = tableRows;
    els.push(
      <div key={`tbl-${idx}`} className="w-full overflow-hidden rounded-lg my-6"
        style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
        <table className="w-full border-collapse">
          {header.length > 0 && (
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {header.map((h, j) => (
                  <th key={j} className="text-left text-[11px] font-medium text-white/35 tracking-[0.06em] uppercase px-4 py-3" dangerouslySetInnerHTML={{ __html: inlineMd(h) }} />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="transition-colors duration-150"
                style={{
                  borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                }}>
                {row.map((c, j) => (
                  <td key={j} className="text-[12.5px] text-white/60 px-4 py-2.5 tracking-[0.015em] leading-snug" dangerouslySetInnerHTML={{ __html: inlineMd(c) }} />
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
      const cols = line.split("|").filter(Boolean).map(c => c.trim());
      const isHeader = lines[i + 1]?.includes("---");
      if (isHeader) { tableRows = { header: cols, rows: [] }; return; }
      if (!tableRows) { tableRows = { header: [], rows: [] }; }
      tableRows.rows.push(cols);
      return;
    }

    // Non-table → flush pending table
    flushTable(i);

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      const title = line.slice(2);
      els.push(
        <h1 id={makeHeadingId(title)} key={k} className="text-[26px] font-bold tracking-[-0.02em] text-white/90 leading-[1.2] mb-6 pb-4 scroll-mt-24"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          dangerouslySetInnerHTML={{ __html: inlineMd(title) }} />
      );
    }
    else if (line.startsWith("## ")) {
      const title = line.slice(3);
      els.push(
        <h2 id={makeHeadingId(title)} key={k} className="text-[17px] font-semibold tracking-[-0.01em] text-white/85 mt-9 mb-3 pb-2 scroll-mt-24"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
          dangerouslySetInnerHTML={{ __html: inlineMd(title) }} />
      );
    }
    else if (line.startsWith("### ")) {
      const title = line.slice(4);
      els.push(
        <h3 id={makeHeadingId(title)} key={k} className="text-[14px] font-semibold tracking-[0.01em] text-white/75 mt-6 mb-2 scroll-mt-24"
          dangerouslySetInnerHTML={{ __html: inlineMd(title) }} />
      );
    }
    else if (line.startsWith("- ")) {
      els.push(
        <div key={k} className="flex items-start gap-3 text-[13px] text-white/60 leading-relaxed tracking-[0.02em] pl-0.5 my-1">
          <span className="mt-[6px] shrink-0 block w-[5px] h-[5px] rounded-full bg-white/30" />
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: inlineMd(line.slice(2)) }} />
        </div>
      );
    }
    else if (line.startsWith("> ")) {
      els.push(
        <div key={k} className="text-[13px] text-white/40 leading-[1.7] tracking-[0.02em] my-5 pl-4 py-2.5 rounded-sm"
          style={{ borderLeft: "2px solid rgba(76,201,240,0.2)", background: "linear-gradient(to right, rgba(76,201,240,0.02), transparent)" }}
          dangerouslySetInnerHTML={{ __html: inlineMd(line.slice(2)) }} />
      );
    }
    else if (line.trim()) {
      els.push(
        <p key={k} className="text-[13.5px] text-white/65 leading-[1.8] mb-2.5 tracking-[0.025em]"
          dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />
      );
    }
  });

  if (inCode) els.push(<CodeBlock key="md-end" code={code.join("\n")} lang={lang} />);
  flushTable(lines.length);
  return els;
}
