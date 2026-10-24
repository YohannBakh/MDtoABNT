"use client";

/* Alternador de tema claro/escuro (slider sol/lua).
   Usa useSyncExternalStore: o <html> é a fonte da verdade (o script inline no
   layout aplica o tema salvo antes da pintura), então não há estado nem efeito. */

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "md2abnt-theme";
const CHANGE_EVENT = "md2abnt-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    /* localStorage indisponível — ignora */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex items-center gap-1.5" title={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}>
      <Sun className={`h-4 w-4 transition-colors ${dark ? "text-neutral-500" : "text-amber-500"}`} />
      <Switch
        checked={dark}
        onCheckedChange={setTheme}
        aria-label="Alternar tema claro e escuro"
        className="data-[state=checked]:bg-teal-700 data-[state=unchecked]:bg-neutral-300"
      />
      <Moon className={`h-4 w-4 transition-colors ${dark ? "text-teal-300" : "text-neutral-400"}`} />
    </div>
  );
}
