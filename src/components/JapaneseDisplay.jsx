import { createContext, useContext } from "react";
import { jpSub } from "../lib/japaneseText.js";

export const JapaneseDisplayContext = createContext({ showRomaji: true, setShowRomaji: () => {} });
export const useJapaneseDisplay = () => useContext(JapaneseDisplayContext);

/** Reading help only; names such as Tokyo and sushi remain ordinary content. */
export function Romaji({ children, as: Tag = "div", ...props }) {
  const { showRomaji } = useJapaneseDisplay();
  return showRomaji && children ? <Tag lang="ja-Latn" data-romaji {...props}>{children}</Tag> : null;
}

export function JapaneseSubtitle({ entry, script, jpField = "jp", ...props }) {
  const value = jpSub(entry, script, jpField);
  return script === "romaji"
    ? value && <div lang="ja" {...props}>{value}</div>
    : <Romaji {...props}>{value}</Romaji>;
}
