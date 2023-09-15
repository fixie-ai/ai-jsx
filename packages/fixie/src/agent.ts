import { gql } from '@apollo/client/core/index.js';
import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import { execSync, ChildProcess } from 'child_process';
import ora from 'ora';
import os from 'os';
import path from 'path';
import { execa } from 'execa';

const { terminal: term } = terminal;

import { FixieClient } from './client.js';
import { MergeExclusive } from 'type-fest';

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
export class FixieAgent {
  owner: string;
  handle: string;

  /** Use GetAgent or CreateAgent instead. */
  private constructor(readonly client: FixieClient, readonly agentId: string, public metadata: AgentMetadata) {
    const parts = agentId.split('/');
    this.owner = parts[0];
    this.handle = parts[1];
  }

  /** Return the URL for this agent's page on Fixie. */
  public agentUrl(): string {
    // TODO(mdw): We need a way to know what the appropriate 'console' URL
    // is for a given API URL. Since for now this is always console.fixie.ai,
    // we can just hardcode it.
    return `https://console.fixie.ai/agents/${this.agentId}`;
  }

  /** Get the agent with the given agent ID. */
  public static async GetAgent(client: FixieClient, agentId: string): Promise<FixieAgent> {
    const metadata = await FixieAgent.getAgentById(client, agentId);
    const agent = new FixieAgent(client, agentId, metadata);
    return agent;
  }

  /** Return all agents visible to the user. */
  public static async ListAgents(client: FixieClient): Promise<FixieAgent[]> {
    const result = await client.gqlClient().query({
      fetchPolicy: 'no-cache',
      query: gql`
        {
          allAgentsForUser {
            agentId
          }
        }
      `,
    });
    return Promise.all(result.data.allAgentsForUser.map((agent: any) => this.GetAgent(client, agent.agentId)));
  }

  /** Return the metadata associated with the given agent. */
  private static async getAgentById(client: FixieClient, agentId: string): Promise<AgentMetadata> {
    const result = await client.gqlClient().query({
      fetchPolicy: 'no-cache',
      query: gql`
        query GetAgentById($agentId: String!) {
          agent: agentById(agentId: $agentId) {
            agentId
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
            owner {
              __typename
              ... on UserType {
                username
              }
              ... on OrganizationType {
                handle
              }
            }
          }
        }
      `,
      variables: { agentId },
    });

    return {
      agentId: result.data.agent.agentId,
      handle: result.data.agent.handle,
      name: result.data.agent.name,
      description: result.data.agent.description,
      moreInfoUrl: result.data.agent.moreInfoUrl,
      published: result.data.agent.published,
      created: new Date(result.data.agent.created),
      modified: new Date(result.data.agent.modified),
      owner: result.data.agent.owner.username || result.data.agent.owner.handle,
      currentRevision: result.data.agent.currentRevision,
      allRevisions: result.data.agent.allRevisions,
    };
  }

