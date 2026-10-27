import { Fragment } from "react";

// Render source text as React nodes. Never execute report HTML or script URLs.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-slate-100 px-1 text-xs">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link && /^https?:\/\//i.test(link[2])) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{link[1]}</a>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
export function commerceReportBlocks(report: string) {
  const lines = report.replace(/\r\n/g, "\n").split("\n"), blocks: { kind: string; lines: string[]; level?: number }[] = [];
  const cells = (s: string) => s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  for (let i = 0; i < lines.length;) {
    const s = lines[i].trim();
    if (!s) { i++; continue; }
    const heading = s.match(/^(#{1,6})\s+(.+)/);
    if (heading) { blocks.push({ kind: "heading", level: heading[1].length, lines: [heading[2]] }); i++; continue; }
    // Older reports contain pipe tables without Markdown delimiter rows.
    if (s.includes("|") && i + 1 < lines.length && cells(s).length >= 2 && cells(s).length === cells(lines[i + 1]).length) {
      const table = [s]; i++;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|") && cells(lines[i]).length === cells(s).length) { if (!cells(lines[i]).every(c => /^:?-+:?$/.test(c))) table.push(lines[i].trim()); i++; }
      blocks.push({ kind: "table", lines: table }); continue;
    }
    if (/^[-*•]\s+/.test(s) || /^\d+[.)、]\s*/.test(s)) { const list: string[] = []; while (i < lines.length && /^(?:[-*•]\s+|\d+[.)、]\s*)/.test(lines[i].trim())) list.push(lines[i++].trim().replace(/^(?:[-*•]\s+|\d+[.)、]\s*)/, "")); blocks.push({ kind: "list", lines: list }); continue; }
    blocks.push({ kind: "paragraph", lines: [s] }); i++;
  }
  return blocks;
}
export default function CommerceReport({ report }: { report: string }) {
  const cells = (s: string) => s.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  return <article aria-label="完整运营方案正文" className="min-w-0 space-y-3 break-words text-sm leading-7 text-slate-600">{commerceReportBlocks(report).map((b, i) => {
    if (b.kind === "heading") { const Tag = b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4"; return <Tag key={i} className={(b.level! <= 2 ? "border-b border-slate-100 pb-3 pt-6 text-lg" : "pt-3 text-base") + " font-semibold text-slate-900"}>{inline(b.lines[0])}</Tag>; }
    if (b.kind === "table") return <div key={i} className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[520px] text-left"><thead className="bg-indigo-50 text-slate-800"><tr>{cells(b.lines[0]).map((c, n) => <th key={n} className="px-4 py-3 font-semibold">{inline(c)}</th>)}</tr></thead><tbody>{b.lines.slice(1).map((r, n) => <tr key={n} className="border-t border-slate-100 even:bg-slate-50/50">{cells(r).map((c, k) => <td key={k} className="min-w-28 px-4 py-3 align-top">{inline(c)}</td>)}</tr>)}</tbody></table></div>;
    if (b.kind === "list") return <ul key={i} className="list-disc space-y-2 pl-6">{b.lines.map((l, n) => <li key={n}>{inline(l)}</li>)}</ul>;
    return <p key={i}>{inline(b.lines[0])}</p>;
  })}</article>;
}
