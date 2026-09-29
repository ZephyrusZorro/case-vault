import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, Search, SlidersHorizontal } from "lucide-react";
import { get } from "../api";
import { useWorkspace } from "../context";
import type { Document } from "../types";
import { Badge, Empty, fmtDate, fmtSize, Loading, PageHeading, label } from "../ui";
import DocumentPanel from "../DocumentPanel";

const KINDS = ["all", "fir", "police_report", "witness_statement", "charge_sheet", "court_filing", "evidence", "forensic_report", "legal_notice", "judgment", "other"];

export default function DocumentsPage() {
  const { refreshKey, notify } = useWorkspace(); const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? ""; const kind = params.get("kind") ?? "all";
  const [documents, setDocuments] = useState<Document[] | null>(null); const [selected, setSelected] = useState<Document | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { get<Document[]>(`/documents?search=${encodeURIComponent(search)}&kind=${encodeURIComponent(kind)}`).then(setDocuments).catch(error => notify(error.message, true)); }, 180); return () => window.clearTimeout(timer); }, [search, kind, refreshKey]);
  function change(key: string, value: string) { const next = new URLSearchParams(params); if (value && value !== "all") next.set(key, value); else next.delete(key); setParams(next); }
  return <><PageHeading eyebrow="DOCUMENT LIBRARY" title="Documents" description="Search across authorized case files and extracted document text." /><div className="panel"><div className="list-toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={event => change("q", event.target.value)} placeholder="Search titles, filenames, and document text" aria-label="Search documents" /></div><div className="select-wrap"><SlidersHorizontal size={16} /><select value={kind} onChange={event => change("kind", event.target.value)} aria-label="Filter document type">{KINDS.map(item => <option value={item} key={item}>{item === "all" ? "All types" : label(item)}</option>)}</select></div></div>{!documents ? <Loading /> : documents.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Document</th><th>Case</th><th>Type</th><th>Classification</th><th>Versions</th><th>Added</th><th /></tr></thead><tbody>{documents.map(item => <tr key={item.id}><td><button className="table-main table-button" onClick={() => setSelected(item)}><span className="table-icon"><FileText size={18} /></span><span><strong>{item.title}</strong><small>{item.latest?.filename} · {fmtSize(item.latest?.byte_size)}</small></span></button></td><td>{item.case_reference}</td><td>{label(item.kind)}</td><td><Badge value={item.classification} /></td><td>{item.versions.length}</td><td>{fmtDate(item.created_at)}</td><td><button className="table-arrow" onClick={() => setSelected(item)} aria-label={`Open ${item.title}`}><ArrowRight size={17} /></button></td></tr>)}</tbody></table></div> : <Empty icon="search" title="No documents found" description={search || kind !== "all" ? "Try a different search or type filter." : "Upload a document in a case file to see it here."} />}</div>{selected && <DocumentPanel document={selected} onClose={() => setSelected(null)} />}</>;
}