  /** Create a new Agent. */
  public static async CreateAgent(
    client: FixieClient,
    handle: string,
    name?: string,
    description?: string,
    moreInfoUrl?: string,
    published?: boolean
  ): Promise<FixieAgent> {
    const result = await client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgent($handle: String!, $description: String, $moreInfoUrl: String, $published: Boolean) {
          createAgent(
            agentData: { handle: $handle, description: $description, moreInfoUrl: $moreInfoUrl, published: $published }
          ) {
            agent {
              agentId
            }
          }
        }
      `,
      variables: {
        handle,
        name,
        description,
        moreInfoUrl,
        published: published ?? true,
      },
    });
    const agentId = result.data.createAgent.agent.agentId;
    return FixieAgent.GetAgent(client, agentId);
  }

  /** Delete this agent. */
  delete() {
    return this.client.gqlClient().mutate({
      mutation: gql`
        mutation DeleteAgent($handle: String!) {
          deleteAgent(agentData: { handle: $handle }) {
            agent {
              handle
            }
          }
        }
      `,
      variables: { handle: this.handle },
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
    this.client.gqlClient().mutate({
      mutation: gql`
        mutation UpdateAgent(
          $handle: String!
          $name: String
          $description: String
          $moreInfoUrl: String
          $published: Boolean
        ) {
          updateAgent(
            agentData: {
              handle: $handle
              name: $name
              description: $description
              moreInfoUrl: $moreInfoUrl
              published: $published
            }
          ) {
            agent {
              agentId
            }
          }
        }
      `,
      variables: {
        handle: this.handle,
        name,
        description,
        moreInfoUrl,
        published,
      },
    });
    this.metadata = await FixieAgent.getAgentById(this.client, this.agentId);
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
    opts: MergeExclusive<{ externalUrl: string }, { tarball: string; environmentVariables: Record<string, string> }>
  ): Promise<AgentRevision> {
    const uploadFile = opts.tarball ? fs.readFileSync(fs.realpathSync(opts.tarball)) : undefined;

    const result = await this.client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgentRevision(
          $handle: String!
          $metadata: [RevisionMetadataKeyValuePairInput!]!
          $makeCurrent: Boolean!
          $externalDeployment: ExternalDeploymentInput
          $managedDeployment: ManagedDeploymentInput
        ) {
          createAgentRevision(
            agentHandle: $handle
            makeCurrent: $makeCurrent
            revision: {
              metadata: $metadata
              externalDeployment: $externalDeployment
              managedDeployment: $managedDeployment
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
        handle: this.handle,
        metadata: [],
        makeCurrent: true,
        externalDeployment: opts.externalUrl && { url: opts.externalUrl },
        managedDeployment: opts.tarball &&
          uploadFile && {
            environment: 'NODEJS',
            codePackage: new Blob([uploadFile], { type: 'application/gzip' }),
            environmentVariables: Object.entries(opts.environmentVariables).map(([key, value]) => ({
              name: key,
              value,
            })),
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
      variables: { agentId: this.agentId },
    });
    return result.data.agentById.currentRevision as AgentRevision;
  }

  /** Set the current agent revision. */
  public async setCurrentRevision(revisionId: string): Promise<AgentRevision> {
    const result = await this.client.gqlClient().mutate({
      mutation: gql`
        mutation SetCurrentAgentRevision($handle: String!, $currentRevisionId: ID!) {
          updateAgent(agentData: { handle: $handle, currentRevisionId: $currentRevisionId }) {
            agent {
              currentRevision {
                id
                created
              }
            }
          }
        }
      `,
      variables: { handle: this.handle, currentRevisionId: revisionId },
      fetchPolicy: 'no-cache',
    });
    return result.data.updateAgent.agent.currentRevision as AgentRevision;
  }

  public async deleteRevision(revisionId: string): Promise<void> {
    await this.client.gqlClient().mutate({
      mutation: gql`
        mutation DeleteAgentRevision($handle: String!, $revisionId: ID!) {
          deleteAgentRevision(agentHandle: $handle, revisionId: $revisionId) {
            agent {
              agentId
            }
          }
        }
      `,
      variables: { handle: this.handle, revisionId },
      fetchPolicy: 'no-cache',
    });
  }

  /** Ensure that the agent is created or updated. */
  private static async ensureAgent(client: FixieClient, agentId: string, config: AgentConfig): Promise<FixieAgent> {
    let agent: FixieAgent;
    try {
      agent = await FixieAgent.GetAgent(client, agentId);
      agent.update({
        name: config.name,
        description: config.description,
        moreInfoUrl: config.moreInfoUrl,
      });
    } catch (e) {
      // Try to create the agent instead.
      term('🦊 Creating new agent ').green(agentId)('...\n');
      agent = await FixieAgent.CreateAgent(client, config.handle, config.name, config.description, config.moreInfoUrl);
    }
    return agent;
  }

  static spawnAgentProcess(agentPath: string, port: number, env: Record<string, string>): ChildProcess {
    term(`🌱 Starting local agent process on port ${port}...\n`);
    const pathToCheck = path.resolve(path.join(agentPath, 'dist', 'index.js'));
    if (!fs.existsSync(pathToCheck)) {
      throw Error(`Your agent was not found at ${pathToCheck}. Do you need to build your agent code first?`);
    }

    const cmdline = `npx --package=@fixieai/sdk fixie-serve-bin --packagePath ./dist/index.js --port ${port}`;
    // Split cmdline into the first value (argv0) and a list of arguments separated by spaces.
    term('🌱 Running: ').green(cmdline)('\n');

    const [argv0, ...args] = cmdline.split(' ');
    const subProcess = execa(argv0, args, { cwd: agentPath, env });

    subProcess.stdout?.on('data', (sdata: string) => {
      console.log(`🌱 Agent stdout: ${sdata}`);
    });
    subProcess.stderr?.on('data', (sdata: string) => {
      console.error(`🌱 Agent stdout: ${sdata}`);
    });
    subProcess.on('close', (returnCode: number) => {
      term('🌱 ').red(`Agent child process exited with code ${returnCode}\n`);
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
    const agentId = `${(await client.userInfo()).username}/${config.handle}`;
    term('🦊 Deploying agent ').green(agentId)('...\n');

    // Check that the package.json path exists in this directory.
    const packageJsonPath = path.resolve(path.join(agentPath, 'package.json'));
    if (!fs.existsSync(packageJsonPath)) {
      throw Error(`No package.json found at ${packageJsonPath}. Only JS-based agents are supported.`);
    }

    const yarnLockPath = path.resolve(path.join(agentPath, 'yarn.lock'));
    const pnpmLockPath = path.resolve(path.join(agentPath, 'pnpm-lock.yaml'));

    if (fs.existsSync(yarnLockPath)) {
      term.yellow('⚠️ Detected yarn.lock file, but Fixie only supports npm. Fixie will try to install your package with npm, which may produce unexpected results.');
    }
    if (fs.existsSync(pnpmLockPath)) {
      term.yellow('⚠️ Detected pnpm-lock.yaml file, but Fixie only supports npm. Fixie will try to install your package with npm, which may produce unexpected results.');
    }

    const agent = await this.ensureAgent(client, agentId, config);
    const tarball = FixieAgent.getCodePackage(agentPath);
    const spinner = ora(' 🚀 Deploying... (hang tight, this takes a minute or two!)').start();
    const revision = await agent.createRevision({ tarball, environmentVariables });
    spinner.succeed(`Agent ${config.handle} is running at: ${agent.agentUrl()}`);
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
    const agentId = `${(await client.userInfo()).username}/${config.handle}`;
    term('🦊 Serving agent ').green(agentId)('...\n');

    // Check if the package.json path exists in this directory.
    const packageJsonPath = path.resolve(path.join(agentPath, 'package.json'));
    if (!fs.existsSync(packageJsonPath)) {
      throw Error(`No package.json found in ${packageJsonPath}. Only JS-based agents are supported.`);
    }

    // Trigger an `npm pack` to run a build.
    this.getCodePackage(agentPath);

    // Start the agent process locally.
    FixieAgent.spawnAgentProcess(agentPath, port, environmentVariables);

    // Wait for 5 seconds for it to start up.
    await new Promise((resolve) => setTimeout(resolve, 5000));

    async function* spawnTunnel(port: number): AsyncGenerator<string> {
      type AsyncGeneratorYield<T> = (value: T) => void;
      // Represents the value yielded by the subprocess.
      let yieldValue: AsyncGeneratorYield<string> | null = null;
      // This Promise is resolved when the tunnel subprocess yields a new address.
      let whenYielded = new Promise<string>((resolve) => {
        yieldValue = resolve;
      });

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
            yieldValue?.(`https://${pdata.address}`);
          }
        }
      });
      if (debug) {
        subProcess.stderr?.on('data', (sdata: string) => {
          console.error(`🚇 Tunnel stderr: ${sdata}`);
        });
        subProcess.on('close', (returnCode: number) => {
          console.log(`🚇 Tunnel child process exited with code ${returnCode}`);
        });
      }
      // Now we wait for the subprocess to yield a new address, which we then
      // re-yield to the caller of this function.
      while (true) {
        const tunnelAddress = await whenYielded;
        if (tunnelAddress === '') {
          break;
        }
        yield tunnelAddress;
        yieldValue = null;
        whenYielded = new Promise<string>((resolve) => {
          yieldValue = resolve;
        });
      }
    }

    // This is an iterator which yields the public URL of the tunnel where the agent
    // can be reached by the Fixie service. The tunnel address can change over time.
    let deploymentUrlsIter;
    if (tunnel) {
      deploymentUrlsIter = spawnTunnel(port);
    } else {
      if (!config.deploymentUrl) {
        throw Error('No deployment URL specified in agent.yaml');
      }
      deploymentUrlsIter = [
        (async function* () {
          yield config.deploymentUrl;
        })(),
      ];
    }

    const agent = await this.ensureAgent(client, agentId, config);
    const originalRevision = await agent.getCurrentRevision();
    if (originalRevision) {
      term('🥡 Replacing current agent revision ').green(originalRevision.id)('\n');
    }
    let currentRevision: AgentRevision | null = null;
    const doCleanup = async () => {
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
    for await (const currentUrl of deploymentUrlsIter) {
      term('🚇 Current tunnel URL is: ').green(currentUrl)('\n');
      try {
        // Wait 3 seconds to ensure the tunnel is set up.
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (currentRevision) {
          term('🥡 Deleting temporary agent revision ').green(currentRevision.id)('\n');
          await agent.deleteRevision(currentRevision.id);
          currentRevision = null;
        }
        currentRevision = await agent.createRevision({ externalUrl: currentUrl as string });
        term('🥡 Created temporary agent revision ').green(currentRevision.id)('\n');
        term('🥡 Agent ').green(config.handle)(' is running at: ').green(agent.agentUrl())('\n');
      } catch (e: any) {
        term('🥡 Got error trying to create agent revision: ').red(e.message)('\n');
        console.error(e);
        continue;
      }
    }
  }
}
