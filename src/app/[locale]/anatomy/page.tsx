import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadAnatomy, t as text } from "@/lib/content";
import { GROUP_IDS, groupVar, type GroupId } from "@/lib/tokens";
import { routing } from "@/i18n/routing";

export default async function AnatomyPage({ params }: PageProps<"/[locale]/anatomy">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("anatomy");
  const anatomy = loadAnatomy();

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("soon")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {anatomy.groups.map((group) => {
          const color = GROUP_IDS.includes(group.id as GroupId) ? groupVar(group.id as GroupId) : undefined;
          return (
            <section
              key={group.id}
              className="rounded-lg border-2 p-4"
              style={{ borderColor: color }}
              aria-labelledby={`group-${group.id}`}
            >
              <h2 id={`group-${group.id}`} className="font-semibold" style={{ color }}>
                {text(group.name, locale)}
              </h2>
              <p className="text-sm text-muted-foreground">{text(group.question, locale)}</p>
              <ul className="mt-3 space-y-2">
                {anatomy.parts
                  .filter((p) => p.group === group.id)
                  .map((p) => (
                    <li key={p.id} className="text-sm">
                      <span className="font-medium">{text(p.name, locale)}</span>
                      <span className="text-muted-foreground"> ({t(p.level)})</span>
                      <br />
                      {text(p.oneLine, locale)}
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
