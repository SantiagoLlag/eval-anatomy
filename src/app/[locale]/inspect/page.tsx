import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export default async function InspectPage({ params }: PageProps<"/[locale]/inspect">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("inspect");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("soon")}</p>
    </>
  );
}
