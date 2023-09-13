#!/usr/bin/env node

/**
 * This is a command-line tool to interact with the Fixie platform.
 */

import { Command, program } from 'commander';
import fs from 'fs';
import path from 'path';
import terminal from 'terminal-kit';
import { fileURLToPath } from 'url';
import { FixieAgent } from './agent.js';
import { FixieClient } from './client.js';

const { terminal: term } = terminal;

/** Pretty-print a result as JSON. */
function showResult(result: any, raw: boolean) {
  if (raw) {
    console.log(JSON.stringify(result));
  } else {
    term.green(JSON.stringify(result, null, 2));
  }
}

/** Deploy an agent from the current directory. */
function registerDeployCommand(command: Command) {
  command
    .command('deploy [path]')
    .description('Deploy an agent')
    .option(
      '-e, --env <key=value>',
      'Environment variables to set for this deployment. Variables in a .env file take precedence over those on the command line.',
      (v, m: Record<string, string> | undefined) => {
        const [key, value] = v.split('=');
        return {
          ...m,
          // This condition is necessary; the types are wrong.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          [key]: value ?? '',
        };
      }
    )
    .action(async (path: string | undefined, options: { env: Record<string, string> }) => {
      const client = await FixieClient.Create(program.opts().url);
      await FixieAgent.DeployAgent(client, path ?? process.cwd(), {
        FIXIE_API_URL: program.opts().url,
        ...options.env,
      });
    });
}

/** Run an agent locally. */
function registerServeCommand(command: Command) {
  command
    .command('serve [path]')
    .description('Run an agent locally')
    .option('-p, --port <number>', 'Port to run the agent on', '8181')
    .option(
      '-e, --env <key=value>',
      'Environment variables to set for this agent. Variables in a .env file take precedence over those on the command line.',
      (v, m: Record<string, string> | undefined) => {
        const [key, value] = v.split('=');
        return {
          ...m,
          // This condition is necessary; the types are wrong.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          [key]: value ?? '',
        };
      }
    )
    .action(async (path: string | undefined, options: { port: string; env: Record<string, string> }) => {
      const client = await FixieClient.Create(program.opts().url);
      await FixieAgent.ServeAgent({
        client,
        agentPath: path ?? process.cwd(),
        port: parseInt(options.port),
        tunnel: true,
        environmentVariables: {
          FIXIE_API_URL: program.opts().url,
          ...options.env,
        },
      });
    });
}

// Get current version of this package.
const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(currentPath, path.join('..', '..', 'package.json'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

program
  .name('fixie')
  .version(packageJson.version)
  .description('A command-line client to the Fixie AI platform.')
  .option('-u, --url <string>', 'URL of the Fixie API endpoint', process.env.FIXIE_API_URL ?? 'https://api.fixie.ai')
  .option('-r --raw', 'Output raw JSON instead of pretty-printing.');

program
  .command('user')
  .description('Get information on the current user')
  .action(async () => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.userInfo();
    showResult(result, program.opts().raw);
  });

registerDeployCommand(program);
registerServeCommand(program);

const corpus = program.command('corpus').description('Corpus related commands');

corpus
  .command('list')
  .description('List all corpora.')
  .action(async () => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpora();
    showResult(result, program.opts().raw);
  });

corpus
  .command('get <corpusId>')
  .description('Get information about a corpus.')
  .action(async (corpusId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpus(corpusId);
    showResult(result, program.opts().raw);
  });

corpus
  .command('create [name] [description]')
  .description('Create a corpus.')
  .action(async (name?: string, description?: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.createCorpus(name, description);
    showResult(result, program.opts().raw);
  });

corpus
  .command('query <corpusId> <query>')
  .description('Query a given corpus.')
  .action(async (corpusId: string, query: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.queryCorpus(corpusId, query);
    showResult(result, program.opts().raw);
  });

const sources = corpus.command('sources').description('Corpus source related commands');

sources
  .command('add <corpusId> <startUrls...>')
  .description('Add a source to a corpus.')
  .option('--max-documents <number>', 'Maximum number of documents to crawl')
  .option('--max-depth <number>', 'Maximum depth to crawl')
  .option('--description <string>', 'A human-readable description for the source')
  .action(
    async (
      corpusId: string,
      startUrls: string[],
      { maxDocuments, maxDepth, description }: { maxDocuments?: number; maxDepth?: number, description: string }
    ) => {
      const client = await FixieClient.Create(program.opts().url);
      const result = await client.addCorpusSource(corpusId, startUrls, maxDocuments, maxDepth, description);
      showResult(result, program.opts().raw);
    }
  );

