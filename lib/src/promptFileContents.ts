import * as fs from 'fs';
import * as path from 'path';

import fg from 'fast-glob';
import { isWithinTokenLimit } from 'gpt-tokenizer';

import { PromptFileContentsArgs, PromptFileContentsResponse } from './types';
import { findAllGitIgnorePatterns } from './gitIgnoreToBlob';

/**
 * Given a base dir, describe the files and its contents
 * in a output text in a way that the LLM engine can
 * understand the structure of a workspace.
 * @param {PromptFileContentsArgs} args
 * @returns {PromptFileContentsResponse}
 */
export const promptFileContents = (args: PromptFileContentsArgs): PromptFileContentsResponse => {
  if (!fs.existsSync(args.baseDir)) {
    throw new Error(`Directory ${args.baseDir} does not exist`);
  }

  let fileContentsPrompt = '';

  let { maxFileSize, maxTokens } = args;
  if (typeof maxFileSize === 'undefined') {
    maxFileSize = 20000;
  }
  if (typeof maxTokens === 'undefined') {
    maxTokens = 50000;
  }

  const filesProcessed: string[] = [];
  const filesSkipped: string[] = [];
  const filesTruncated: string[] = [];

  const ignorePatterns = args.ignoreFilePatterns || [];
  if (args.useGitIgnore || typeof args.useGitIgnore === 'undefined') {
    ignorePatterns.push(...findAllGitIgnorePatterns(args.baseDir));
  }

  // load the list of files that will be prompted
  const absFilePatterns = args.filePatterns.map((pattern) => `${args.baseDir}/${pattern}`);
  const entries = fg.sync(absFilePatterns, {
    dot: true,
    ignore: ignorePatterns,
    globstar: true,
    extglob: true,
  });

  // process each file
  for (let i = 0; i < entries.length; i += 1) {
    const fullPath = entries[i];
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      // eslint-disable-next-line no-continue
      continue;
    }

    let contents = fs.readFileSync(fullPath, 'utf8');
    let truncated = false;
    if (contents.length > maxFileSize) {
      contents = contents.substring(0, maxFileSize);
      truncated = true;
    }

    const relativePath = path.relative(args.baseDir, fullPath);

    const filePrompt = `File ${relativePath}: \`\`\`${contents}\`\`\`\n\n`;

    // use this file if we are within the token limit
    if (isWithinTokenLimit(fileContentsPrompt + filePrompt, maxTokens)) {
      filesProcessed.push(relativePath);
      fileContentsPrompt += filePrompt;
      // eslint-disable-next-line max-depth
      if (truncated) {
        filesTruncated.push(relativePath);
      }
      // ignore this file if we reached the token limit
    } else {
      filesSkipped.push(relativePath);
    }
  }

  return {
    fileContentsPrompt,
    filesProcessed,
    filesSkipped,
    filesTruncated,
  };
};
