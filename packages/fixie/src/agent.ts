import { gql } from '@apollo/client/core/index.js';
import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import { execSync } from 'child_process';
import ora from 'ora';
import os from 'os';
import path from 'path';
import { execa } from 'execa';
import Watcher from 'watcher';
import net from 'node:net';

import * as TJS from 'typescript-json-schema';

const { terminal: term } = terminal;

import { FixieClient } from './client.js';
import { MergeExclusive } from 'type-fest';

/** Represents metadata about an agent managed by the Fixie service. */
export interface AgentMetadata {
  uuid: string;
  handle: string;
  name?: string;
  description?: string;
  moreInfoUrl?: string;
  published?: boolean;
  created: Date;
  modified: Date;
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
  isCurrent: boolean;
}

/** Represents an Agent Log entry. */
export interface AgentLogEntry {
  timestamp: Date;
  traceId?: string;
  spanId?: string;
  severity?: number;
  message?: string;
}

/**
 * This class provides an interface to the Fixie Agent API.
 */
export class FixieAgent {
  /** Use GetAgent or CreateAgent instead. */
  private constructor(readonly client: FixieClient, public metadata: AgentMetadata) {}

  public get handle(): string {
    return this.metadata.handle;
  }

  /** Return the URL for this agent's page on Fixie. */
  public agentUrl(baseUrl?: string): string {
    const url = new URL(`agents/${this.metadata.uuid}`, baseUrl ?? 'https://api.fixie.ai');
    // If using the default API host, change it to the console host.
    if (url.hostname === 'api.fixie.ai') {
      url.hostname = 'console.fixie.ai';
    }
    return url.toString();
  }

  /** Get the agent with the given agent ID or handle. */
  public static async GetAgent({
    client,
    agentId,
    handle,
  }: {
    client: FixieClient;
    agentId?: string;
    handle?: string;
  }): Promise<FixieAgent> {
    if (!agentId && !handle) {
      throw new Error('Must specify either agentId or handle');
    }
    if (agentId && handle) {
      throw new Error('Must specify either agentId or handle, not both');
    }
    let metadata: AgentMetadata;
    if (agentId) {
      metadata = await FixieAgent.getAgentById(client, agentId);
    } else {
      metadata = await FixieAgent.getAgentByHandle(client, handle!);
    }
    return new FixieAgent(client, metadata);
  }

  /** Return all agents visible to the user. */
  public static async ListAgents(client: FixieClient): Promise<FixieAgent[]> {
    const result = await client.gqlClient().query({
      fetchPolicy: 'no-cache',
      query: gql`
        {
          allAgentsForUser {
            uuid
          }
        }
      `,
    });
    return Promise.all(
      result.data.allAgentsForUser.map((agent: any) => this.GetAgent({ client, agentId: agent.uuid }))
    );
  }

  /** Return the metadata associated with the given agent by ID. */
  private static async getAgentById(client: FixieClient, agentId: string): Promise<AgentMetadata> {
    const result = await client.gqlClient().query({
      fetchPolicy: 'no-cache',
      query: gql`
        query GetAgentById($agentId: String!) {
          agent: agentById(agentId: $agentId) {
            agentId
            uuid
            handle
            name
            description
            moreInfoUrl
            created
            modified
            published
            currentRevision {
              id
              created
            }
            allRevisions {
              id
              created
            }
          }
        }
      `,
      variables: { agentId },
    });

    return {
      uuid: result.data.agent.uuid,
      handle: result.data.agent.handle,
      name: result.data.agent.name,
      description: result.data.agent.description,
      moreInfoUrl: result.data.agent.moreInfoUrl,
      published: result.data.agent.published,
      created: new Date(result.data.agent.created),
      modified: new Date(result.data.agent.modified),
      currentRevision: result.data.agent.currentRevision,
      allRevisions: result.data.agent.allRevisions,
    };
  }

