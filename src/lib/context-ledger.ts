import { promises as fs } from "fs";
import * as path from "path";

interface SourceCheck {
  type: "grep" | "lsp" | "read" | "glob";
  pattern?: string;
  action?: string;
  symbol?: string;
  file?: string;
  lines?: string;
  files_matched?: number;
  count?: number;
}

interface Consultation {
  timestamp: string;
  query: string;
  sources_checked: SourceCheck[];
  key_findings: string[];
  excerpts_returned: number;
}

interface ContextLedger {
  session_id: string | null;
  consultations: Consultation[];
  total_sources_checked: number;
  total_excerpts_returned: number;
}

const LEDGER_PATH = path.join(process.cwd(), "memory", "context-ledger.json");

export async function loadLedger(): Promise<ContextLedger> {
  try {
    const data = await fs.readFile(LEDGER_PATH, "utf-8");
    return JSON.parse(data) as ContextLedger;
  } catch {
    return {
      session_id: null,
      consultations: [],
      total_sources_checked: 0,
      total_excerpts_returned: 0,
    };
  }
}

export async function saveLedger(ledger: ContextLedger): Promise<void> {
  const dir = path.dirname(LEDGER_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf-8");
}

export async function logConsultation(
  query: string,
  sources: SourceCheck[],
  findings: string[],
  excerptCount: number
): Promise<void> {
  const ledger = await loadLedger();

  const consultation: Consultation = {
    timestamp: new Date().toISOString(),
    query,
    sources_checked: sources,
    key_findings: findings,
    excerpts_returned: excerptCount,
  };

  ledger.consultations.push(consultation);
  ledger.total_sources_checked += sources.length;
  ledger.total_excerpts_returned += excerptCount;

  await saveLedger(ledger);
}

export interface LedgerSummary {
  sessionId: string | null;
  consultationCount: number;
  totalSourcesChecked: number;
  totalExcerptsReturned: number;
  recentQueries: string[];
}

export async function getLedgerSummary(): Promise<LedgerSummary> {
  const ledger = await loadLedger();

  return {
    sessionId: ledger.session_id,
    consultationCount: ledger.consultations.length,
    totalSourcesChecked: ledger.total_sources_checked,
    totalExcerptsReturned: ledger.total_excerpts_returned,
    recentQueries: ledger.consultations.slice(-5).map((c) => c.query),
  };
}

export async function resetLedgerForSession(sessionId: string): Promise<void> {
  const freshLedger: ContextLedger = {
    session_id: sessionId,
    consultations: [],
    total_sources_checked: 0,
    total_excerpts_returned: 0,
  };

  await saveLedger(freshLedger);
}

export type { SourceCheck, Consultation, ContextLedger };
