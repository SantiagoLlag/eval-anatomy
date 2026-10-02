import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-4">
        <Link href="/" className="underline underline-offset-4">
          {t("back")}
        </Link>
      </p>
    </>
  );
}
