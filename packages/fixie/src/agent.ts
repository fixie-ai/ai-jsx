import { gql } from '@apollo/client/core';
import yaml from 'js-yaml';
import fs from 'fs';
import terminal from 'terminal-kit';
import { execSync } from 'child_process';

const { terminal: term } = terminal;

import { FixieClient } from './client.js';

/** Represents metadata about an agent managed by the Fixie service. */
export interface AgentMetadata {
  agentId: string;
  handle: string;
  name?: string;
  description?: string;
  moreInfoUrl?: string;
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
}

/**
 * This class provides an interface to the Fixie Agent API.
 */
export class FixieAgent {
  owner: string;
  handle: string;

  /** Use GetAgent or CreateAgent instead. */
  private constructor(readonly client: FixieClient, readonly agentId: string, readonly metadata: AgentMetadata) {
    const parts = agentId.split('/');
    this.owner = parts[0];
    this.handle = parts[1];
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
          allAgents {
            agentId
          }
        }
      `,
    });
    return Promise.all(
      result.data.allAgents.map(async (agent: any) => {
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
    moreInfoUrl?: string
  ): Promise<FixieAgent> {
    const result = await client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgent($handle: String!, $description: String, $moreInfoUrl: String) {
          createAgent(agentData: { handle: $handle, description: $description, moreInfoUrl: $moreInfoUrl }) {
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

  public static LoadConfig(path: string): AgentConfig {
    const config = yaml.load(fs.readFileSync(`${path}/agent.yaml`, 'utf8')) as AgentConfig;
    return config;
  }

  private static getCodePackage(path: string): string {
    // Read the package.json file to get the package name and version.
    const packageJson = JSON.parse(fs.readFileSync(`${path}/package.json`, 'utf8'));

    // Create a temporary directory and run `npm pack` inside.
    const tempdir = fs.mkdtempSync(`fixie-tmp-${packageJson.name}-${packageJson.version}-`);
    const commandline = `npm pack ${path}`;
    execSync(commandline, { cwd: tempdir });
    return `${tempdir}/${packageJson.name}-${packageJson.version}.tgz`;
  }

  private async createRevision(tarball: string) {
    const result = await this.client.gqlClient().mutate({
      mutation: gql`
        mutation CreateAgentRevision($handle: String!, $codePackage: Upload!) {
          createAgentRevision(
            agentHandle: $handle
            revision: { managedDeployment: { environment: NODEJS, codePackage: $codePackage } }
          ) {
            revision {
              id
            }
          }
        }
      `,
      variables: {
        handle: this.handle,
        codePackage: fs.openAsBlob(tarball),
      },
    });

    console.log(result);
  }

  public static async DeployAgent(client: FixieClient, path: string) {
    const config = await FixieAgent.LoadConfig(path);
    const agentId = `${(await client.userInfo()).username}/${config.handle}`;
    term('🦊 Deploying agent ').green(agentId)('...\n');

    // Check if the package.json path exists in this directory.
    if (!fs.existsSync(`${path}/package.json`)) {
      throw Error(`No package.json found in ${path}. Only JS-based agents are supported.`);
    }

    let agent: FixieAgent;
    try {
      agent = await FixieAgent.GetAgent(client, agentId);
    } catch (e) {
      // Try to create the agent instead.
      agent = await FixieAgent.CreateAgent(client, config.handle, config.name, config.description, config.moreInfoUrl);
    }
    console.log(`Got agent ${agent.metadata.agentId}`);

    const tarball = FixieAgent.getCodePackage(path);

    console.log(`Code package is: ${tarball}`);
    agent.createRevision(tarball);
  }
}
