#!/usr/bin/env node
/* eslint-disable no-console */

import path from 'path';

import yargs from 'yargs';
import { OpenAI, AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

import { workspacePromptRunner } from './workspacePromptRunner';

// Define the command line arguments
// eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-floating-promises
export const run = async (processArgs: string[]): Promise<number> => {
  // prepare cli arguments parser
  const yargs2 = yargs(processArgs.slice(2))
    .scriptName('co-coder')
    .command(
      'run',
      'Run a task in the context of workspace files and possibly generate new files based on the prompt',
      () => {
        yargs
          .option('task', {
            alias: 't',
            describe: 'Task to be performed in the context of the workspace files',
            type: 'string',
            demandOption: false,
          })
          .option('workspace', {
            alias: 'w',
            describe: 'Base directory with workspace files',
            type: 'string',
            default: '.',
            demandOption: false,
          })
          .option('files', {
            alias: 'f',
            describe:
              'Regex for file names that will have its full content included in the prompt. e.g. "src/.*\\.ts"',
            type: 'array',
            demandOption: false,
          })
          .option('files-ignore', {
            alias: 'fi',
            describe: 'Regex for file names that will never be used. Defaults to "node_modules"',
            type: 'array',
            demandOption: false,
          })
          .option('preview', {
            alias: 'p',
            describe:
              'Regex for file names that will have its partial content included in the prompt',
            type: 'array',
            demandOption: false,
          })
          .option('example', {
            alias: 'e',
            describe:
              'Instruction with an example of the task to be performed, or a path to a file that should be used as an example',
            type: 'string',
            demandOption: false,
          })
          .option('info', {
            alias: 'i',
            describe:
              'General information about the workspace structure, standards, and other relevant information to be included in the prompt',
            type: 'string',
            demandOption: false,
          })
          .option('model', {
            alias: 'm',
            describe:
              'Model to be used. e.g. "gpt-4o", "gpt-3.5-turbo-0125". If using Azure, must match the custom deployment name you chose for your model',
            type: 'string',
            demandOption: false,
          })
          .option('output', {
            alias: 'o',
            describe: 'Output directory for generated files by the prompt',
            type: 'string',
            default: '.out',
            demandOption: false,
          })
          .option('max-tokens-total', {
            alias: 'tt',
            describe: 'Max number of tokens allowed to be used in total for the task',
            type: 'string',
            default: '6000',
            demandOption: false,
          })
          .option('max-tokens-per-request', {
            alias: 'tr',
            describe: 'Max number of tokens to send to the API in a single request',
            type: 'string',
            default: '128000',
            demandOption: false,
          })
          .option('max-tokens-files', {
            alias: 'tf',
            describe: 'Max number of tokens to spend with sending files',
            type: 'string',
            default: '5000',
            demandOption: false,
          })
          .option('max-file-size', {
            alias: 'fm',
            describe: 'Max file size. Files larger than this will be truncated',
            type: 'string',
            default: '10000',
            demandOption: false,
          })
          .option('api-provider', {
            describe: 'API provider. One of "openai" or "azure"',
            type: 'string',
            default: 'openai',
            demandOption: false,
          })
          .option('api-url', {
            describe:
              'API url. e.g. "https://localhost:1234". If using Azure, it\'s required to use the endpoint URL from Azure',
            type: 'string',
            demandOption: false,
          })
          .option('api-auth', {
            describe: 'API auth method. One of "token" or "apikey"',
            type: 'string',
            default: 'apikey',
            demandOption: false,
          })
          .option('api-key', {
            describe: 'OpenAI API key',
            type: 'string',
            demandOption: false,
          })
          .option('api-azure-version', {
            describe: 'Azure API version. Required when using Azure provider',
            type: 'string',
            default: '2024-02-01',
            demandOption: false,
          });
      },
    )
    .help()
    .example(
      'co-coder run --task "fix any bugs in these files" --files "src/.*\\.ts" --model "gpt-3.5-turbo-0125"',
      'Fix bugs in all typescript codes in the "src" directory',
    );

  // execute commands
  const args2 = yargs2.parseSync();
  const action = <string>args2._[0];
  if (action !== 'run') {
    console.log(`${await yargs2.getHelp()}`);
    return 1;
  }
  return runWorkspacePrompt(args2);
};

const runWorkspacePrompt = async (argv: any): Promise<number> => {
  // openai client configuration
  let openAIClient;

  const apiKey = argv['api-key'];
  const apiAuth = defaultValue(argv['api-auth'], 'apikey');
  if (apiAuth === 'apikey') {
    if (!apiKey) {
      console.log('"api-key" is required when auth is "apikey"');
      return 1;
    }
  }

  const task = defaultValue(argv.task, null);

  const filesIgnore = defaultValue(argv['files-ignore'], ['node_modules']);
  const fullFiles = defaultValue(argv.files, null);
  const previewFiles = defaultValue(argv.preview, null);

  const model = defaultValue(argv.model, null);
  const apiProvider = defaultValue(argv['api-provider'], 'openai');

  const maxFileSize = defaultValue(argv['max-file-size'], 10000);
  const maxTokensTotal = defaultValue(argv['max-tokens-total'], 6000);
  const maxTokensFile = defaultValue(argv['max-tokens-file'], 5000);
  const maxTokensPerRequest = defaultValue(argv['max-tokens-per-request'], 128000);

  if (!task) {
    console.log('"task" is required');
    return 1;
  }
  if (!fullFiles) {
    console.log('"files" is required');
    return 1;
  }
  if (!model) {
    console.log('"model" is required');
    return 1;
  }
  if (!apiProvider) {
    console.log('"api-provider" is required');
    return 1;
  }

  // Azure provider
  if (argv['api-provider'] === 'azure') {
    let azureADTokenProvider;

    const endpoint = argv['api-url'];
    if (!endpoint) {
      console.log('"api-url" is required when provider is "azure"');
      return 1;
    }

    if (apiAuth === 'token') {
      azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://cognitiveservices.azure.com/.default',
      );
    }

    openAIClient = new AzureOpenAI({
      deployment: model,
      endpoint,
      apiVersion: defaultValue(argv['api-azure-version'], '2024-02-01'),
      apiKey,
      azureADTokenProvider,
    });

    // OpenAI provider
  } else {
    if (!apiKey) {
      console.log('"api.apikey" is required when provider is "openai"');
      return 1;
    }
    openAIClient = new OpenAI({
      baseURL: argv['api-url'],
      apiKey,
    });
  }

  // run prompts
  const result = await workspacePromptRunner({
    codePromptGeneratorArgs: {
      taskDescription: task,
      workspaceFiles: {
        fullContents: {
          baseDir: defaultValue(argv.workspace, '.') as string,
          filenameRegexes: fullFiles,
          ignoreFilenameRegexes: filesIgnore,
          maxFileSize,
          maxTokens: maxTokensFile,
        },
        previewContents: {
          baseDir: defaultValue(argv.workspace, '.') as string,
          filenameRegexes: previewFiles,
          ignoreFilenameRegexes: filesIgnore,
          maxFileSize,
          maxTokens: maxTokensFile,
        },
      },
      example: argv.example,
      projectInformation: argv.info,
    },
    openAIClient,
    model,
    maxTokensTotal,
    maxTokensPerRequest,
    requestedFilesLimits: {
      maxFileSize,
      maxTokens: maxTokensFile,
      ignoreFilenameRegexes: filesIgnore,
    },
    outputDir: path.join(process.cwd(), defaultValue(argv.output, '.out') as string),
    progressLogLevel: 'trace',
    progressLogFunc: console.log,
  });

  // show results
  if (result.generatedFiles && result.generatedFiles.length === 0) {
    console.log('No files generated');
  } else {
    console.log(`${result.generatedFiles.length} files generated`);
  }

  if (result.notes && result.notes.length > 0) {
    console.log('Notes from model:');
    for (let i = 0; i < result.notes.length; i += 1) {
      const note = result.notes[i];
      console.log(` - ${note}`);
    }
  }

  return 0;
};

function defaultValue<T>(arg: T | undefined, defaultV: T | undefined): T | undefined {
  // eslint-disable-next-line no-undefined
  const v = arg !== undefined && arg !== null ? arg : defaultV;
  return v;
}
