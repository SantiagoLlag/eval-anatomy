import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export const GITHUB_URL = "https://github.com/SantiagoLlag/eval-anatomy";

const NAV = [
  { href: "/anatomy", key: "anatomy" },
  { href: "/catalog", key: "catalog" },
  { href: "/inspect", key: "inspect" },
  { href: "/sources", key: "sources" },
] as const;

export function Header() {
  const t = useTranslations();
  return (
    <header className="border-b border-border">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        {t("header.skip")}
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-mono text-lg font-semibold">
          eval-anatomy
        </Link>
        <nav aria-label={t("nav.label")} className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map(({ href, key }) => (
              <li key={key}>
                <Link href={href} className="inline-block py-2 underline-offset-4 hover:underline">
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <a
            href={GITHUB_URL}
            aria-label={t("header.github")}
            title={t("header.github")}
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-5 fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
