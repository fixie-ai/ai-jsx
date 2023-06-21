/** @hidden */
export function getEnvVar(name: string, shouldThrow: boolean = true) {
  return getEnvVarByName(name, shouldThrow) || getEnvVarByName(`REACT_APP_${name}`, shouldThrow);
}

function getEnvVarByName(name: string, shouldThrow: boolean) {
  const value = process.env[name];
  if (!value && shouldThrow) {
    throw new Error(`Please specify env var "${name}".`);
  }
  return value;
}
