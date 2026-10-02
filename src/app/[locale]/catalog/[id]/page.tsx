import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { catalogDirs, loadCatalog } from "@/lib/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => catalogDirs().map((id) => ({ locale, id })));
}

export default async function CatalogEntryPage({ params }: PageProps<"/[locale]/catalog/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const entry = loadCatalog().find((e) => e.dir === id);
  if (!entry) notFound();
  const t = await getTranslations("catalog");
  const { card } = entry;

  return (
    <>
      <p className="text-sm">
        <Link href="/catalog" className="underline underline-offset-4">
          {t("back")}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold">{card.name}</h1>
      <p lang={card.language} className="mt-4 max-w-2xl text-lg">
        {card.summary}
      </p>
      <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">ID</dt>
        <dd>{card.id}</dd>
        <dt className="text-muted-foreground">{t("version")}</dt>
        <dd>{card.version}</dd>
        <dt className="text-muted-foreground">{t("status")}</dt>
        <dd>{card.status ?? "draft"}</dd>
        <dt className="text-muted-foreground">{t("language")}</dt>
        <dd>{card.language}</dd>
      </dl>
      <p className="mt-8 text-muted-foreground">{t("soon")}</p>
    </>
  );
}
