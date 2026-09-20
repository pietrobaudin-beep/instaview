"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * O sinal de "estou aqui", mandado a cada 30 segundos.
 *
 * Fica no layout, então vale para o site inteiro. Para de mandar quando a aba
 * sai da frente — ninguém está usando uma aba escondida, e cada sinal é uma
 * escrita no banco.
 */
const INTERVALO = 30_000;

export function Pulse() {
  const path = usePathname();

  React.useEffect(() => {
    let vivo = true;

    const bater = () => {
      if (!vivo || document.visibilityState !== "visible") return;
      fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => {});
    };

    bater();
    const id = window.setInterval(bater, INTERVALO);
    document.addEventListener("visibilitychange", bater);
    return () => {
      vivo = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", bater);
    };
  }, [path]);

  return null;
}
