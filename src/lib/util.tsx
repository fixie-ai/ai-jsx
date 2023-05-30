export function ensureProcessEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Please specify env var "${name}".`);
  }
  return value;
}
