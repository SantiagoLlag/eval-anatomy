import type messages from "../messages/es.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "es" | "en";
    Messages: typeof messages;
  }
}
