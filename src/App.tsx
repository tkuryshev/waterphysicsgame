import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDocument, withLoad, type Screen } from "./game/launch";

type ViewSpec = { kind: "menu"; screen: Screen } | { kind: "game"; hash: string };
type View = ViewSpec & { key: number };

type GameMessage = {
  plotina: true;
  type: "ready" | "error" | "restart" | "nav" | "start" | "screen";
  hash?: string;
  load?: string;
  screen?: string;
  message?: string;
};

const SCREENS: Screen[] = ["title", "campaign", "sandbox", "unlimited", "creative"];
const SLOW_MS = 25000;

export default function App() {
  const [view, setView] = useState<View>({ kind: "menu", screen: "title", key: 1 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorText, setErrorText] = useState("");
  const [slow, setSlow] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const lastScreen = useRef<Screen>("title");

  const doc = useMemo(
    () =>
      view.kind === "game"
        ? buildDocument({ boot: view.hash })
        : buildDocument({ menu: view.screen }),
    // документ зависит только от key — смена экрана внутри меню не должна пересоздавать iframe
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key],
  );

  const go = useCallback((next: ViewSpec) => {
    setStatus("loading");
    setSlow(false);
    setErrorText("");
    setView((v) => ({ ...next, key: v.key + 1 }));
  }, []);

  // сообщения от игры / меню
  useEffect(() => {
    const onMessage = (e: MessageEvent<GameMessage>) => {
      const m = e.data;
      if (!m || m.plotina !== true) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const cur = viewRef.current;
      switch (m.type) {
        case "ready":
          setStatus("ready");
          frameRef.current?.contentWindow?.focus();
          break;
        case "screen":
          if (cur.kind === "menu") {
            if (SCREENS.includes(m.screen as Screen)) lastScreen.current = m.screen as Screen;
            setStatus("ready");
          }
          break;
        case "start":
          if (m.hash) go({ kind: "game", hash: m.hash });
          break;
        case "restart":
          if (cur.kind === "game") go({ kind: "game", hash: withLoad(cur.hash, m.load || "new") });
          break;
        case "nav": {
          const s = SCREENS.includes(m.screen as Screen) ? (m.screen as Screen) : "title";
          lastScreen.current = s;
          go({ kind: "menu", screen: s });
          break;
        }
        case "error":
          setErrorText(m.message || "неизвестная ошибка");
          setStatus("error");
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [go]);

  // «долго грузится» — подсказка вместо вечного чёрного экрана
  useEffect(() => {
    if (status !== "loading") return;
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, [status, view.key]);

  // освобождаем WebGL/звук старого iframe сразу, а не по сборке мусора
  useEffect(() => {
    const el = frameRef.current;
    return () => {
      try {
        if (el) el.srcdoc = "";
      } catch {
        /* noop */
      }
    };
  }, [view.key]);

  const retry = () => go(view.kind === "game" ? { kind: "game", hash: view.hash } : { kind: "menu", screen: view.screen });
  const toMenu = () => go({ kind: "menu", screen: lastScreen.current });

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#08141c]">
      <iframe
        key={view.key}
        ref={frameRef}
        title="Плотина"
        srcDoc={doc}
        allow="fullscreen; autoplay"
        onLoad={() => {
          if (viewRef.current.kind === "menu") setStatus((s) => (s === "loading" ? "ready" : s));
          frameRef.current?.contentWindow?.focus();
        }}
        className="absolute inset-0 h-full w-full border-0"
      />

      {status !== "ready" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(ellipse_at_top,#17435a_0%,#08141c_70%)] px-6 text-center text-slate-100">
          {status === "loading" ? (
            <>
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300" />
              <div className="text-2xl font-bold tracking-[0.3em] text-cyan-100">ПЛОТИНА</div>
              <div className="text-sm text-slate-300/80">
                {view.kind === "game" ? "Формируем долину и запускаем реку…" : "Загрузка меню…"}
              </div>
              {slow && (
                <div className="max-w-sm space-y-3 text-sm text-slate-300/80">
                  <p>Загрузка идёт дольше обычного — карта большая или видеокарта занята.</p>
                  <div className="flex justify-center gap-2">
                    <button onClick={retry} className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 hover:bg-cyan-300">
                      Перезапустить
                    </button>
                    <button onClick={toMenu} className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10">
                      В меню
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-5xl">🌊</div>
              <div className="text-xl font-semibold">Не удалось запустить игру</div>
              <p className="max-w-md text-sm text-slate-300/80">
                {errorText || "Возможно, в браузере отключён WebGL или закончилась память видеокарты."}
              </p>
              <div className="flex gap-2">
                <button onClick={retry} className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 hover:bg-cyan-300">
                  Повторить
                </button>
                <button onClick={toMenu} className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10">
                  В меню
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
