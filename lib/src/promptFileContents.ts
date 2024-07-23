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
  if (!path.isAbsolute(args.baseDir)) {
    throw new Error(`baseDir (${args.baseDir}) must be an absolute path`);
  }
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
  let { maxNumberOfFiles } = args;
  if (typeof maxNumberOfFiles === 'undefined') {
    maxNumberOfFiles = 10;
  }

  const filesProcessed: string[] = [];
  const filesSkipped: string[] = [];
  const filesTruncated: string[] = [];

  const ignorePatterns = args.ignoreFilePatterns || [];
  if (args.useGitIgnore || typeof args.useGitIgnore === 'undefined') {
    // eslint-disable-next-line no-console
    console.log(`>>>>> USING GITIGNORE ${args.useGitIgnore}`);
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

    if (
      // use this file if we are within the token limit
      isWithinTokenLimit(fileContentsPrompt + filePrompt, maxTokens) &&
      // and number of files limit
      i < maxNumberOfFiles
    ) {
      filesProcessed.push(relativePath);
      fileContentsPrompt += filePrompt;
      // eslint-disable-next-line max-depth
      if (truncated) {
        filesTruncated.push(relativePath);
      }
      // ignore this file if we reached the token limit
    } else {
      if (i >= maxNumberOfFiles) {
        // TODO evolve logger lib and pass it as a parameter
        // eslint-disable-next-line no-console
        console.log(
          `Skipping file due to max files limit (limit=${maxNumberOfFiles}; file=${relativePath})`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`Skipping file due to token limit (max=${maxTokens}; file=${relativePath})`);
      }
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
