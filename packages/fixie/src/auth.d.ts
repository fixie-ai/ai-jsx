import { FixieClient } from './client.js';
/** Represents contents of the Fixie CLI config file. */
export interface FixieConfig {
    apiUrl?: string;
    apiKey?: string;
}
export declare const FIXIE_API_URL = "https://api.fixie.ai";
export declare const FIXIE_CONFIG_FILE = "~/.config/fixie/config.yaml";
/** Load the client configuration from the given file. */
export declare function loadConfig(configFile: string): FixieConfig;
/** Save the client configuration to the given file. */
export declare function saveConfig(config: FixieConfig, configFile: string): void;
/** Returns an authenticated FixieClient, or null if the user is not authenticated. */
export declare function Authenticate({ apiUrl, configFile, }: {
    apiUrl?: string;
    configFile?: string;
}): Promise<FixieClient | null>;
/** Returns an authenticated FixieClient, starting an OAuth flow to authenticate the user if necessary. */
export declare function AuthenticateOrLogIn({ apiUrl, configFile, forceReauth, }: {
    apiUrl?: string;
    configFile?: string;
    forceReauth?: boolean;
}): Promise<FixieClient>;
