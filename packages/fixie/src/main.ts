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
import { AuthenticateOrLogIn, FIXIE_CONFIG_FILE, loadConfig } from './auth.js';

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
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
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
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
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

registerDeployCommand(program);
registerServeCommand(program);

program
  .command('user')
  .description('Get information on the current user')
  .action(async () => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.userInfo();
    showResult(result, program.opts().raw);
  });

program
  .command('auth')
  .description('Authenticate to the Fixie service')
  .option('--force', 'Force reauthentication.')
  .option('--show-key', 'Show Fixie API key in full.')
  .action(async (options: { force?: boolean; showKey?: boolean }) => {
    const client = await AuthenticateOrLogIn({ forceReauth: options.force ?? false });
    const userInfo = await client.userInfo();
    term('👤 You are logged into ').green(client.url)(' as ').green(userInfo.username)('\n');
    if (options.showKey) {
      term('🔑 Your FIXIE_API_KEY is: ').red(client.apiKey)('\n');
    } else {
      // Truncate the key.
      term('🔑 Your FIXIE_API_KEY is: ').red(`${client.apiKey?.slice(0, 12)}...`)('\n');
    }
  });

const config = program.command('config').description('Configuration related commands');
config
  .command('show')
  .description('Show current config.')
  .action(() => {
    const config = loadConfig(FIXIE_CONFIG_FILE);
    showResult(config, program.opts().raw);
  });

const corpus = program.command('corpus').description('Corpus related commands');
corpus.alias('corpora');

corpus
  .command('list')
  .description('List all corpora.')
  .action(async () => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.listCorpora();
    showResult(result, program.opts().raw);
  });

corpus
  .command('get <corpusId>')
  .description('Get information about a corpus.')
  .action(async (corpusId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.getCorpus(corpusId);
    showResult(result, program.opts().raw);
  });

corpus
  .command('create [name] [description]')
  .description('Create a corpus.')
  .action(async (name?: string, description?: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.createCorpus(name, description);
    showResult(result, program.opts().raw);
  });

corpus
  .command('query <corpusId> <query>')
  .description('Query a given corpus.')
  .action(async (corpusId: string, query: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.queryCorpus(corpusId, query);
    showResult(result, program.opts().raw);
  });

const source = corpus.command('source').description('Corpus source related commands');
source.alias('sources');

source
  .command('add <corpusId> <startUrls...>')
  .description('Add a web source to a corpus.')
  .option('--max-documents <number>', 'Maximum number of documents to crawl')
  .option('--max-depth <number>', 'Maximum depth to crawl')
  .option('--include-patterns <pattern...>', 'URL patterns to include in the crawl')
  .option('--exclude-patterns <pattern...>', 'URL patterns to exclude from the crawl')
  .action(
    async (
      corpusId: string,
      startUrls: string[],
      {
        maxDocuments,
        maxDepth,
        includePatterns,
        excludePatterns,
      }: { maxDocuments?: number; maxDepth?: number; includePatterns?: string[]; excludePatterns?: string[] }
    ) => {
      if (!includePatterns) {
        term.yellow('Warning: ')(
          'No --include-patterns specfied. This is equivalent to only crawling the URLs specified as startUrls.\n'
        );
        term.yellow('Warning: ')('Use ').red("--include-patterns '*'")(
          ' if you want to allow all URLs in the crawl.\n'
        );
      }
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.addCorpusSource(
        corpusId,
        startUrls,
        includePatterns,
        excludePatterns,
        maxDocuments,
        maxDepth
      );
      showResult(result, program.opts().raw);
    }
  );

source
  .command('upload <corpusId> <mimeType> <filenames...>')
  .description('Upload local files to a corpus.')
  .action(async (corpusId: string, mimeType: string, filenames: string[]) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.addFileCorpusSource(corpusId, filenames, mimeType);
    showResult(result, program.opts().raw);
  });

source
  .command('list <corpusId>')
  .description('List sources of a corpus.')
  .action(async (corpusId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.listCorpusSources(corpusId);
    showResult(result, program.opts().raw);
  });

source
  .command('get <corpusId> <sourceId>')
  .description('Get a source for a corpus.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.getCorpusSource(corpusId, sourceId);
    showResult(result, program.opts().raw);
  });

