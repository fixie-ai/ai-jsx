import untruncateJson from 'untruncate-json';
import { AIJSXError } from '../core/errors.js';

/** @hidden */
export function getEnvVar(name: string, shouldThrow: boolean = true) {
  const reactAppName = `REACT_APP_${name}`;

  // In some JS build environments, `process` is not defined. I'm not sure
  // how to update our types to reflect that.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  let env = globalThis.process?.env ?? undefined;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (env === undefined) {
    // Webpack for Create React App requires `process.env`, but in other environments
    // process might not be defined, so we need to try/catch it.
    try {
      env = process.env;
    } catch {
      // Do nothing, leave it undefined.
    }
  }

  // We actually want the nullish coalescing behavior in this case,
  // because we want to treat '' as undefined.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition
  const result = env?.[name] || env?.[reactAppName];
  if (result === undefined && shouldThrow) {
    throw new AIJSXError(`Please specify env var '${name}' or '${reactAppName}'.`, 1000, 'user', {
      checkedNames: [name, reactAppName],
    });
  }
  return result;
}

/**
 * There's an ESM issue with untruncate-json, so we need to do this to support running on both client & server.
 */
/** @hidden */
const _patchedUntruncateJson = 'default' in untruncateJson ? untruncateJson.default : untruncateJson;

export function patchedUntruncateJson(str: string) {
  // Remove partial unicode characters: e.g. "\\u5728\\u5fA" -> "\\u5728"
  return _patchedUntruncateJson(str.replace(/\\u[\dA-F]{0,3}$/gi, ''));
}
