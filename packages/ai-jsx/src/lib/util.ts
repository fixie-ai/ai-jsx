/** @hidden */
export function getEnvVar(name: string, shouldThrow: boolean = true) {
  // We actually want the nullish coalescing behavior in this case,
  // because we want to treat '' as undefined.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return getEnvVarByName(name, shouldThrow) || getEnvVarByName(`REACT_APP_${name}`, shouldThrow);
}

function getEnvVarByName(name: string, shouldThrow: boolean) {
  const value = process.env[name];
  if (!value && shouldThrow) {
    throw new Error(`Please specify env var "${name}".`);
  }
  return value;
}
