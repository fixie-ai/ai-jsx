import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import os from 'os';
import path from 'path';
import untildify from 'untildify';
import axios from 'axios';
import open from 'open';
import http from 'http';
import crypto from 'crypto';
import readline from 'readline';
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
export function LoadConfig(configFile: string = FIXIE_CONFIG_FILE): FixieConfig {
  const fullPath = untildify(configFile);
  const config: object = yaml.load(fs.readFileSync(fullPath, 'utf8')) as object;
  // Warn if any fields are present in config that are not supported.
  const validKeys = ['apiUrl', 'apiKey'];
  const invalidKeys = Object.keys(config).filter((key) => !validKeys.includes(key));
  for (const key of invalidKeys) {
    term('❓ Ignoring invalid key ').yellow(key)(` in ${fullPath}\n`);
  }
  return config as FixieConfig;
}

/** Save the client configuration to the given file. */
export function SaveConfig(config: FixieConfig, configFile: string = FIXIE_CONFIG_FILE) {
  const fullPath = untildify(configFile);
  const currentConfig = yaml.load(fs.readFileSync(fullPath, 'utf8')) as object;
  // Merge the new config with the existing config, so we don't
  // overwrite any fields that are not specified.
  const mergedConfig = { ...currentConfig, ...config };
  fs.writeFileSync(fullPath, yaml.dump(mergedConfig));
}

/** Returns an authenticated FixieClient, or null if the user is not authenticated. */
export async function Authenticate({
  apiUrl,
  configFile,
}: {
  apiUrl?: string;
  configFile?: string;
}): Promise<FixieClient | null> {
  const config = LoadConfig(configFile ?? FIXIE_CONFIG_FILE);
  const client = FixieClient.Create(apiUrl ?? config.apiUrl ?? FIXIE_API_URL, config.apiKey);
  const userInfo = await client.userInfo();
  if (userInfo.is_anonymous) {
    return null;
  }
  return client;
}

export async function AuthenticateOrLogin({
  apiUrl,
  configFile,
  forceReauth,
}: { apiUrl?: string; configFile?: string; forceReauth?: boolean } = {}): Promise<FixieClient> {
  if (!forceReauth) {
    const client = await Authenticate({
      apiUrl,
      configFile,
    });
    if (client) {
      const userInfo = await client.userInfo();
      if (!userInfo.is_anonymous) {
        return client;
      }
    }
  }

  const apiKey = await oauthFlow(apiUrl ?? FIXIE_API_URL);
  const config: FixieConfig = {
    apiUrl: apiUrl ?? FIXIE_API_URL,
    apiKey,
  };
  SaveConfig(config, configFile);
  const client = await Authenticate({ apiUrl, configFile });
  if (!client) {
    throw new Error('Failed to authenticate');
  }
  const userInfo = await client.userInfo();
  if (!userInfo.is_anonymous) {
    throw new Error('Failed to authenticate');
  }
  return client;
}

const CLIENT_ID = 'II4FM6ToxVwSKB6DW1r114AKAuSnuZEgYehEBB-5WQA';
const SCOPES = ['api-access'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Runs an interactive authorization flow with the user, returning a Fixie API key
 * if successful.
 */
async function oauthFlow(apiUrl: string): Promise<string> {
  const port = await findFreePort();
  console.log(`Listening on local port ${port}`);
  const redirectUri = `http://localhost:${port}`;
  const state = crypto.randomBytes(16).toString('base64');
  const url = `${apiUrl}/authorize?client_id=${CLIENT_ID}&scope=${SCOPES.join(
    ' '
  )}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  const serverPromise = new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        console.log('Received request', req.url);
        if (req.url) {
          const searchParams = new URL(req.url, `http://localhost:${port}`).searchParams;
          const code = searchParams.get('code');
          const receivedState = searchParams.get('state');

          if (code && receivedState === state) {
            try {
              const response = await axios.post(`${apiUrl}/access/token`, {
                code,
                redirect_uri: redirectUri,
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
              });
              console.log('Received response', response.data);

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
  console.log(`Your browser has been opened to visit:\n\n    ${url}`);
  return serverPromise as Promise<string>;
}

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
