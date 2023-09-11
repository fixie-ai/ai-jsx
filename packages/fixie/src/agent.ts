import { gql } from '@apollo/client/core/index.js';
import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import { execSync, spawn, ChildProcess } from 'child_process';
import ora from 'ora';
import os from 'os';
import path from 'path';

const { terminal: term } = terminal;

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
}

/** Represents the contents of an agent.yaml configuration file. */
export interface AgentConfig {
  handle: string;
  name?: string;
  description?: string;
  moreInfoUrl?: string;
  public?: boolean;
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
    return `${this.client.url}/agents/${this.agentId}`;
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
    return Promise.all(
      result.data.allAgentsForUser.map(async (agent: any) => {
        const retAgent = await this.GetAgent(client, agent.agentId);
        return retAgent;
      })
    );
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
        published: published ?? false,
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
    const config = yaml.load(fs.readFileSync(`${agentPath}/agent.yaml`, 'utf8')) as AgentConfig;
    return config;
  }

  /** Package the code in the given directory and return the path to the tarball. */
  private static getCodePackage(agentPath: string): string {
    // Read the package.json file to get the package name and version.
    const packageJson = JSON.parse(fs.readFileSync(`${agentPath}/package.json`, 'utf8'));

    // Create a temporary directory and run `npm pack` inside.
    const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), `fixie-tmp-${packageJson.name}-${packageJson.version}-`));
    const commandline = `npm pack ${path.resolve(agentPath)} --silent >/dev/null`;
    execSync(commandline, { cwd: tempdir });
    return `${tempdir}/${packageJson.name}-${packageJson.version}.tgz`;
  }

  /** Create a new agent revision, which deploys the agent. */
  private async createRevision({
    externalUrl,
    tarball,
    environmentVariables,
  }: {
    externalUrl?: string;
    tarball?: string;
    environmentVariables: Record<string, string>;
  }): Promise<string> {
    const uploadFile = tarball ? fs.readFileSync(fs.realpathSync(tarball)) : undefined;

    console.log(`Creating agent revision at external URL ${externalUrl}`);

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
            }
          }
        }
      `,
      variables: {
        handle: this.handle,
        metadata: [],
        makeCurrent: true,
        externalDeployment: externalUrl && { url: externalUrl },
        managedDeployment: tarball &&
          uploadFile && {
            environment: 'NODEJS',
            codePackage: new Blob([uploadFile], { type: 'application/gzip' }),
            environmentVariables: Object.entries(environmentVariables).map(([key, value]) => ({ name: key, value })),
          },
      },
      fetchPolicy: 'no-cache',
    });

    return result.data.createAgentRevision.revision.id;
  }

  /** Get the current agent revision. */
  public async getCurrentRevision(): Promise<AgentRevision> {
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

  /** Ensure that the agent is created or updated. */
  private static async ensureAgent(client: FixieClient, agentId: string, config: AgentConfig): Promise<FixieAgent> {
    let agent: FixieAgent;
    try {
      agent = await FixieAgent.GetAgent(client, agentId);
      term('👽 Updating agent ').green(agentId)('...\n');
      agent.update({
        name: config.name,
        description: config.description,
        moreInfoUrl: config.moreInfoUrl,
        published: config.public,
      });
    } catch (e) {
      // Try to create the agent instead.
      term('🌲 Creating new agent ').green(agentId)('...\n');
      agent = await FixieAgent.CreateAgent(
        client,
        config.handle,
        config.name,
        config.description,
        config.moreInfoUrl,
        config.public
      );
    }
    return agent;
  }

  static spawnAgentProcess(agentPath: string, port: number): ChildProcess {
    const spinner = ora(' 🌱 Starting local agent process...').start();
    if (!fs.existsSync(`${agentPath}/dist/serve-bin.js`)) {
      throw Error(`No dist/serve-bin.js found in ${agentPath}. Do you need to build your agent code first?`);
    }
    // XXX MDW: This is a bit of a hack to see if I can get things working locally.
    // We try running "yarn fixie-serve" in the agent directory.
    const cmdline = `yarn fixie-serve --port ${port}`;

    //const cmdline = `npx --package=@fixieai/sdk fixie-serve-bin --packagePath ./dist/index.js --port ${port}`;
    //const cmdline = `npx ts-node ./dist/serve-bin.js --port ${port}`;
    term('🌱 Running: ').green(cmdline)('\n');
    const subProcess = spawn(cmdline, [], { cwd: agentPath, shell: true });
    subProcess.stdout.on('data', (sdata: string) => {
      console.log(`🌱 Agent stdout: ${sdata}`);
    });
    subProcess.stderr.on('data', (sdata: string) => {
      console.error(`🌱 Agent stdout: ${sdata}`);
    });
    subProcess.on('close', (returnCode: number) => {
      term(`🌱 Agent child process exited with code ${returnCode} - `).red('exiting.\n');
      process.exit(returnCode);
    });
    spinner.succeed(` 🌱 Local agent process started on port ${port}`);
    return subProcess;
  }

  /** Deploy an agent from the given directory. */
  public static async DeployAgent(
    client: FixieClient,
    agentPath: string,
    environmentVariables: Record<string, string> = {}
  ): Promise<string> {
    const config = await FixieAgent.LoadConfig(agentPath);
    const agentId = `${(await client.userInfo()).username}/${config.handle}`;
    term('🦊 Deploying agent ').green(agentId)('...\n');

    // Check that the package.json path exists in this directory.
    if (!fs.existsSync(`${agentPath}/package.json`)) {
      throw Error(`No package.json found in ${agentPath}. Only JS-based agents are supported.`);
    }
    const agent = await this.ensureAgent(client, agentId, config);
    const tarball = FixieAgent.getCodePackage(agentPath);
    const spinner = ora(' 🚀 Deploying...').start();
    const revision = await agent.createRevision({ tarball, environmentVariables });
    spinner.succeed(`Revision ${revision} was deployed to ${agent.agentUrl()}`);
    return revision;
  }

  /** Run an agent locally from the given directory. */
  public static async ServeAgent({
    client,
    agentPath,
    tunnel,
    reload,
    port,
    environmentVariables,
    debug,
  }: {
    client: FixieClient;
    agentPath: string;
    tunnel?: boolean;
    reload?: boolean;
    port: number;
    environmentVariables: Record<string, string>;
    debug?: boolean;
  }) {
    const config = await FixieAgent.LoadConfig(agentPath);
    const agentId = `${(await client.userInfo()).username}/${config.handle}`;
    term('🦊 Serving agent ').green(agentId)('...\n');

    // Check if the package.json path exists in this directory.
    if (!fs.existsSync(`${agentPath}/package.json`)) {
      throw Error(`No package.json found in ${agentPath}. Only JS-based agents are supported.`);
    }

    // Start the agent process locally.
    const agentProcess = FixieAgent.spawnAgentProcess(agentPath, port);

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
      const subProcess = spawn('ssh', [
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
      subProcess.stdout.setEncoding('utf8');

      // Every time the subprocess emits a new line, we parse it as JSON ans
      // extract the 'address' field.
      let currentLine = '';
      subProcess.stdout.on('data', (chunk: any) => {
        // We need to do buffering since the data we get from stdout
        // will not necessarily be line-buffered. We can get 0, 1, or more complete
        // lines in a single chunk.
        currentLine += chunk;
        let newlineIndex;
        while ((newlineIndex = currentLine.indexOf('\n')) !== -1) {
          const line = currentLine.slice(0, newlineIndex);
          currentLine = currentLine.slice(newlineIndex + 1);
          // Parse sdata as JSON.
          const pdata = JSON.parse(line);
          // If pdata has the 'address' field, yield it.
          if (pdata.address) {
            // We can't yield until the parent has set up the yieldValue callback.
            if (yieldValue) {
              yieldValue(pdata.address);
            }
          }
        }
      });
      if (debug) {
        subProcess.stderr.on('data', (sdata: string) => {
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
    let deployment_urls_iter;
    if (tunnel) {
      deployment_urls_iter = spawnTunnel(port);
    } else {
      if (!config.deploymentUrl) {
        throw Error('No deployment URL specified in agent.yaml');
      }
      deployment_urls_iter = [
        (async function* () {
          yield config.deploymentUrl;
        })(),
      ];
    }

    // TODO(mdw): We need to restore the original agent deployment (if one existed)
    // after the process finishes.
    const agent = await this.ensureAgent(client, agentId, config);

    for await (const currentUrl of deployment_urls_iter) {
      term('👨‍🍳  Serving agent at ').green(currentUrl)('\n');
      const revision = await agent.createRevision({ externalUrl: currentUrl as string, environmentVariables });
      term('🥡 Revision ').green(revision)(' was deployed to ').green(agent.agentUrl())('\n');
    }
  }
}
