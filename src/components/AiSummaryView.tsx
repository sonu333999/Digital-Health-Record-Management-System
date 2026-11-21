import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { StructuredAiSummary } from '../db/schema.ts';
import { AI_SUMMARY_DISCLAIMER } from '../shared/constants.ts';

interface AiSummaryViewProps {
  summary: StructuredAiSummary;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function AiSummaryView({
  summary,
  onRegenerate,
  regenerating = false,
}: AiSummaryViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-[#0F1E2E]">
            AI-Generated Clinical Information Summary
          </h3>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            AI-generated content · Model: {summary.modelUsed || 'gemini-4-hydrogen'} · Generated{' '}
            {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : 'recently'}
          </p>
        </div>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate Summary'}
          </button>
        )}
      </div>

      {/* Mandatory clinical disclaimer */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-950">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p>{summary.disclaimer || AI_SUMMARY_DISCLAIMER}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <SummaryListBlock title="Main Medical Observations" items={summary.mainObservations} />
        <SummaryListBlock
          title="Diagnosis (Explicitly Written Only)"
          items={summary.explicitDiagnosis}
          emptyFallback="No explicit diagnosis stated in source document."
        />
        <SummaryListBlock
          title="Medicines Mentioned"
          items={summary.medicinesMentioned}
          emptyFallback="No medicines mentioned in source text."
        />
        <SummaryListBlock
          title="Dates Mentioned"
          items={summary.dates}
          emptyFallback="No explicit dates recorded."
          mono
        />
        <SummaryListBlock
          title="Allergies"
          items={summary.allergies}
          emptyFallback="None stated in this document."
        />
        <SummaryListBlock
          title="Chronic Conditions"
          items={summary.chronicConditions}
          emptyFallback="None stated in this document."
        />
      </div>

      {/* Laboratory Values Table */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h4 className="text-sm font-semibold text-[#0F1E2E]">Important Laboratory & Vital Values</h4>
        {summary.laboratoryValues && summary.laboratoryValues.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Parameter / Test</th>
                  <th className="px-4 py-2.5">Recorded Value</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Reference Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {summary.laboratoryValues.map((row, idx) => (
                  <tr key={`${row.test}-${idx}`}>
                    <td className="px-4 py-2.5 font-medium">{row.test}</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{row.value}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.unit || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 tabular-nums">
                      {row.referenceRange || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No structured laboratory measurements extracted from source text.
          </p>
        )}
      </div>

      {/* Missing or Uncertain Info */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <SummaryListBlock
          title="Missing or Uncertain Information"
          items={summary.missingOrUncertainInfo}
          emptyFallback="No unreadable sections flagged."
        />
      </div>
    </div>
  );
}

function SummaryListBlock({
  title,
  items,
  emptyFallback = 'None recorded.',
  mono = false,
}: {
  title: string;
  items?: string[];
  emptyFallback?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-[#0F1E2E]">{title}</h4>
      {items && items.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {items.map((item, idx) => (
            <li
              key={`${title}-${idx}`}
              className={`leading-relaxed ${mono ? 'font-mono text-xs tabular-nums' : ''}`}
            >
              • {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-slate-500">{emptyFallback}</p>
      )}
    </div>
  );
}
