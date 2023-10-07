import { FixieClient } from './client.js';
/** Represents metadata about an agent managed by the Fixie service. */
export interface AgentMetadata {
    agentId: string;
    handle: string;
    name?: string;
    description?: string;
    moreInfoUrl?: string;
    published?: boolean;
    created: Date;
    modified: Date;
    owner: string;
    currentRevision?: AgentRevision;
    allRevisions?: AgentRevision[];
}
/** Represents the contents of an agent.yaml configuration file. */
export interface AgentConfig {
    handle: string;
    name?: string;
    description?: string;
    moreInfoUrl?: string;
    deploymentUrl?: string;
}
/** Represents metadata about an agent revision. */
export interface AgentRevision {
    id: string;
    created: Date;
}
/**
 * This class provides an interface to the Fixie Agent API.
 */
export declare class FixieAgent {
    readonly client: FixieClient;
    readonly agentId: string;
    metadata: AgentMetadata;
    owner: string;
    handle: string;
    /** Use GetAgent or CreateAgent instead. */
    private constructor();
    /** Return the URL for this agent's page on Fixie. */
    agentUrl(): string;
    /** Get the agent with the given agent ID. */
    static GetAgent(client: FixieClient, agentId: string): Promise<FixieAgent>;
    /** Return all agents visible to the user. */
    static ListAgents(client: FixieClient): Promise<FixieAgent[]>;
    /** Return the metadata associated with the given agent. */
    private static getAgentById;
    /** Create a new Agent. */
    static CreateAgent(client: FixieClient, handle: string, name?: string, description?: string, moreInfoUrl?: string, published?: boolean): Promise<FixieAgent>;
    /** Delete this agent. */
    delete(): Promise<import("@apollo/client/core/index.js").FetchResult<any>>;
    /** Update this agent. */
    update({ name, description, moreInfoUrl, published, }: {
        name?: string;
        description?: string;
        moreInfoUrl?: string;
        published?: boolean;
    }): Promise<void>;
    /** Load an agent configuration from the given directory. */
    static LoadConfig(agentPath: string): AgentConfig;
    private static inferRuntimeParametersSchema;
    /** Package the code in the given directory and return the path to the tarball. */
    private static getCodePackage;
    /** Create a new agent revision, which deploys the agent. */
    private createRevision;
    /** Get the current agent revision. */
    getCurrentRevision(): Promise<AgentRevision | null>;
    /** Set the current agent revision. */
    setCurrentRevision(revisionId: string): Promise<AgentRevision>;
    deleteRevision(revisionId: string): Promise<void>;
    /** Ensure that the agent is created or updated. */
    private static ensureAgent;
    static spawnAgentProcess(agentPath: string, port: number, env: Record<string, string>): import("execa").ExecaChildProcess<string>;
    /** Deploy an agent from the given directory. */
    static DeployAgent(client: FixieClient, agentPath: string, environmentVariables?: Record<string, string>): Promise<AgentRevision>;
    /** Run an agent locally from the given directory. */
    static ServeAgent({ client, agentPath, tunnel, port, environmentVariables, debug, }: {
        client: FixieClient;
        agentPath: string;
        tunnel?: boolean;
        port: number;
        environmentVariables: Record<string, string>;
        debug?: boolean;
    }): Promise<void>;
    private static pollPortUntilReady;
    private static createAsyncIterable;
    private static zipAsyncIterables;
    private static spawnTunnel;
}