  /** Return the metadata associated with the given agent handle. */
  private static async getAgentByHandle(client: FixieClient, handle: string): Promise<AgentMetadata> {
    const result = await client.gqlClient().query({
      fetchPolicy: 'no-cache',
      query: gql`
        query GetAgentByHandle($handle: String!) {
          agent: agentByHandle(handle: $handle) {
            agentId
            uuid
            handle
            name
            description
            moreInfoUrl
            created
            modified
            published
            currentRevision {
              id
              created
            }
            allRevisions {
              id
              created
            }
          }
        }
      `,
      variables: { handle },
    });

    return {
      uuid: result.data.agent.uuid,
      handle: result.data.agent.handle,
      name: result.data.agent.name,
      description: result.data.agent.description,
      moreInfoUrl: result.data.agent.moreInfoUrl,
      published: result.data.agent.published,
      created: new Date(result.data.agent.created),
      modified: new Date(result.data.agent.modified),
      currentRevision: result.data.agent.currentRevision,
      allRevisions: result.data.agent.allRevisions,
    };
  }

  /** Create a new Agent. */
  public static async CreateAgent({
    client,
    handle,
    teamId,
    name,
    description,
    moreInfoUrl,
    published,
  }: {
    client: FixieClient;
    handle: string;
    teamId?: string;
    name?: string;
    description?: string;
    moreInfoUrl?: string;
    published?: boolean;
  }): Promise<FixieAgent> {
    const result = await client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgent(
          $handle: String!
          $teamId: String
          $description: String
          $moreInfoUrl: String
          $published: Boolean
        ) {
          createAgent(
            agentData: {
              handle: $handle
              teamId: $teamId
              description: $description
              moreInfoUrl: $moreInfoUrl
              published: $published
            }
          ) {
            agent {
              uuid
            }
          }
        }
      `,
      variables: {
        handle,
        teamId,
        name,
        description,
        moreInfoUrl,
        published: published ?? true,
      },
    });
    const agentId = result.data.createAgent.agent.uuid;
    return FixieAgent.GetAgent({ client, agentId });
  }

  /** Delete this agent. */
  delete() {
    return this.client.gqlClient().mutate({
      mutation: gql`
        mutation DeleteAgent($uuid: UUID!) {
          deleteAgent(agentData: { uuid: $uuid }) {
            agent {
              uuid
              handle
            }
          }
        }
      `,
      variables: { uuid: this.metadata.uuid },
    });
  }

  /** Update this agent. */
  async update({
    name,
    description,
    moreInfoUrl,
    published,
  }: {
    name?: string;
    description?: string;
    moreInfoUrl?: string;
    published?: boolean;
  }) {
    await this.client.gqlClient().mutate({
      mutation: gql`
        mutation UpdateAgent(
          $uuid: UUID!
          $handle: String
          $name: String
          $description: String
          $moreInfoUrl: String
          $published: Boolean
        ) {
          updateAgent(
            agentData: {
              uuid: $uuid
              handle: $handle
              name: $name
              description: $description
              moreInfoUrl: $moreInfoUrl
              published: $published
            }
          ) {
            agent {
              uuid
            }
          }
        }
      `,
      variables: {
        uuid: this.metadata.uuid,
        handle: this.handle,
        name,
        description,
        moreInfoUrl,
        published,
      },
    });
    this.metadata = await FixieAgent.getAgentById(this.client, this.metadata.uuid);
  }

  /** Return logs for this Agent. Returns the last 15 minutes of agent logs. */
  async getLogs({
    start,
    end,
    limit,
    offset,
    minSeverity,
    conversationId,
    messageId,
  }: {
    start?: Date;
    end?: Date;
    limit?: number;
    offset?: number;
    minSeverity?: number;
    conversationId?: string;
    messageId?: string;
  }): Promise<AgentLogEntry[]> {
    // We don't actually care about the full URL here. We're only using the
    // URL to build up the query parameters.
    const url = new URL('http://localhost/');
    if (start) {
      url.searchParams.append('startTimestamp', Math.floor(start.getTime() / 1000).toString());
    }
    if (end) {
      url.searchParams.append('endTimestamp', Math.floor(end.getTime() / 1000).toString());
    }
    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }
    if (minSeverity) {
      url.searchParams.append('minSeverity', minSeverity.toString());
    }
    if (conversationId) {
      url.searchParams.append('conversationId', conversationId);
    }
    if (messageId) {
      url.searchParams.append('messageId', messageId);
    }
    const retval = await this.client.request(`/api/v1/agents/${this.metadata.uuid}/logs${url.search}`);
    if (retval.status !== 200) {
      return [];
    }
    const logs = (await retval.json()) as { logs: AgentLogEntry[] };
    return logs.logs;
  }

  /** Load an agent configuration from the given directory. */
  public static LoadConfig(agentPath: string): AgentConfig {
    const fullPath = path.resolve(path.join(agentPath, 'agent.yaml'));
    const config = yaml.load(fs.readFileSync(fullPath, 'utf8')) as object;

    // Warn if any fields are present in config that are not supported.
    const validKeys = [
      'handle',
      'name',
      'description',
      'moreInfoUrl',
      'more_info_url',
      'deploymentUrl',
      'deployment_url',
    ];
    const invalidKeys = Object.keys(config).filter((key) => !validKeys.includes(key));
    for (const key of invalidKeys) {
      term('❓ Ignoring invalid key ').yellow(key)(' in agent.yaml\n');
    }
    return config as AgentConfig;
  }

  private static inferRuntimeParametersSchema(agentPath: string): TJS.Definition | null {
    // If there's a tsconfig.json file, try to use Typescript to produce a JSON schema
    // with the runtime parameters for the agent.
    const tsconfigPath = path.resolve(path.join(agentPath, 'tsconfig.json'));
    if (!fs.existsSync(tsconfigPath)) {
      term.yellow(`⚠️ tsconfig.json not found at ${tsconfigPath}. Your agent will not support runtime parameters.\n`);
      return null;
    }

    const settings: TJS.PartialArgs = {
      required: true,
      noExtraProps: true,
    };

    // We're currently assuming the entrypoint is exported from src/index.{ts,tsx}.
    const handlerPath = path.resolve(path.join(agentPath, 'src/index.js'));
    const tempPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fixie-')), 'extract-parameters-schema.mts');
    fs.writeFileSync(
      tempPath,
      `
      import Handler from '${handlerPath}';
      export type RuntimeParameters = Parameters<typeof Handler> extends [infer T, ...any] ? T : {};
      `
    );
    const program = TJS.programFromConfig(tsconfigPath, [tempPath]);
    const schema = TJS.generateSchema(program, 'RuntimeParameters', settings);
    if (schema && schema.type !== 'object') {
      throw new Error(`The first argument of your default export must be an object (not ${schema.type})`);
    }

    return schema;
  }

  /** Package the code in the given directory and return the path to the tarball. */
  private static getCodePackage(agentPath: string): string {
    // Read the package.json file to get the package name and version.
    const packageJsonPath = path.resolve(path.join(agentPath, 'package.json'));
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Create a temporary directory and run `npm pack` inside.
    const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), `fixie-tmp-${packageJson.name}-${packageJson.version}-`));
    const commandline = `npm pack ${path.resolve(agentPath)}`;
    try {
      execSync(commandline, { cwd: tempdir, stdio: 'inherit' });
    } catch (ex) {
      throw new Error(`\`${commandline}\` failed. Check for build errors above and retry.`);
    }
    return `${tempdir}/${packageJson.name}-${packageJson.version}.tgz`;
  }

  /** Create a new agent revision, which deploys the agent. */
  private async createRevision(
    opts: MergeExclusive<{ externalUrl: string }, { tarball: string; environmentVariables: Record<string, string> }> & {
      defaultRuntimeParameters?: Record<string, unknown> | null;
      runtimeParametersSchema?: TJS.Definition | null;
    }
  ): Promise<AgentRevision> {
    const uploadFile = opts.tarball ? fs.readFileSync(fs.realpathSync(opts.tarball)) : undefined;

    const result = await this.client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgentRevision(
          $agentUuid: UUID!
          $metadata: [RevisionMetadataKeyValuePairInput!]!
          $makeCurrent: Boolean!
          $externalDeployment: ExternalDeploymentInput
          $managedDeployment: ManagedDeploymentInput
          $defaultRuntimeParameters: JSONString
        ) {
          createAgentRevision(
            agentUuid: $agentUuid
            makeCurrent: $makeCurrent
            revision: {
              metadata: $metadata
              externalDeployment: $externalDeployment
              managedDeployment: $managedDeployment
              defaultRuntimeParameters: $defaultRuntimeParameters
            }
          ) {
            revision {
              id
              created
            }
          }
        }
      `,
      variables: {
        agentUuid: this.metadata.uuid,
        metadata: [],
        makeCurrent: true,
        defaultRuntimeParameters: JSON.stringify(opts.defaultRuntimeParameters),
        externalDeployment: opts.externalUrl && {
          url: opts.externalUrl,
          runtimeParametersSchema: JSON.stringify(opts.runtimeParametersSchema),
        },
        managedDeployment: opts.tarball &&
          uploadFile && {
            codePackage: new Blob([uploadFile], { type: 'application/gzip' }),
            environmentVariables: Object.entries(opts.environmentVariables).map(([key, value]) => ({
              name: key,
              value,
            })),
            runtimeParametersSchema: JSON.stringify(opts.runtimeParametersSchema),
          },
      },
      fetchPolicy: 'no-cache',
    });

    return result.data.createAgentRevision.revision;
  }

  /** Get the current agent revision. */
  public async getCurrentRevision(): Promise<AgentRevision | null> {
    const result = await this.client.gqlClient().query({
      fetchPolicy: 'no-cache',
      query: gql`
        query GetRevisionId($agentId: String!) {
          agentById(agentId: $agentId) {
            currentRevision {
              id
              created
            }
          }
        }
      `,
      variables: { agentId: this.metadata.uuid },
    });
    return result.data.agentById.currentRevision as AgentRevision;
  }

  /** Set the current agent revision. */
  public async setCurrentRevision(revisionId: string): Promise<AgentRevision> {
    const result = await this.client.gqlClient().mutate({
      mutation: gql`
        mutation SetCurrentAgentRevision($agentUuid: UUID!, $currentRevisionId: ID!) {
          updateAgent(agentData: { uuid: $agentUuid, currentRevisionId: $currentRevisionId }) {
            agent {
              currentRevision {
                id
                created
              }
            }
          }
        }
      `,
      variables: { agentUuid: this.metadata.uuid, currentRevisionId: revisionId },
      fetchPolicy: 'no-cache',
    });
    return result.data.updateAgent.agent.currentRevision as AgentRevision;
  }

  public async deleteRevision(revisionId: string): Promise<void> {
    await this.client.gqlClient().mutate({
      mutation: gql`
        mutation DeleteAgentRevision($agentUuid: UUID!, $revisionId: ID!) {
          deleteAgentRevision(agentUuid: $agentUuid, revisionId: $revisionId) {
            agent {
              agentId
            }
          }
        }
      `,
      variables: { agentUuid: this.metadata.uuid, revisionId },
      fetchPolicy: 'no-cache',
    });
  }

  /** Ensure that the agent is created or updated. */
  private static async ensureAgent(client: FixieClient, config: AgentConfig): Promise<FixieAgent> {
    let agent: FixieAgent;
    try {
      agent = await FixieAgent.GetAgent({ client, handle: config.handle });
      await agent.update({
        name: config.name,
        description: config.description,
        moreInfoUrl: config.moreInfoUrl,
      });
    } catch (e) {
      // Try to create the agent instead.
      term('🦊 Creating new agent ').green(config.handle)('...\n');
      agent = await FixieAgent.CreateAgent({
        client,
        handle: config.handle,
        name: config.name,
        description: config.description,
        moreInfoUrl: config.moreInfoUrl,
      });
    }
    return agent;
  }

  static spawnAgentProcess(agentPath: string, port: number, env: Record<string, string>) {
    term(`🌱 Building agent at ${agentPath}...\n`);
    this.getCodePackage(agentPath);

    const pathToCheck = path.resolve(path.join(agentPath, 'dist', 'index.js'));
    if (!fs.existsSync(pathToCheck)) {
      throw Error(`Your agent was not found at ${pathToCheck}. Did the build fail?`);
    }

    const cmdline = `npx --package=@fixieai/sdk fixie-serve-bin --packagePath ./dist/index.js --port ${port}`;
    // Split cmdline into the first value (argv0) and a list of arguments separated by spaces.
    term('🌱 Running: ').green(cmdline)('\n');

    const [argv0, ...args] = cmdline.split(' ');
    const subProcess = execa(argv0, args, { cwd: agentPath, env });
    term('🌱 Agent process running at PID: ').green(subProcess.pid)('\n');
    subProcess.stdout?.setEncoding('utf8');
    subProcess.stderr?.setEncoding('utf8');

    subProcess.on('spawn', () => {
      console.log(`🌱 Agent child process started with PID [${subProcess.pid}]`);
    });
    subProcess.stdout?.on('data', (sdata: string) => {
      console.log(`🌱 Agent stdout: ${sdata.trimEnd()}`);
    });
    subProcess.stderr?.on('data', (sdata: string) => {
      console.error(`🌱 Agent stdout: ${sdata.trimEnd()}`);
    });
    subProcess.on('error', (err: any) => {
      term('🌱 ').red(`Agent child process [${subProcess.pid}] exited with error: ${err.message}\n`);
    });
    subProcess.on('close', (returnCode: number) => {
      term('🌱 ').red(`Agent child process [${subProcess.pid}] exited with code ${returnCode}\n`);
    });
    return subProcess;
  }

  /** Deploy an agent from the given directory. */
  public static async DeployAgent(
    client: FixieClient,
    agentPath: string,
    environmentVariables: Record<string, string> = {}
  ): Promise<AgentRevision> {
    const config = await FixieAgent.LoadConfig(agentPath);
    term('🦊 Deploying agent ').green(config.handle)('...\n');

    // Check that the package.json path exists in this directory.
    const packageJsonPath = path.resolve(path.join(agentPath, 'package.json'));
    if (!fs.existsSync(packageJsonPath)) {
      throw Error(`No package.json found at ${packageJsonPath}. Only JS-based agents are supported.`);
    }

    const yarnLockPath = path.resolve(path.join(agentPath, 'yarn.lock'));
    const pnpmLockPath = path.resolve(path.join(agentPath, 'pnpm-lock.yaml'));

    if (fs.existsSync(yarnLockPath)) {
      term.yellow(
        '⚠️ Detected yarn.lock file, but Fixie only supports npm. Fixie will try to install your package with npm, which may produce unexpected results.'
      );
    }
    if (fs.existsSync(pnpmLockPath)) {
      term.yellow(
        '⚠️ Detected pnpm-lock.yaml file, but Fixie only supports npm. Fixie will try to install your package with npm, which may produce unexpected results.'
      );
    }

    const agent = await this.ensureAgent(client, config);
    const runtimeParametersSchema = this.inferRuntimeParametersSchema(agentPath);
    const tarball = FixieAgent.getCodePackage(agentPath);
    const spinner = ora(' 🚀 Deploying... (hang tight, this takes a minute or two!)').start();
    const revision = await agent.createRevision({ tarball, environmentVariables, runtimeParametersSchema });
    spinner.succeed(`Agent ${config.handle} is running at: ${agent.agentUrl(client.url)}`);
    return revision;
  }

  /** Run an agent locally from the given directory. */
  public static async ServeAgent({
    client,
    agentPath,
    tunnel,
    port,
    environmentVariables,
    debug,
  }: {
    client: FixieClient;
    agentPath: string;
    tunnel?: boolean;
    port: number;
    environmentVariables: Record<string, string>;
    debug?: boolean;
  }) {
    const config = await FixieAgent.LoadConfig(agentPath);
    term('🦊 Serving agent ').green(config.handle)('...\n');

    // Check if the package.json path exists in this directory.
    const packageJsonPath = path.resolve(path.join(agentPath, 'package.json'));
    if (!fs.existsSync(packageJsonPath)) {
      throw Error(`No package.json found in ${packageJsonPath}. Only JS-based agents are supported.`);
    }

    // Infer the runtime parameters schema. We'll create a generator that yields whenever the schema changes.
    let runtimeParametersSchema = FixieAgent.inferRuntimeParametersSchema(agentPath);
    const { iterator: schemaGenerator, push: pushToSchemaGenerator } =
      this.createAsyncIterable<TJS.Definition | null>();
    pushToSchemaGenerator(runtimeParametersSchema);

    // Start the agent process locally.
    let agentProcess = FixieAgent.spawnAgentProcess(agentPath, port, environmentVariables);

    // Watch files in the agent directory for changes.
    const watchPath = path.resolve(agentPath);
    const watchExcludePaths = [
      path.resolve(path.join(agentPath, 'dist')),
      path.resolve(path.join(agentPath, 'node_modules')),
    ];
    // Return true if the path matches the prefix of any of the exclude paths.
    const ignoreFunc = (path: string): boolean => {
      if (watchExcludePaths.some((excludePath) => path.startsWith(excludePath))) {
        return true;
      }
      return false;
    };
    console.log(`🌱 Watching ${watchPath} for changes...`);

    const watcher = new Watcher(watchPath, {
      ignoreInitial: true,
      recursive: true,
      ignore: ignoreFunc,
    });
    watcher.on('all', async (event: any, targetPath: string, _targetPathNext: any) => {
      console.log(`🌱 Restarting local agent process due to ${event}: ${targetPath}`);
      agentProcess.kill();
      // Let it shut down gracefully.
      await new Promise<void>((resolve) => {
        if (agentProcess.exitCode !== null || agentProcess.signalCode !== null) {
          resolve();
        } else {
          agentProcess.on('close', () => {
            resolve();
          });
        }
      });

      try {
        const newSchema = FixieAgent.inferRuntimeParametersSchema(agentPath);
        if (JSON.stringify(runtimeParametersSchema) !== JSON.stringify(newSchema)) {
          pushToSchemaGenerator(newSchema);
          runtimeParametersSchema = newSchema;
        }

        agentProcess = FixieAgent.spawnAgentProcess(agentPath, port, environmentVariables);
      } catch (ex) {
        term(`❌ Failed to restart agent process: ${ex} \n`);
      }
    });

    // This is an iterator which yields the public URL of the tunnel where the agent
    // can be reached by the Fixie service. The tunnel address can change over time.
    let deploymentUrlsIter: AsyncIterator<string>;
    if (tunnel) {
      deploymentUrlsIter = FixieAgent.spawnTunnel(port, Boolean(debug));
    } else {
      if (!config.deploymentUrl) {
        throw Error('No deployment URL specified in agent.yaml');
      }
      deploymentUrlsIter = (async function* () {
        yield config.deploymentUrl!;

        // Never yield another value.
        await new Promise(() => {});
      })();
    }

    const agent = await this.ensureAgent(client, config);
    const originalRevision = await agent.getCurrentRevision();
    if (originalRevision) {
      term('🥡 Replacing current agent revision ').green(originalRevision.id)('\n');
    }
    let currentRevision: AgentRevision | null = null;
    const doCleanup = async () => {
      watcher.close();
      if (originalRevision) {
        try {
          await agent.setCurrentRevision(originalRevision.id);
          term('🥡 Restoring original agent revision ').green(originalRevision.id)('\n');
        } catch (e: any) {
          term('🥡 Failed to restore original agent revision: ').red(e.message)('\n');
        }
      }
      if (currentRevision) {
        try {
          await agent.deleteRevision(currentRevision.id);
          term('🥡 Deleting temporary agent revision ').green(currentRevision.id)('\n');
        } catch (e: any) {
          term('🥡 Failed to delete temporary agent revision: ').red(e.message)('\n');
        }
      }
    };
    process.on('SIGINT', async () => {
      console.log('Got Ctrl-C - cleaning up and exiting.');
      await doCleanup();
    });

    // The tunnel may yield different URLs over time. We need to create a new
    // agent revision each time.
    for await (const [currentUrl, runtimeParametersSchema] of this.zipAsyncIterables(
      deploymentUrlsIter,
      schemaGenerator
    )) {
      await FixieAgent.pollPortUntilReady(port);

      term('🚇 Current tunnel URL is: ').green(currentUrl)('\n');
      try {
        if (currentRevision) {
          term('🥡 Deleting temporary agent revision ').green(currentRevision.id)('\n');
          await agent.deleteRevision(currentRevision.id);
          currentRevision = null;
        }
        currentRevision = await agent.createRevision({ externalUrl: currentUrl, runtimeParametersSchema });
        term('🥡 Created temporary agent revision ').green(currentRevision.id)('\n');
        term('🥡 Agent ').green(config.handle)(' is running at: ').green(agent.agentUrl(client.url))('\n');
      } catch (e: any) {
        term('🥡 Got error trying to create agent revision: ').red(e.message)('\n');
        console.error(e);
        continue;
      }
    }
  }

  private static async pollPortUntilReady(port: number): Promise<void> {
    while (true) {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = net.connect({
            host: '127.0.0.1',
            port,
          });

          socket.on('connect', resolve);
          socket.on('error', reject);
        });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  private static createAsyncIterable<T>(): { iterator: AsyncIterator<T>; push: (value: T) => void } {
    let streamController: ReadableStreamDefaultController<T>;
    const stream = new ReadableStream<T>({
      start(controller) {
        streamController = controller;
      },
    });

    return {
      // @ts-expect-error https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/62651
      iterator: stream[Symbol.asyncIterator](),
      push: (value: T) => {
        streamController.enqueue(value);
      },
    };
  }

  private static async *zipAsyncIterables<T, U>(
    gen1: AsyncIterator<T>,
    gen2: AsyncIterator<U>
  ): AsyncGenerator<[T, U]> {
    const generators = [gen1, gen2] as const;
    const currentValues = (await Promise.all(generators.map((g) => g.next()))).map((v) => v.value) as [T, U];
    const nextPromises = generators.map((g) => g.next());

    async function updateWithReadyValue(index: number): Promise<boolean> {
      const value = await Promise.race([nextPromises[index], null]);
      if (value === null) {
        return false;
      }

      if (value.done) {
        return true;
      }

      currentValues[index] = value.value;
      nextPromises[index] = generators[index].next();
      return false;
    }

    while (true) {
      yield currentValues;

      // Wait for one of the generators to yield a new value.
      await Promise.race(nextPromises);

      const shouldExit = await Promise.all([0, 1].map(updateWithReadyValue));
      if (shouldExit.some((v) => v)) {
        break;
      }
    }
  }

  private static spawnTunnel(port: number, debug: boolean): AsyncIterator<string> {
    const { iterator, push: pushToIterator } = this.createAsyncIterable<string>();

    term('🚇 Starting tunnel process...\n');
    // We use localhost.run as a tunneling service. This sets up an SSH tunnel
    // to the provided local port via localhost.run. The subprocess returns a
    // stream of JSON responses, one per line, with the external URL of the tunnel
    // as it changes.
    const subProcess = execa('ssh', [
      '-R',
      // N.B. 127.0.0.1 must be used on Windows (not localhost or 0.0.0.0)
      `80:127.0.0.1:${port}`,
      '-o',
      // Need to send keepalives to prevent the connection from getting chopped
      // (see https://localhost.run/docs/faq#my-connection-is-unstable-tunnels-go-down-often)
      'ServerAliveInterval=59',
      '-o',
      'StrictHostKeyChecking=accept-new',
      'nokey@localhost.run',
      '--',
      '--output=json',
    ]);
    subProcess.stdout?.setEncoding('utf8');

    // Every time the subprocess emits a new line, we parse it as JSON ans
    // extract the 'address' field.
    let currentLine = '';
    subProcess.stdout?.on('data', (chunk: string) => {
      // We need to do buffering since the data we get from stdout
      // will not necessarily be line-buffered. We can get 0, 1, or more complete
      // lines in a single chunk.
      currentLine += chunk;
      let newlineIndex;
      while ((newlineIndex = currentLine.indexOf('\n')) !== -1) {
        const line = currentLine.slice(0, newlineIndex);
        currentLine = currentLine.slice(newlineIndex + 1);
        // Parse data as JSON.
        const pdata = JSON.parse(line);
        // If pdata has the 'address' field, yield it.
        if (pdata.address) {
          pushToIterator(`https://${pdata.address}`);
        }
      }
    });

    subProcess.stderr?.on('data', (sdata: string) => {
      if (debug) {
        console.error(`🚇 Tunnel stderr: ${sdata}`);
      }
    });
    subProcess.on('close', (returnCode: number) => {
      if (debug) {
        console.log(`🚇 Tunnel child process exited with code ${returnCode}`);
      }
      iterator.return?.(null);
    });

    return iterator;
  }
}
