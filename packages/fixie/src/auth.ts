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

const { terminal: term } = terminal;

import { FixieClient } from './client.js';

/** Represents contents of the Fixie CLI config file. */
export interface FixieConfig {
  apiUrl?: string;
  apiKey?: string;
}

const FIXIE_CONFIG_FILE = '~/.config/fixie/config.yaml';

/** Load the client configuration from the given file. */
export function LoadConfig(configFile: string = FIXIE_CONFIG_FILE): FixieConfig {
  const fullPath = untildify(configFile);
  const config: object = yaml.load(fs.readFileSync(fullPath, 'utf8')) as object;

  // Warn if any fields are present in config that are not supported.
  const validKeys = ['api_url', 'api_key', 'apiUrl', 'apiKey'];
  const invalidKeys = Object.keys(config).filter((key) => !validKeys.includes(key));
  for (const key of invalidKeys) {
    term('❓ Ignoring invalid key ').yellow(key)(' in ${fullPath}\n');
    // Remove invalid key from config object.
    delete config[key as keyof object];
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

/** Returns true if the config file contains working auth credentials. */
export async function ConfigAuthenticated(configFile: string = FIXIE_CONFIG_FILE): Promise<boolean> {
  const config = LoadConfig(configFile);
  if (!config.apiKey) {
    return false;
  }
  const client = FixieClient.Create(config.apiUrl, config.apiKey);
  return !(await client.userInfo()).is_anonymous;
}

const FIXIE_API_URL = 'your_fixie_api_url_here';
const CLIENT_ID = 'II4FM6ToxVwSKB6DW1r114AKAuSnuZEgYehEBB-5WQA';
const SCOPES = ['api-access'];
const AUTHORIZE_SERVICE = `${FIXIE_API_URL}/authorize`;
const TOKEN_SERVICE = `${FIXIE_API_URL}/access/token`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Runs an interactive authorization flow with the user, returning a Fixie API key
 * if successful.
 */
async function oauthFlow(): Promise<string> {
  const port = findFreePort();
  const redirectUri = `http://localhost:${port}`;
  const state = crypto.randomBytes(16).toString('base64');
  const url = `${AUTHORIZE_SERVICE}?client_id=${CLIENT_ID}&scope=${SCOPES.join(
    ' '
  )}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  const success = await open(url);

  if (success) {
    console.log(`Your browser has been opened to visit:\n\n    ${url}`);
  } else {
    console.log(`Open this link on your browser to continue:\n\n    ${url}`);
  }

  return new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        if (req.url) {
          const searchParams = new URL(req.url, `http://localhost:${port}`).searchParams;
          const code = searchParams.get('code');
          const receivedState = searchParams.get('state');

          if (code && receivedState === state) {
            try {
              const response = await axios.post(TOKEN_SERVICE, {
                code,
                redirect_uri: redirectUri,
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
              });

              const accessToken = response.data.access_token;
              if (typeof accessToken === 'string') {
                resolve(accessToken);
              } else {
                reject(new Error(`Invalid access token type ${typeof accessToken}`));
              }
            } catch (error) {
              reject(error);
            }
          }

          res.writeHead(200);
          res.end('You can close this tab now.');
          server.close();
        }
      })
      .listen(port);
  });
}

function findFreePort(): number {
  const server = http.createServer();
  server.listen(0);
  const address = server.address();
  if (address && typeof address === 'object') {
    return address.port;
  } else {
    throw new Error('Could not find a free port');
  }
}

// Use the OAuth flow
oauthFlow()
  .then((accessToken) => {
    console.log(`Successfully obtained access token: ${accessToken}`);
    rl.close();
  })
  .catch((error) => {
    console.error(`Failed to obtain access token: ${error}`);
    rl.close();
  });
