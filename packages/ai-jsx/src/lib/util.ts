/** @hidden */
export function ensureProcessEnvVar(name: string, shouldThrow: boolean = true): string {
  return getEnvVar(name, shouldThrow) || getEnvVar(`REACT_APP_${name}`, shouldThrow);
}

export function getEnvVar(name: string, shouldThrow: boolean) {
  const value = process.env[name] ?? '';
  if (!value && shouldThrow) {
    throw new Error(`Please specify env var "${name}".`);
  }
  return value;
}
