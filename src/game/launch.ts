// Запуск движка игры внутри изолированного <iframe>.
// Каждый запуск = чистый документ: никаких перезагрузок страницы, глобальных
// «защёлок» и висящих слушателей. Закрыли iframe — всё (WebGL, звук, таймеры) освободилось.
import engineSrc from "./engine.js?raw";
import gameCss from "./game.css?raw";

let engineUrl: string | null = null;

function getEngineUrl(): string {
  if (!engineUrl) {
    engineUrl = URL.createObjectURL(new Blob([engineSrc], { type: "text/javascript" }));
  }
  return engineUrl;
}

export type Screen = "title" | "campaign" | "sandbox" | "unlimited" | "creative";

export interface LaunchOptions {
  /** строка параметров игры, например `mode=creative&map=valley&s=1` */
  boot?: string;
  /** какой экран меню показать, если boot пуст */
  menu?: Screen;
}

export function buildDocument({ boot = "", menu = "title" }: LaunchOptions): string {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${gameCss}</style></head>
<body><div id="root"></div>
<script>window.__PLOTINA_BOOT__=${JSON.stringify(boot)};window.__PLOTINA_MENU__=${JSON.stringify(menu)};</script>
<script type="module" src="${getEngineUrl()}"></script>
</body></html>`;
}

export function withLoad(hash: string, load: string): string {
  const parts = hash.split("&").filter((p) => p && !p.startsWith("load="));
  parts.push(`load=${load}`);
  return parts.join("&");
}
