const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export function safeCsvValue(value: string) {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}
