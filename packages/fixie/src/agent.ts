import { gql } from '@apollo/client/core';

import { FixieClient } from './client.js';

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

/**
 * This class provides an interface to the Fixie Agent API.
 */
export class FixieAgent {
  /** Use GetAgent or CreateAgent instead. */
  private constructor(readonly client: FixieClient, readonly agentId: string, readonly metadata: AgentMetadata) {}

  /** Get the agent with the given agent ID. */
  public static async GetAgent(client: FixieClient, agentId: string): Promise<FixieAgent> {
    // If the agentId contains a /
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
        mutation CreateAgent($handle: String!, $description: String!, $moreInfoUrl: String!) {
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

  delete() {
    const parts = this.agentId.split('/');
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
      variables: { handle: parts[1] },
    });
  }
}