source
  .command('refresh <corpusId> <sourceId>')
  .description('Refresh a corpus source.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.refreshCorpusSource(corpusId, sourceId);
    showResult(result, program.opts().raw);
  });

const job = source.command('job').description('Job-related commands');
job.alias('jobs');

job
  .command('list <corpusId> <sourceId>')
  .description('List jobs for a given source.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.listCorpusSourceJobs(corpusId, sourceId);
    showResult(result, program.opts().raw);
  });

job
  .command('get <corpusId> <sourceId> <jobId>')
  .description('Get a job for a source.')
  .action(async (corpusId: string, sourceId: string, jobId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.getCorpusSourceJob(corpusId, sourceId, jobId);
    showResult(result, program.opts().raw);
  });

const doc = corpus.command('doc').description('Document-related commands');
doc.alias('docs');

doc
  .command('list <corpusId>')
  .description('List documents for a given corpus.')
  .action(async (corpusId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.listCorpusDocs(corpusId);
    showResult(result, program.opts().raw);
  });

doc
  .command('get <corpusId> <docId>')
  .description('Get a document for a corpus.')
  .action(async (corpusId: string, docId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await client.getCorpusDoc(corpusId, docId);
    showResult(result, program.opts().raw);
  });

const agent = program.command('agent').description('Agent related commands');
agent.alias('agents');

agent
  .command('list')
  .description('List all agents.')
  .action(async () => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await FixieAgent.ListAgents(client);
    showResult(await Promise.all(result.map((agent) => agent.agentId)), program.opts().raw);
  });

agent
  .command('get <agentId>')
  .description('Get information about the given agent.')
  .action(async (agentId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await FixieAgent.GetAgent(client, agentId);
    showResult(result.metadata, program.opts().raw);
  });

agent
  .command('delete <agentHandle>')
  .description('Delete the given agent.')
  .action(async (agentHandle: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const agent = await FixieAgent.GetAgent(client, agentHandle);
    const result = agent.delete();
    showResult(result, program.opts().raw);
  });

agent
  .command('publish <agentId>')
  .description('Publish the given agent.')
  .action(async (agentHandle: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const agent = await FixieAgent.GetAgent(client, agentHandle);
    const result = agent.update({ published: true });
    showResult(result, program.opts().raw);
  });

agent
  .command('unpublish <agentId>')
  .description('Unpublish the given agent.')
  .action(async (agentHandle: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const agent = await FixieAgent.GetAgent(client, agentHandle);
    const result = agent.update({ published: false });
    showResult(result, program.opts().raw);
  });

agent
  .command('create <agentHandle> [agentName] [agentDescription] [agentMoreInfoUrl]')
  .description('Create an agent.')
  .action(async (agentHandle: string, agentName?: string, agentDescription?: string, agentMoreInfoUrl?: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = await FixieAgent.CreateAgent(client, agentHandle, agentName, agentDescription, agentMoreInfoUrl);
    showResult(result.metadata, program.opts().raw);
  });

registerDeployCommand(agent);
registerServeCommand(agent);

const revision = agent.command('revision').description('Agent revision-related commands');
revision.alias('revisions');

revision
  .command('list <agentId>')
  .description('List all revisions for the given agent.')
  .action(async (agentId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const result = (await FixieAgent.GetAgent(client, agentId)).metadata.allRevisions;
    showResult(result, program.opts().raw);
  });

revision
  .command('get <agentId>')
  .description('Get current revision for the given agent.')
  .action(async (agentId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const agent = await FixieAgent.GetAgent(client, agentId);
    const result = await agent.getCurrentRevision();
    showResult(result, program.opts().raw);
  });

revision
  .command('set <agentId> <revisionId>')
  .description('Set the current revision for the given agent.')
  .action(async (agentId: string, revisionId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const agent = await FixieAgent.GetAgent(client, agentId);
    const result = await agent.setCurrentRevision(revisionId);
    showResult(result, program.opts().raw);
  });

revision
  .command('delete <agentId> <revisionId>')
  .description('Delete the given revision for the given agent.')
  .action(async (agentId: string, revisionId: string) => {
    const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
    const agent = await FixieAgent.GetAgent(client, agentId);
    const result = await agent.deleteRevision(revisionId);
    showResult(result, program.opts().raw);
  });

program.parse(process.argv);
