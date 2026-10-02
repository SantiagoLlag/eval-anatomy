import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { loadCatalog } from "@/lib/catalog";

export default async function CatalogPage({ params }: PageProps<"/[locale]/catalog">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const entries = loadCatalog();

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("lead")}</p>
      {entries.length === 0 ? (
        <p className="mt-8">{t("empty")}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {entries.map(({ card }) => (
            <li key={card.id} className="rounded-lg border border-border p-4">
              <h2 className="font-semibold">
                <Link href={`/catalog/${card.id}`} className="underline underline-offset-4">
                  {card.name}
                </Link>
              </h2>
              <p lang={card.language} className="mt-2 text-sm text-muted-foreground">
                {card.summary}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {card.id} · {t("version")} {card.version} · {t("status")}: {card.status ?? "draft"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
