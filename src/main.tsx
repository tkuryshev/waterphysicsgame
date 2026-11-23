import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Без StrictMode: игра живёт в отдельном iframe со своим жизненным циклом,
// двойной монтаж эффектов в dev-режиме только мешал бы его создавать/закрывать.
createRoot(document.getElementById("root")!).render(<App />);
