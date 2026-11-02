export function tripSubFromInitialView(initialView, fallback = "day") {
  if (!initialView || typeof initialView !== "object") return fallback;
  return typeof initialView.sub === "string" && initialView.sub ? initialView.sub : fallback;
}
