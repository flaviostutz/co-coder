/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

import { encode, isWithinTokenLimit } from 'gpt-tokenizer';

export type PromptFileContentsArgs = {
  /**
   * Base directory where the workspace files are located
   * @required
   */
  baseDir: string;
  /**
   * Regexes to filter files and get their full contents.
   * It will be used to get the full contents of the files to be sent to the OpenAI API.
   * @required
   */
  fullContentsRegexes?: string[];
  /**
   * Maximum individual file size to be included in the prompt for full files. Larger files will be truncated. Defaults to 4000
   */
  fullContentsMaxFileSize?: number;
  /**
   * Regexes to filter files and get a preview of their contents.
   * It will be used to get a preview of the files to be sent to the OpenAI API.
   */
  previewContentsRegexes?: string[];
  /**
   * Preview contents max file size. Larger files will be truncated. Defaults to 400
   */
  previewContentsMaxFileSize?: number;
  /**
   * Fail if the total file contents being discovered reaches this number of tokens
   * This is a safety measure to prevent sending too much data to the API that will be ignored anyway
   * Defaults to 128000 tokens
   */
  maxContentTokens?: number;
};

export type PromptFileContentsResponse = {
  /**
   * Full contents of the files that matched the regexes
   */
  fullFileContents: string;
  /**
   * Preview contents of the files that matched the regexes
   */
  previewFileContents: string;
};

/**
 * Given a base dir, describe the files and its contents
 * in a output text in a way that the LLM engine can
 * understand the structure of a workspace.
 * @param baseDir root dir
 * @param filesRegexArray array of regex to filter files. if not provided, all files will be considered
 * @param maxFileSize maximum individual file size to be included in the prompt. Larger files will be truncated. Defaults to 1000
 */
export const promptFileContents = (args: PromptFileContentsArgs): PromptFileContentsResponse => {
  if (!fs.existsSync(args.baseDir)) {
    throw new Error(`Directory ${args.baseDir} does not exist`);
  }

  let outputFullContents = '';
  let outputPreviewContents = '';

  const traverseDirectory = (dirPath: string): void => {
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(args.baseDir, fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (stat.isFile()) {
        // full file contents
        if (args.fullContentsRegexes) {
          const fileRegexMatch = args.fullContentsRegexes.some((regex) =>
            new RegExp(regex).test(relativePath),
          );
          if (fileRegexMatch) {
            let contents = fs.readFileSync(fullPath, 'utf8');
            if (args.fullContentsMaxFileSize && contents.length > args.fullContentsMaxFileSize) {
              console.log(`Truncating file ${fullPath}: too large`);
              contents = contents.substring(0, args.fullContentsMaxFileSize);
            }
            outputFullContents += `File ${relativePath}: \`\`\`${contents}\`\`\`\n\n`;
          }
        }

        // preview file contents
        if (args.previewContentsRegexes) {
          const fileRegexMatch = args.previewContentsRegexes.some((regex) =>
            new RegExp(regex).test(relativePath),
          );
          if (fileRegexMatch) {
            let contents = fs.readFileSync(fullPath, 'utf8');
            if (
              args.previewContentsMaxFileSize &&
              contents.length > args.previewContentsMaxFileSize
            ) {
              contents = contents.substring(0, args.previewContentsMaxFileSize);
            }
            outputPreviewContents += `File ${relativePath}: \`\`\`${contents}\`\`\`\n\n`;
          }
        }
      }
    });
  };

  traverseDirectory(args.baseDir);

  return { fullFileContents: outputFullContents, previewFileContents: outputPreviewContents };
};
