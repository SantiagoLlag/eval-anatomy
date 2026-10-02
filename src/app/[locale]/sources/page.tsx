import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { firstUrl, loadSources } from "@/lib/content";
import { SourcesTable, type SourceRow } from "@/components/sources-table";

export default async function SourcesPage({ params }: PageProps<"/[locale]/sources">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("sources");

  const rows: SourceRow[] = Object.values(loadSources().sources)
    .map((s) => ({
      id: s.id,
      title: s.title,
      authors: s.authors,
      evidence: s.evidence,
      status: s.status,
      lens: s.lens,
      verified: s.verified,
      href: firstUrl(s),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("lead")}</p>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("note")}</p>
      <SourcesTable rows={rows} />
    </>
  );
}