sources
  .command('list <corpusId>')
  .description('List sources of a corpus.')
  .action(async (corpusId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpusSources(corpusId);
    showResult(result, program.opts().raw);
  });

sources
  .command('get <corpusId> <sourceId>')
  .description('Get a source for a corpus.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpusSource(corpusId, sourceId);
    showResult(result, program.opts().raw);
  });

sources
  .command('refresh <corpusId> <sourceId>')
  .description('Refresh a corpus source.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.refreshCorpusSource(corpusId, sourceId);
    showResult(result, program.opts().raw);
  });

const jobs = sources.command('jobs').description('Job-related commands');

jobs
  .command('list <corpusId> <sourceId>')
  .description('List jobs for a given source.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpusSourceJobs(corpusId, sourceId);
    showResult(result, program.opts().raw);
  });

jobs
  .command('get <corpusId> <sourceId> <jobId>')
  .description('Get a job for a source.')
  .action(async (corpusId: string, sourceId: string, jobId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpusSourceJob(corpusId, sourceId, jobId);
    showResult(result, program.opts().raw);
  });

const docs = corpus.command('docs').description('Document-related commands');

docs
  .command('list <corpusId>')
  .description('List documents for a given corpus.')
  .action(async (corpusId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpusDocs(corpusId);
    showResult(result, program.opts().raw);
  });

jobs
  .command('get <corpusId> <docId>')
  .description('Get a document for a corpus.')
  .action(async (corpusId: string, docId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpusDoc(corpusId, docId);
    showResult(result, program.opts().raw);
  });

const agents = program.command('agents').description('Agent related commands');

agents
  .command('list')
  .description('List all agents.')
  .action(async () => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await FixieAgent.ListAgents(client);
    showResult(await Promise.all(result.map((agent) => agent.agentId)), program.opts().raw);
  });

agents
  .command('get <agentId>')
  .description('Get information about the given agent.')
  .action(async (agentId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await FixieAgent.GetAgent(client, agentId);
    showResult(result.metadata, program.opts().raw);
  });

agents
  .command('delete <agentHandle>')
  .description('Delete the given agent.')
  .action(async (agentHandle: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const agent = await FixieAgent.GetAgent(client, agentHandle);
    const result = agent.delete();
    showResult(result, program.opts().raw);
  });

agents
  .command('publish <agentId>')
  .description('Publish the given agent.')
  .action(async (agentHandle: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const agent = await FixieAgent.GetAgent(client, agentHandle);
    const result = agent.update({ published: true });
    showResult(result, program.opts().raw);
  });

agents
  .command('unpublish <agentId>')
  .description('Unpublish the given agent.')
  .action(async (agentHandle: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const agent = await FixieAgent.GetAgent(client, agentHandle);
    const result = agent.update({ published: false });
    showResult(result, program.opts().raw);
  });

agents
  .command('create <agentHandle> [agentName] [agentDescription] [agentMoreInfoUrl]')
  .description('Create an agent.')
  .action(async (agentHandle: string, agentName?: string, agentDescription?: string, agentMoreInfoUrl?: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await FixieAgent.CreateAgent(client, agentHandle, agentName, agentDescription, agentMoreInfoUrl);
    showResult(result.metadata, program.opts().raw);
  });

registerDeployCommand(agents);
registerServeCommand(agents);

const revisions = agents.command('revisions').description('Agent revision-related commands');

revisions
  .command('list <agentId>')
  .description('List all revisions for the given agent.')
  .action(async (agentId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = (await FixieAgent.GetAgent(client, agentId)).metadata.allRevisions;
    showResult(result, program.opts().raw);
  });

revisions
  .command('get <agentId>')
  .description('Get current revision for the given agent.')
  .action(async (agentId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const agent = await FixieAgent.GetAgent(client, agentId);
    const result = await agent.getCurrentRevision();
    showResult(result, program.opts().raw);
  });

revisions
  .command('set <agentId> <revisionId>')
  .description('Set the current revision for the given agent.')
  .action(async (agentId: string, revisionId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const agent = await FixieAgent.GetAgent(client, agentId);
    const result = await agent.setCurrentRevision(revisionId);
    showResult(result, program.opts().raw);
  });

revisions
  .command('delete <agentId> <revisionId>')
  .description('Delete the given revision for the given agent.')
  .action(async (agentId: string, revisionId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const agent = await FixieAgent.GetAgent(client, agentId);
    const result = await agent.deleteRevision(revisionId);
    showResult(result, program.opts().raw);
  });

program.parse(process.argv);
