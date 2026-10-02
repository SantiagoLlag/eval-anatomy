import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-border">
      <p className="mx-auto max-w-5xl px-4 py-4 text-sm text-muted-foreground">
        {t("code")} {t("content")}
      </p>
    </footer>
  );
}
