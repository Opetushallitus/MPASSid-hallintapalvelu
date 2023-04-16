import { useEffect } from "react";

export default function useDocumentLang(lang: string) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}
