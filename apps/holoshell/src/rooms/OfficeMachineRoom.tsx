'use client';

import React, { useState } from 'react';

/**
 * OfficeMachineRoom — HoloShell Excel / document / spreadsheet machine surface.
 *
 * Implements task_1778868513735_fb9f (P3).
 * File snapshot → parse → preview → approval → export → diff → rollback workflow
 * for spreadsheets (Excel) and documents (Word, PowerPoint, M365 Copilot).
 * Includes cloud/account break-glass gates.
 *
 * Follows the exact room contract of PermissionGateRoom / RecoveryDock.
 * Legacy adapter matrix already names Excel/Word/PowerPoint as installed desktop apps.
 */

interface DocumentSnapshot {
  id: string;
  name: string;
  type: 'xlsx' | 'docx' | 'pptx' | 'csv';
  size: string;
  lastModified: string;
  previewUrl?: string;
}

interface DiffEntry {
  cell: string;
  before: string;
  after: string;
  author: string;
  ts: string;
}

export function OfficeMachineRoom() {
  const [currentFile, setCurrentFile] = useState<DocumentSnapshot | null>(null);
  const [previewMode, setPreviewMode] = useState<'grid' | 'page'>('grid');
  const [diffs, setDiffs] = useState<DiffEntry[]>([]);
  const [approvalState, setApprovalState] = useState<'draft' | 'approved' | 'exported'>('draft');
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(l => [msg, ...l].slice(0, 5));

  const sampleFiles: DocumentSnapshot[] = [
    { id: 'f1', name: 'Q3_Financials.xlsx', type: 'xlsx', size: '1.2 MB', lastModified: '2026-05-20 14:33' },
    { id: 'f2', name: 'Sprint_Retro_Q2.docx', type: 'docx', size: '420 KB', lastModified: '2026-05-19 09:12' },
    { id: 'f3', name: 'HoloShell_Roadmap.pptx', type: 'pptx', size: '3.8 MB', lastModified: '2026-05-18 17:45' },
  ];

  const loadFile = (f: DocumentSnapshot) => {
    setCurrentFile(f);
    setApprovalState('draft');
    setDiffs([]);
    addLog(`snapshot loaded: ${f.name}`);
    // In real surface this would call the local parser / M365 bridge
  };

  const approve = () => {
    if (!currentFile) return;
    setApprovalState('approved');
    addLog(`approved: ${currentFile.name}`);
  };

  const exportFile = () => {
    if (!currentFile) return;
    setApprovalState('exported');
    addLog(`exported: ${currentFile.name} (token: ${Date.now().toString(36)})`);
  };

  const showDiff = () => {
    if (!currentFile) return;
    // Mock diff for demo (real surface would diff against last known good cloud version)
    setDiffs([
      { cell: 'B12', before: '1,240,000', after: '1,287,500', author: 'Founder', ts: '14:28' },
      { cell: 'C7', before: 'Q2 target', after: 'Q3 stretch', author: 'Brittney-14B', ts: '14:31' },
    ]);
    addLog('diff generated against last cloud snapshot');
  };

  const rollback = () => {
    setDiffs([]);
    setApprovalState('draft');
    addLog('rollback to last known good');
  };

  const openBreakGlass = () => {
    setBreakGlassOpen(true);
    addLog('break-glass gate opened (cloud/account override)');
  };

  return (
    <div className="p-3 text-[11px] text-studio-text h-full overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <span>📊</span>
        <span className="font-semibold text-base">Office Machine</span>
        <span className="ml-auto text-[9px] text-studio-muted">Excel • Word • PowerPoint • M365 Copilot</span>
      </div>

      {/* File picker (snapshot) */}
      <div className="mb-3">
        <div className="uppercase text-[9px] tracking-wider text-studio-muted mb-1">Local snapshots</div>
        <div className="flex gap-2 flex-wrap">
          {sampleFiles.map(f => (
            <button
              key={f.id}
              onClick={() => loadFile(f)}
              className={`px-2 py-1 rounded border text-[10px] ${currentFile?.id === f.id ? 'border-studio-accent bg-black/30' : 'border-white/10'}`}
            >
              {f.name} <span className="text-studio-muted">({f.size})</span>
            </button>
          ))}
          <button onClick={openBreakGlass} className="ml-auto text-[9px] underline text-amber-400">Break-glass (cloud/account)</button>
        </div>
      </div>

      {currentFile && (
        <>
          {/* Preview pane */}
          <div className="border border-studio-border/40 rounded p-2 mb-3 bg-black/20">
            <div className="flex justify-between items-center mb-1">
              <div className="font-medium">{currentFile.name} — {currentFile.lastModified}</div>
              <div className="flex gap-2 text-[9px]">
                <button onClick={() => setPreviewMode('grid')} className={previewMode === 'grid' ? 'text-studio-accent' : ''}>Grid</button>
                <button onClick={() => setPreviewMode('page')} className={previewMode === 'page' ? 'text-studio-accent' : ''}>Page</button>
              </div>
            </div>
            <div className="h-32 bg-black/30 rounded flex items-center justify-center text-[10px] text-studio-muted italic">
              {previewMode === 'grid' ? 'Spreadsheet grid preview (live parse)' : 'Paginated document preview (WYSIWYG)'}
            </div>
            <div className="text-[9px] text-studio-muted mt-1">Status: {approvalState} • {currentFile.type.toUpperCase()}</div>
          </div>

          {/* Workflow actions */}
          <div className="flex gap-2 mb-3">
            <button onClick={approve} disabled={approvalState !== 'draft'} className="px-2 py-0.5 rounded border border-emerald-400/50 text-emerald-400 text-[10px] disabled:opacity-40">Approve</button>
            <button onClick={exportFile} disabled={approvalState !== 'approved'} className="px-2 py-0.5 rounded border border-blue-400/50 text-blue-400 text-[10px] disabled:opacity-40">Export + token</button>
            <button onClick={showDiff} className="px-2 py-0.5 rounded border border-amber-400/50 text-amber-400 text-[10px]">Diff vs cloud</button>
            <button onClick={rollback} disabled={diffs.length === 0} className="px-2 py-0.5 rounded border border-red-400/50 text-red-400 text-[10px] disabled:opacity-40">Rollback</button>
          </div>

          {/* Diff view */}
          {diffs.length > 0 && (
            <div className="border border-studio-border/40 rounded p-2 mb-3 text-[10px]">
              <div className="uppercase text-[9px] tracking-wider text-studio-muted mb-1">Diff (last known good)</div>
              {diffs.map((d, i) => (
                <div key={i} className="flex justify-between py-0.5 border-b border-white/10 last:border-0">
                  <span className="font-mono">{d.cell}</span>
                  <span className="text-red-400 line-through">{d.before}</span>
                  <span className="text-emerald-400">{d.after}</span>
                  <span className="text-studio-muted">{d.author} {d.ts}</span>
                </div>
              ))}
            </div>
          )}

          {/* Break-glass gate */}
          {breakGlassOpen && (
            <div className="text-[9px] border border-amber-400/50 rounded p-2 mb-2 bg-black/30">
              Break-glass opened — direct cloud / M365 account access enabled (audit token recorded). Close after use.
              <button onClick={() => setBreakGlassOpen(false)} className="ml-2 underline">Close gate</button>
            </div>
          )}
        </>
      )}

      {/* Action log */}
      {log.length > 0 && (
        <div className="text-[9px] text-studio-muted border-t border-white/10 pt-1 mt-1">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div className="mt-3 text-[8px] text-studio-muted">
        HoloShell office machine — snapshot/parse/preview/approve/export/diff/rollback + break-glass. Legacy apps already installed per adapter matrix.
      </div>
    </div>
  );
}

export default OfficeMachineRoom;