"use client";

import { useEffect } from "react";

/** Liga o worker do MSW no navegador e avisa quando estiver pronto. Carregado só no cliente. */
export default function MockWorker({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    import("./browser").then(({ startWorker }) => startWorker()).then(onReady);
  }, [onReady]);
  return null;
}
