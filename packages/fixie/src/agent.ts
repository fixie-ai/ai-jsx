import { gql } from '@apollo/client/core/index.js';
import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import { execSync } from 'child_process';
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
  private async createRevision(tarball: string, environmentVariables: Record<string, string>): Promise<string> {
    const uploadFile = fs.readFileSync(fs.realpathSync(tarball));

    const result = await this.client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgentRevision(
          $handle: String!
          $codePackage: Upload!
          $environmentVariables: [EnvironmentVariableInput!]
        ) {
          createAgentRevision(
            agentHandle: $handle
            revision: {
              managedDeployment: {
                environment: NODEJS
                codePackage: $codePackage
                environmentVariables: $environmentVariables
              }
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
        codePackage: new Blob([uploadFile], { type: 'application/gzip' }),
        environmentVariables: Object.entries(environmentVariables).map(([key, value]) => ({ name: key, value })),
      },
      fetchPolicy: 'no-cache',
    });

    return result.data.createAgentRevision.revision.id;
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

    // Check if the package.json path exists in this directory.
    if (!fs.existsSync(`${agentPath}/package.json`)) {
      throw Error(`No package.json found in ${agentPath}. Only JS-based agents are supported.`);
    }

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
    const tarball = FixieAgent.getCodePackage(agentPath);
    const spinner = ora(' 🚀 Deploying...').start();
    const revision = await agent.createRevision(tarball, environmentVariables);
    spinner.succeed(`Revision ${revision} was deployed to ${agent.agentUrl()}`);
    return revision;
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
}
