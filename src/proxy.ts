import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Redirects unprefixed paths to /es or /en using the NEXT_LOCALE cookie, then Accept-Language, then "es".
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
