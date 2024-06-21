/* eslint-disable complexity */
/* eslint-disable camelcase */
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import openai from 'openai';

import { codePromptGenerator } from './codePromptGenerator';
import { promptFileContents } from './promptFileContents';
import { createOpenAICompletionSession } from './openaiCompletionSession';
import { debug, info, trace } from './progressLog';
import { PromptProcessResult, SendAndProcessPromptArgs, WorkspacePromptRunnerArgs } from './types';
import { defaultValue } from './utils';
import { PromptResponse, parsePromptResponse } from './parsePromptResponse';

/**
 * Generate prompt based on workspace file, send it to OpenAI API, process its response (sometimes it will send additional files as requested by the model) and write any generated files to the output directory
 * @param args {WorkspacePromptRunnerArgs}
 */
export const workspacePromptRunner = async (
  args: WorkspacePromptRunnerArgs,
): Promise<PromptProcessResult> => {
  // generate the code prompt with workspace files
  debug(`Preparing workspace files...`, args.progressLogFunc, args.progressLogLevel);
  const prompt = codePromptGenerator(args.codePromptGeneratorArgs);
  info(
    `Full content files: ${prompt.fullFileContents?.filesProcessed.length}`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  if (prompt.fullFileContents?.filesProcessed) {
    for (let i = 0; i < prompt.fullFileContents?.filesProcessed.length; i += 1) {
      const file = prompt.fullFileContents?.filesProcessed[i];
      debug(`  ${file}`, args.progressLogFunc, args.progressLogLevel);
    }
  }

  if (prompt.fullFileContents && prompt.fullFileContents.filesTruncated.length > 0) {
    info(
      `  ${prompt.fullFileContents?.filesTruncated.length} truncated (max file size)`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    debug(
      `  ${prompt.fullFileContents?.filesTruncated.join('\n  ')}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
  }
  if (prompt.fullFileContents && prompt.fullFileContents.filesSkipped.length > 0) {
    info(
      `  ${prompt.fullFileContents?.filesTruncated.length} skipped (max token limit)`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
  }

  if (prompt.previewFileContents) {
    info(
      `Preview files: ${prompt.previewFileContents?.filesProcessed.length}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    if (prompt.previewFileContents?.filesProcessed) {
      for (let i = 0; i < prompt.previewFileContents?.filesProcessed.length; i += 1) {
        const file = prompt.previewFileContents?.filesProcessed[i];
        debug(`  ${file}`, args.progressLogFunc, args.progressLogLevel);
      }
    }
  }

  const requestedFilesDir =
    args.codePromptGeneratorArgs.workspaceFiles.fullContents?.baseDir ||
    args.codePromptGeneratorArgs.workspaceFiles.previewContents?.baseDir;

  if (!requestedFilesDir) {
    throw new Error(
      'One of args.codePromptGeneratorArgs.workspaceFiles.fullContents or previewContents should be defined',
    );
  }

  return sendAndProcessWorkspacePrompt({
    prompt: prompt.codePrompt,
    requestedFilesDir,
    outputDir: args.outputDir,
    openAIClient: args.openAIClient,
    model: args.model,
    maxTokensPerRequest: args.maxTokensPerRequest,
    maxTokensTotal: args.maxTokensTotal,
    maxPrompts: args.maxPrompts,
    progressLogFunc: args.progressLogFunc,
    progressLogLevel: args.progressLogLevel,
    requestedFilesLimits: {
      maxFileSize: args.codePromptGeneratorArgs.workspaceFiles.fullContents?.maxFileSize,
      maxTokens: args.codePromptGeneratorArgs.workspaceFiles.fullContents?.maxTokens,
      ignoreFilePatterns:
        args.codePromptGeneratorArgs.workspaceFiles.fullContents?.ignoreFilePatterns,
    },
  });
};

/**
 * Send prompt to OpenAI API, process the input and create generated files on output dir
 * @param args {SendAndProcessPromptArgs}
 */
const sendAndProcessWorkspacePrompt = async (
  args: SendAndProcessPromptArgs,
  globalResult?: PromptProcessResult,
): Promise<PromptProcessResult> => {
  let selfOutput = globalResult;
  // initialize output on first call
  if (!selfOutput) {
    selfOutput = {
      generatedFiles: [],
      notes: [],
      stats: {
        promptCounter: 0,
        sessionInputTokens: 0,
        sessionOutputTokens: 0,
      },
    };
  }

  // track how many times additional files were requested
  let additionalFilesCounter = 0;

  let chatSession = args.openAICompletionSession;

  if (!chatSession) {
    chatSession = createOpenAICompletionSession(args.openAIClient, {
      openaiConfig: {
        seed: 0, // make the output more deterministic amongst calls
        temperature: 0.2, // make the output more deterministic amongst calls
        top_p: 1, // default value (we are playing with temperature only)
        model: args.model,
        max_tokens: 4096, // adding this setting made the model more stable in regard to not truncating the output
      },
      maxTokensPerRequest: args.maxTokensPerRequest,
      maxTokensTotal: args.maxTokensTotal,
      maxPrompts: args.maxPrompts,
    });
  }

  info('Sending prompt to model...', args.progressLogFunc, args.progressLogLevel);
  trace(
    `Prompt: 
${args.prompt}`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  const output = await chatSession.sendPrompt(args.prompt);

  trace(
    `Response:
${output.response}`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  info(
    `Model invoked (tokens: in=${output.sessionInputTokens}; out=${output.sessionOutputTokens})`,
    args.progressLogFunc,
    args.progressLogLevel,
  );

  let promptOutput: PromptResponse;
  try {
    promptOutput = parsePromptResponse(output.response);
  } catch (err) {
    debug(
      `Model response could not be parsed. Creating note with response contents`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    promptOutput = {
      header: { count: 1, outcome: 'notes-generated' },
      contents: [
        {
          filename: 'notes.txt',
          size: output.response.length,
          md5: crypto.createHash('md5').update(output.response).digest('hex'),
          md5OK: true,
          relevance: 10,
          motivation: 'content body',
          content: `Model response: ${output.response}`,
        },
      ],
      footer: { hasMoreToGenerate: false },
    };
  }

  // FILES GENERATED
  if (promptOutput.header.outcome === 'files-generated') {
    if (!promptOutput.contents || promptOutput.contents.length === 0) {
      throw new Error('files-generated outcome should have a file list');
    }
    const outputFiles = promptOutput.contents;
    info(`Files generated: ${outputFiles.length}`, args.progressLogFunc, args.progressLogLevel);

    for (let i = 0; i < outputFiles.length; i += 1) {
      const file = outputFiles[i];
      const filePath = path.join(args.outputDir, file.filename);

      info(`  ${file.filename}`);

      if (!file.content) {
        throw new Error('File content should not be empty');
      }

      // create folder if it doesn't exist
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // write file (replace if exists)
      fs.writeFileSync(filePath, file.content);

      if (typeof selfOutput === 'undefined') {
        throw new Error('selfOutput shouldnt be undefined');
      }
      selfOutput.generatedFiles.push(filePath);
    }
    debug(`Saving files to ${args.outputDir}`);

    if (promptOutput.footer.hasMoreToGenerate) {
      info(
        `Asking for additional files to be generated`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
      // request remaining files to be generated
      selfOutput = await sendAndProcessWorkspacePrompt(
        {
          ...args,
          openAICompletionSession: chatSession,
          prompt:
            'generate additional files or source codes. update already generated files if needed.',
        },
        selfOutput,
      );
      return selfOutput;
    }

    // FILES REQUESTED
  } else if (promptOutput.header.outcome === 'files-requested') {
    if (!promptOutput.contents || promptOutput.contents.length === 0) {
      throw new Error('files-requested outcome should have a file list');
    }

    info(
      `Files requested: ${promptOutput.contents.length}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    for (let i = 0; i < promptOutput.contents.length; i += 1) {
      const file = promptOutput.contents[i];
      debug(
        `  ${file.filename} (${file.relevance}) ${file.motivation}`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
    }

    let prompt = '';
    additionalFilesCounter += 1;

    const maxFileRequests = defaultValue(args.requestedFilesLimits.maxFileRequests, 2);

    if (additionalFilesCounter > maxFileRequests) {
      info(
        `Max number of file requests reached, proceeding without additional files`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
    } else {
      const filePatterns = promptOutput.contents
        // .filter((content) => content.relevance && content.relevance >= 5)
        .map((content) => content.filename);

      const requestedFilesPrompt = promptFileContents({
        baseDir: args.requestedFilesDir,
        filePatterns,
        ...args.requestedFilesLimits,
      });

      const missingFiles = promptOutput.contents.filter(
        (item) => !requestedFilesPrompt.filesProcessed.includes(item.filename),
      );

      info(
        `Files provided: ${requestedFilesPrompt.filesProcessed.length}`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
      for (let i = 0; i < missingFiles.length; i += 1) {
        const file = missingFiles[i];
        debug(`  !${file.filename}`, args.progressLogFunc, args.progressLogLevel);
      }

      prompt = requestedFilesPrompt.fileContentsPrompt;
    }

    // if no files were provided or if the max number of requests were reached, proceed without additional files
    if (!prompt) {
      prompt = 'Proceed without additional files';
    }

    selfOutput = await sendAndProcessWorkspacePrompt(
      {
        ...args,
        openAICompletionSession: chatSession,
        prompt,
      },
      selfOutput,
    );
    return selfOutput;
  } else if (promptOutput.header.outcome === 'notes-generated') {
    if (promptOutput.contents) {
      selfOutput.notes.push(...promptOutput.contents.map((content) => content.content));
    }
  } else {
    throw new Error(`Unexpected outcome: ${promptOutput.header.outcome}`);
  }

  const stats = chatSession.stats();
  selfOutput.stats = stats;

  info(`Workspace prompt completed`, args.progressLogFunc, args.progressLogLevel);
  debug(
    ` ${stats.promptCounter} api invocations
 ${stats.sessionInputTokens + stats.sessionInputTokens} tokens total (in: ${
      stats.sessionInputTokens
    }, out: ${stats.sessionOutputTokens})`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  info(
    estimatedCost(args.model, stats.sessionInputTokens, stats.sessionOutputTokens),
    args.progressLogFunc,
    args.progressLogLevel,
  );

  return selfOutput;
};

const costTable: { [model: string]: { in: number; out: number } } = {
  'gpt-4o': { in: 5 / 1000000, out: 15 / 1000000 },
  'gpt-4-turbo': { in: 10 / 1000000, out: 30 / 1000000 },
  'gpt-3.5-turbo-0125': { in: 0.5 / 1000000, out: 1.5 / 1000000 },
};

const estimatedCost = (model: openai.ChatModel, inTokens: number, outTokens: number): string => {
  const costs = costTable[model];
  if (costs) {
    const value = costs.in * inTokens + costs.out * outTokens;
    // round to 6 decimal places
    const valueStr = Math.round(value * 10 ** 6) / 10 ** 6;
    return `Estimated OpenAI cost: ${valueStr} USD`;
  }
  return '';
};
