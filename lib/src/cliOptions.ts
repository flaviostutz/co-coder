import { Argv } from 'yargs';

export const cliOptions = (y: Argv): Argv => {
  const y1 = y
    .option('base-dir', {
      alias: 'b',
      describe: 'Base directory with workspace files',
      type: 'string',
      default: '.',
      demandOption: false,
    })
    .option('files', {
      alias: 'f',
      describe:
        'Blob patterns for file names that will have its full content included in the prompt. e.g. "src/**/*.ts,**/*.json"',
      type: 'string',
      demandOption: false,
    })
    .option('files-ignore', {
      alias: 'fi',
      describe: 'Blob patterns for file names that will never be used. e.g "**/*.test.ts,**/*.md"',
      type: 'string',
      demandOption: false,
    })
    .option('preview', {
      alias: 'p',
      describe:
        'Blob patterns for file names that will have its partial content included in the prompt. e.g. "docs/**/*.md"',
      type: 'string',
      demandOption: false,
    })
    .option('preview-size', {
      alias: 'ps',
      describe:
        'Max size of contents for the preview files. If "0", only the file name will be included in the prompt',
      type: 'number',
      default: 0,
      demandOption: false,
    })
    .option('use-gitignore', {
      alias: 'gi',
      describe: 'Ignore files that are in .gitignore',
      type: 'array',
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
    .option('conversation-file', {
      alias: 'cf',
      describe:
        'File to save conversation history to. Maybe be a relative path (to output dir), or absolute',
      type: 'string',
      default: '',
      demandOption: false,
    })
    .option('conversation-save', {
      alias: 'cs',
      describe:
        'If conversation-file is defined, save the history or not. Defaults to true. If false, it will only load the conversation history from the file, but not save it back after the prompts are run',
      type: 'boolean',
      default: '',
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
      alias: 'fs',
      describe: 'Max file size. Files larger than this will be truncated',
      type: 'string',
      default: '10000',
      demandOption: false,
    })
    .option('max-file-requests', {
      alias: 'fr',
      describe: 'Max number of additional files that can be sent to the model',
      type: 'number',
      default: 10,
      demandOption: false,
    })
    .option('max-prompts', {
      alias: 'pm',
      describe: 'Max number of prompt requests allowed to be sent to the model for the task',
      type: 'number',
      default: 20,
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
    })
    .option('log', {
      describe: 'Log level. One of "trace", "debug", "info", "off"',
      type: 'string',
      default: 'info',
      demandOption: false,
    })
    .option('task', {
      alias: 't',
      describe: 'Task to be performed in the context of the workspace files',
      type: 'string',
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
    });

  return y1;
};
