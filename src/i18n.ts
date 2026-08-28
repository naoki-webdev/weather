import YAML from "yaml";
import jaRaw from "./locales/ja.yml?raw";

type Primitive = string | number;
type Vars = Record<string, Primitive>;
type Dictionary = Record<string, unknown>;

const parsed = YAML.parse(jaRaw) as { ja?: Dictionary };
const messages = parsed.ja ?? {};

function getValue(path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Dictionary)) {
      return (acc as Dictionary)[key];
    }
    return undefined;
  }, messages);
}

export function t(path: string, vars?: Vars): string {
  const value = getValue(path);
  if (typeof value !== "string") return path;

  if (!vars) return value;

  return Object.entries(vars).reduce((text, [key, rawValue]) => {
    const needle = new RegExp(`%\\{${key}\\}`, "g");
    return text.replace(needle, String(rawValue));
  }, value);
}
