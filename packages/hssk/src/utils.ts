export function assertEnvVar(name: string): string {
  if (process.env[name] === undefined) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return process.env[name]!
}
