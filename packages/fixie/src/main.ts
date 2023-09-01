#!/usr/bin/env node

/**
 * This is a command-line tool to interact with the Fixie platform.
 */

import { program } from 'commander';
import terminal from 'terminal-kit';
import { FixieClient } from './client.js';
import { FixieAgent } from './agent.js';

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
async function deployAgent(path?: string) {
  const client = await FixieClient.Create(program.opts().url);
  FixieAgent.DeployAgent(client, path ?? process.cwd());
}

program
  .name('fixie')
  .version('1.0.0')
  .description('A command-line client to the Fixie AI platform.')
  .option('-u, --url <string>', 'URL of the Fixie API endpoint', process.env.FIXIE_API_URL ?? 'https://app.fixie.ai')
  .option('-r --raw', 'Output raw JSON instead of pretty-printing.');

program.command('user').action(async () => {
  const client = await FixieClient.Create(program.opts().url);
  const result = await client.userInfo();
  showResult(result, program.opts().raw);
});

program.command('deploy [path]').action(async (path: string) => {
  await deployAgent(path);
});

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
  .command('create [corpusName]')
  .description('Create a corpus.')
  .action(async (corpusName?: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.createCorpus(corpusName);
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
  .command('add <corpusId> <urlPattern>')
  .description('Add a source to a corpus.')
  .action(async (corpusId: string, urlPattern: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.addCorpusSource(corpusId, urlPattern);
    showResult(result, program.opts().raw);
  });

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
  .command('create <agentHandle> [agentName] [agentDescription] [agentMoreInfoUrl]')
  .description('Create an agent.')
  .action(async (agentHandle: string, agentName?: string, agentDescription?: string, agentMoreInfoUrl?: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await FixieAgent.CreateAgent(client, agentHandle, agentName, agentDescription, agentMoreInfoUrl);
    showResult(result.metadata, program.opts().raw);
  });

program.parse(process.argv);
