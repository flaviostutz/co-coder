/* eslint-disable camelcase */
import path from 'path';
import fs from 'fs';

import { codePromptGenerator } from './codePromptGenerator';
import { debug, info } from './progressLog';
import {
  CodePromptGeneratorResponse,
  PromptProcessResult,
  WorkspacePromptRunnerArgs,
} from './types';
import { sendAndProcessWorkspacePrompt } from './sendAndProcessWorkspacePrompt';
import { createOpenAICompletionSession } from './openaiCompletionSession';
import { defaultValue } from './utils';

/**
 * Generate prompt based on workspace file, send it to OpenAI API, process its response (sometimes it will send additional files as requested by the model) and write any generated files to the output directory
 * @param args {WorkspacePromptRunnerArgs}
 */
export const workspacePromptRunner = async (
  args: WorkspacePromptRunnerArgs,
): Promise<PromptProcessResult> => {
  if (!args.outputDir) {
    throw new Error("'outputDir' is required");
  }
  const { requestedFilesDir } = args;

  if (!requestedFilesDir) {
    throw new Error(`'requestedFilesDir' is required`);
  }
  if (!path.isAbsolute(requestedFilesDir)) {
    throw new Error(`'requestedFilesDir' should be an absolute path. value="${requestedFilesDir}"`);
  }

  if (args.conversationFile) {
    if (!path.isAbsolute(args.conversationFile)) {
      throw new Error(
        `'args.conversationFile' should be an absolute path. value="${args.conversationFile}"`,
      );
    }
  }

  // completion session
  const openAICompletionSession = createOpenAICompletionSession(args.openAIClient, {
    openaiConfig: {
      seed: 0, // make the output more deterministic amongst calls
      temperature: 0, // make the output more deterministic amongst calls
      top_p: 1, // default value (we are playing with temperature only)
      model: args.model,
      max_tokens: 4096, // adding this setting made the model more stable in regard to not truncating the output
    },
    maxTokensPerRequest: args.maxTokensPerRequest,
    maxTokensTotal: args.maxTokensTotal,
    maxPrompts: args.maxPrompts,
  });

  let firstPrompt = true;
  if (args.conversationFile) {
    if (fs.existsSync(args.conversationFile)) {
      openAICompletionSession.loadConversation(args.conversationFile);
      firstPrompt = false;
      info(
        `Continuing previous conversation (size: ${
          openAICompletionSession.getConversation().length
        })`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
    }
  }

  // generate the code prompt with workspace files
  info(`Preparing workspace files...`, args.progressLogFunc, args.progressLogLevel);
  const prompt = codePromptGenerator(firstPrompt, args.promptGenerator);
  logResults(prompt, args);

  const runResults = await sendAndProcessWorkspacePrompt({
    ...args,
    prompt: prompt.codePrompt,
    requestedFilesDir,
    openAICompletionSession,
    requestedFilesLimits: {
      maxFileSize: args.promptGenerator.workspaceFiles?.fullContents?.maxFileSize,
      maxTokens: args.promptGenerator.workspaceFiles?.fullContents?.maxTokens,
      useGitIgnore: args.promptGenerator.workspaceFiles?.fullContents?.useGitIgnore,
      maxNumberOfRequestedFiles: args.requestedFilesLimits?.maxNumberOfRequestedFiles,
      ignoreFilePatterns: args.promptGenerator.workspaceFiles?.fullContents?.ignoreFilePatterns,
    },
  });

  const saveConversation = defaultValue(args.conversationSave, true);
  if (saveConversation && args.conversationFile) {
    let { conversationFile } = args;
    if (!path.isAbsolute(conversationFile)) {
      conversationFile = path.join(args.outputDir, args.conversationFile);
    }
    info(
      `Saving conversation to ${path.dirname(args.outputDir)}${conversationFile.replace(
        args.outputDir,
        '',
      )}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    openAICompletionSession.saveConversation(conversationFile);
  }

  return runResults;
};

const logResults = (prompt: CodePromptGeneratorResponse, args: WorkspacePromptRunnerArgs): void => {
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
      `  ${prompt.fullFileContents?.filesTruncated.length} skipped (max files/token limit)`,
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
};
