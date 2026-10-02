"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ALL, filterByLens, lensesOf } from "@/lib/sources-filter";

export interface SourceRow {
  id: string;
  title: string;
  authors: string[];
  evidence: string;
  status: string;
  lens: string;
  verified: boolean;
  href: string | null;
}

export function SourcesTable({ rows }: { rows: SourceRow[] }) {
  const t = useTranslations("sources");
  const evidenceLabels = t.raw("evidence" as never) as Record<string, string>;
  const statusLabels = t.raw("status" as never) as Record<string, string>;
  const [lens, setLens] = useState(ALL);
  const selectId = useId();
  const shown = filterByLens(rows, lens);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={selectId} className="text-sm font-medium">
          {t("filterLabel")}
        </label>
        <select
          id={selectId}
          value={lens}
          onChange={(e) => setLens(e.target.value)}
          className="h-10 max-w-full rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value={ALL}>{t("filterAll")}</option>
          {lensesOf(rows).map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("count", { shown: shown.length, total: rows.length })}
        </p>
      </div>

      <table className="mt-4 w-full text-left text-sm max-md:block">
        <thead className="max-md:sr-only">
          <tr className="border-b border-border">
            <th scope="col" className="py-2 pr-3">{t("colTitle")}</th>
            <th scope="col" className="py-2 pr-3">{t("colAuthors")}</th>
            <th scope="col" className="py-2 pr-3">{t("colEvidence")}</th>
            <th scope="col" className="py-2 pr-3">{t("colStatus")}</th>
            <th scope="col" className="py-2">{t("colLink")}</th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {shown.map((s) => (
            <tr
              key={s.id}
              className="border-b border-border align-top max-md:mb-3 max-md:block max-md:rounded-lg max-md:border max-md:p-3"
            >
              <td className="py-2 pr-3 max-md:block max-md:py-1">
                <span className="font-medium">{s.title}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {s.id} · {s.lens}
                </span>
              </td>
              <td className="py-2 pr-3 max-md:block max-md:py-1">
                <span className="md:hidden font-medium">{t("colAuthors")}: </span>
                {s.authors.join("; ")}
              </td>
              <td className="py-2 pr-3 max-md:block max-md:py-1">
                <span className="md:hidden font-medium">{t("colEvidence")}: </span>
                {evidenceLabels[s.evidence] ?? s.evidence}
              </td>
              <td className="py-2 pr-3 max-md:block max-md:py-1">
                <span className="md:hidden font-medium">{t("colStatus")}: </span>
                {statusLabels[s.status] ?? s.status}
                {" · "}
                {s.verified ? t("verified") : t("unverified")}
              </td>
              <td className="py-2 max-md:block max-md:py-1">
                {s.href ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    {t("open")}
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  t("noLink")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
