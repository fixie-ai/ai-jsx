import { AIJSXError } from '../core/errors.js';

/** @hidden */
export function getEnvVar(name: string, shouldThrow: boolean = true) {
  const reactAppName = `REACT_APP_${name}`;
  // We actually want the nullish coalescing behavior in this case,
  // because we want to treat '' as undefined.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const result = process.env[name] || process.env[reactAppName];
  if (result === undefined && shouldThrow) {
    throw new AIJSXError(`Please specify env var '${name}' or '${reactAppName}'.`, 1000, 'user', {
      checkedNames: [name, reactAppName],
    });
  }
  return result;
}
