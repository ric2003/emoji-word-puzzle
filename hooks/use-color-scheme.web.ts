import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [initial, setInitial] = useState<"light" | "dark">(
    typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  // Update initial if system preference changes before RN hook hydrates
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setInitial(e.matches ? "dark" : "light");
    // modern browsers
    mq.addEventListener?.("change", handler);
    // safari fallback
    // @ts-ignore
    mq.addListener?.(handler);
    return () => {
      mq.removeEventListener?.("change", handler);
      // @ts-ignore
      mq.removeListener?.(handler);
    };
  }, []);

  const rnScheme = useRNColorScheme();
  return (rnScheme ?? initial) as "light" | "dark";
}
