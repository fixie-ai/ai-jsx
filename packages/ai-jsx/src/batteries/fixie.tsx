import { createContext } from '../core/render.js';
import { getEnvVar } from '../lib/util.js';

export interface FixieAPIConfiguration {
  url: string;
  authToken?: string;
}

export const DEFAULT_API_CONFIGURATION: FixieAPIConfiguration = {
  url: getEnvVar('FIXIE_API_URL', false) ?? 'https://api.fixie.ai',
  authToken: getEnvVar('FIXIE_API_KEY', false),
};

export const FixieAPIContext = createContext<FixieAPIConfiguration>(DEFAULT_API_CONFIGURATION);
