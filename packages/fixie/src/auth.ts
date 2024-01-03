import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import path from 'path';
import untildify from 'untildify';
import axios from 'axios';
import open from 'open';
import http from 'http';
import crypto from 'crypto';
import net from 'net';

const { terminal: term } = terminal;

import { FixieClient } from './client.js';

/** Represents contents of the Fixie CLI config file. */
export interface FixieConfig {
  apiUrl?: string;
  apiKey?: string;
}

export const FIXIE_API_URL = 'https://api.fixie.ai';
export const FIXIE_CONFIG_FILE = '~/.config/fixie/config.yaml';

/** Load the client configuration from the given file. */
export function loadConfig(configFile: string): FixieConfig {
  const fullPath = untildify(configFile);
  if (!fs.existsSync(fullPath)) {
    return {};
  }
  const config = yaml.load(fs.readFileSync(fullPath, 'utf8')) as object;
  // Warn if any fields are present in config that are not supported.
  const validKeys = ['apiUrl', 'apiKey'];
  const invalidKeys = Object.keys(config).filter((key) => !validKeys.includes(key));
  for (const key of invalidKeys) {
    term('❓ Ignoring invalid key ').yellow(key)(` in ${fullPath}\n`);
  }
  return config as FixieConfig;
}

/** Save the client configuration to the given file. */
export function saveConfig(config: FixieConfig, configFile: string) {
  const fullPath = untildify(configFile);
  const dirName = path.dirname(fullPath);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }
  if (fs.existsSync(fullPath)) {
    // Merge the new config with the existing config, so we don't
    // overwrite any fields that are not specified.
    const currentConfig = yaml.load(fs.readFileSync(fullPath, 'utf8')) as object;
    const mergedConfig = { ...currentConfig, ...config };
    fs.writeFileSync(fullPath, yaml.dump(mergedConfig));
  } else {
    fs.writeFileSync(fullPath, yaml.dump(config));
  }
}

/** Returns an authenticated FixieClient, or null if the user is not authenticated. */
export async function Authenticate({
  apiUrl,
  configFile,
}: {
  apiUrl?: string;
  configFile?: string;
}): Promise<FixieClient | null> {
  // The precedence for selecting the API URL and key is:
  //   1. apiUrl argument to this function. (The key cannot be passed as an argument.)
  //   2. FIXIE_API_URL and FIXIE_API_KEY environment variables.
  //   3. apiUrl and apiKey fields in the config file.
  //   4. Fallback value for apiUrl (constant defined above).
  const config = loadConfig(configFile ?? FIXIE_CONFIG_FILE);
  const useApiUrl = apiUrl ?? process.env.FIXIE_API_URL ?? config.apiUrl ?? FIXIE_API_URL;
  const useApiKey = process.env.FIXIE_API_KEY ?? config.apiKey;
  if (!useApiKey) {
    // No key available. Need to punt.
    return null;
  }
  try {
    const client = new FixieClient({ apiKey: useApiKey, url: useApiUrl });
    await client.userInfo();
    return client;
  } catch (error: any) {
    // If the client is not authenticated, we will get a 401 error.
    return null;
  }
}

/** Returns an authenticated FixieClient, starting an OAuth flow to authenticate the user if necessary. */
export async function AuthenticateOrLogIn({
  apiUrl,
  configFile,
  forceReauth,
}: {
  apiUrl?: string;
  configFile?: string;
  forceReauth?: boolean;
}): Promise<FixieClient> {
  if (!forceReauth) {
    const client = await Authenticate({
      apiUrl,
      configFile,
    });
    if (client) {
      try {
        await client.userInfo();
        return client;
      } catch (error: any) {
        // If the client is not authenticated, we will get a 401 error.
      }
    }
  }

  const apiKey = await oauthFlow(apiUrl ?? FIXIE_API_URL);
  const config: FixieConfig = {
    apiUrl: apiUrl ?? FIXIE_API_URL,
    apiKey,
  };
  saveConfig(config, configFile ?? FIXIE_CONFIG_FILE);
  const client = await Authenticate({ apiUrl, configFile: configFile ?? FIXIE_CONFIG_FILE });
  if (!client) {
    throw new Error('Failed to authenticate - please try logging in at https://console.fixie.ai on the web.');
  }
  const userInfo = await client.userInfo();
  term('🎉 Successfully logged into ')
    .green(apiUrl ?? FIXIE_API_URL)(' as ')
    .green(userInfo.email)('\n');
  return client;
}

// The Fixie CLI client ID.
const CLIENT_ID = 'II4FM6ToxVwSKB6DW1r114AKAuSnuZEgYehEBB-5WQA';
// The scopes requested by the OAUth flow.
const SCOPES = ['api-access'];

/**
 * Runs an interactive authorization flow with the user, returning a Fixie API key
 * if successful.
 */
async function oauthFlow(apiUrl: string): Promise<string> {
  const port = await findFreePort();
  const redirectUri = `http://localhost:${port}`;
  const state = crypto.randomBytes(16).toString('base64url');
  const url = `${apiUrl}/authorize?client_id=${CLIENT_ID}&scope=${SCOPES.join(
    ' '
  )}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  const serverPromise = new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        if (req.url) {
          const searchParams = new URL(req.url, `http://localhost:${port}`).searchParams;
          const code = searchParams.get('code');
          const receivedState = searchParams.get('state');
          if (code && receivedState === state) {
            try {
              const bodyFormData = new FormData();
              bodyFormData.append('code', code);
              bodyFormData.append('redirect_uri', redirectUri);
              bodyFormData.append('client_id', CLIENT_ID);
              bodyFormData.append('grant_type', 'authorization_code');
              const response = await axios.post(`${apiUrl}/access/token`, bodyFormData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });
              const accessToken = response.data.access_token;
              if (typeof accessToken === 'string') {
                res.writeHead(200);
                res.end('You can close this tab now.');
                resolve(accessToken);
              } else {
                res.writeHead(200);
                const errMsg = `Error: Invalid access token type ${typeof accessToken}`;
                res.end(errMsg);
                reject(new Error(errMsg));
              }
            } catch (error: any) {
              res.writeHead(200);
              const errMsg = error.response?.data?.error_description ?? error.message;
              res.end(errMsg);
              reject(error);
            }
          }
          server.close();
        }
      })
      .listen(port);
  });

  await open(url);
  term('🔑 Your browser has been opened to visit:\n\n   ').blue.underline(url)('\n\n');
  return serverPromise as Promise<string>;
}

/** Return a free port on the local machine. */
function findFreePort(): Promise<number> {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const address = srv.address();
      if (address && typeof address === 'object') {
        srv.close((_) => res(address.port));
      } else {
        throw new Error('Failed to find free port');
      }
    });
  });
}
