#!/usr/bin/env node
/* eslint-disable no-console */

import path from 'path';

import yargs from 'yargs';
import openai, { OpenAI, AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

import { workspacePromptRunner } from './workspacePromptRunner';

type Args = {
  files: string[];
  preview: string[];
  model: openai.ChatModel;
} & { [key: string]: string };

// Define the command line arguments
// eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-floating-promises
(async (): Promise<void> => {
  await yargs
    .command<Args>(
      'run',
      'Run a task in the context of workspace files and possibly generate new files based on the prompt',
      () => {
        yargs
          .option('task', {
            describe: 'Task to be performed in the context of the workspace files',
            type: 'string',
            demandOption: true,
          })
          .option('workspace', {
            describe: 'Base directory with workspace files',
            type: 'string',
            default: '.',
            demandOption: false,
          })
          .option('files', {
            describe:
              'Regex for file names that will have its full content included in the prompt. e.g. "src/.*\\.ts"',
            type: 'array',
            demandOption: true,
          })
          .option('preview', {
            describe:
              'Regex for file names that will have its partial content included in the prompt',
            type: 'array',
            demandOption: false,
          })
          .option('example', {
            describe:
              'Instruction with an example of the task to be performed, or a path to a file that should be used as an example',
            type: 'string',
            demandOption: false,
          })
          .option('info', {
            describe:
              'General information about the workspace structure, standards, and other relevant information to be included in the prompt',
            type: 'string',
            demandOption: false,
          })
          .option('model', {
            describe:
              'Model to be used. e.g. "chat:gpt-3.5", "chat:gpt-4". If using Azure, must match the custom deployment name you chose for your model',
            type: 'string',
            demandOption: true,
          })
          .option('output', {
            describe: 'Output directory for generated files by the prompt',
            type: 'string',
            default: '.out',
            demandOption: false,
          })
          .option('max-tokens', {
            describe: 'Max number of tokens to send to the API in a single request',
            type: 'string',
            default: '4000',
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

      async (argv) => {
        // openai client configuration
        let openAIClient;

        const apiKey = argv['api-key'];
        const apiAuth = defaultValue(argv['api-auth'], 'apikey');
        if (apiAuth === 'apikey') {
          if (!apiKey) {
            console.log('"api-key" is required when auth is "apikey"');
            process.exit(1);
          }
        }

        const task = defaultValue(argv.task, null);
        const files = defaultValue(argv.files, null);
        const model = defaultValue(argv.model, null);
        const apiProvider = defaultValue(argv['api-provider'], 'openai');

        if (!task) {
          console.log('"task" is required');
          process.exit(1);
        }
        if (!files) {
          console.log('"files" is required');
          process.exit(1);
        }
        if (!model) {
          console.log('"model" is required');
          process.exit(1);
        }
        if (!apiProvider) {
          console.log('"api-provider" is required');
          process.exit(1);
        }

        // Azure provider
        if (argv['api-provider'] === 'azure') {
          let azureADTokenProvider;

          const endpoint = argv['api-url'];
          if (!endpoint) {
            console.log('"api-url" is required when provider is "azure"');
            process.exit(1);
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
            process.exit(1);
          }
          openAIClient = new OpenAI({
            baseURL: argv['api-url'],
            apiKey,
          });
        }

        try {
          // run prompts
          await workspacePromptRunner({
            codePromptGeneratorArgs: {
              taskDescription: task,
              workspaceFiles: {
                baseDir: defaultValue(argv.workspace, '.') as string,
                fullContentsRegexes: files,
                // eslint-disable-next-line no-undefined
                previewContentsRegexes: defaultValue(argv.preview, undefined),
              },
              example: argv.example,
              projectInformation: argv.info,
            },
            openAIClient,
            model,
            maxTokens: parseInt(defaultValue(argv['max-tokens'], '4000') as string, 10),
            outputDir: path.join(process.cwd(), defaultValue(argv.output, '.out') as string),
          });

          // show results
          console.log('Task completed');
        } catch (error) {
          console.error(error);
          process.exit(1);
        }
      },
    )
    .help().argv;
})();

function defaultValue<T>(arg: T | undefined, defaultV: T | undefined): T | undefined {
  // eslint-disable-next-line no-undefined
  const v = arg !== undefined && arg !== null ? arg : defaultV;
  return v;
}
