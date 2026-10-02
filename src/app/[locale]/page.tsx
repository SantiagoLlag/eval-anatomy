import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const entries = [
    { href: "/anatomy", title: t("anatomyTitle"), text: t("anatomyText") },
    { href: "/catalog", title: t("catalogTitle"), text: t("catalogText") },
    { href: "/inspect", title: t("inspectTitle"), text: t("inspectText") },
  ] as const;

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg">{t("lead")}</p>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("body")}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {entries.map((e) => (
          <li key={e.href} className="rounded-lg border border-border p-4">
            <h2 className="font-semibold">
              <Link href={e.href} className="underline underline-offset-4">
                {e.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{e.text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
