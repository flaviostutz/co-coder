/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Given a base dir, describe the files and its contents
 * in a output text in a way that LLM engines can
 * understand the structure of a workspace.
 * @param baseDir root dir
 * @param filesRegexArray array of regex to filter files. if not provided, all files will be considered
 */
export const promptFileContents = (
  baseDir: string,
  filesRegexes: string[] = [],
  maxFileSize?: number,
): string => {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Directory ${baseDir} does not exist`);
  }

  let output = '';

  const traverseDirectory = (dirPath: string): void => {
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (stat.isFile()) {
        const fileRegexMatch = filesRegexes.some((regex) => new RegExp(regex).test(fullPath));
        const fileSizeOk = !maxFileSize || stat.size <= maxFileSize;
        if (!fileSizeOk) console.log(`Skipping file ${fullPath}: too large`);
        if (fileRegexMatch && fileSizeOk) {
          const contents = fs.readFileSync(fullPath, 'utf8');
          output += `File: ${fullPath}: \`\`\`${contents}\`\`\`\n\n`;
        }
      }
    });
  };

  traverseDirectory(baseDir);

  return output;
};
