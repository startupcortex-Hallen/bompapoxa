import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduzido, setReduzido] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ouvir = () => setReduzido(media.matches);
    ouvir();
    media.addEventListener?.("change", ouvir);
    return () => media.removeEventListener?.("change", ouvir);
  }, []);

  return reduzido;
}
