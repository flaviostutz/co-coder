import path from 'path';
import fs from 'fs';

import fg from 'fast-glob';

/**
 * Merge gitignore files from the current directory to the root directory
 * and return absolute patterns to be used by blobs matchers
 * @param rootDir root directory when the search should stop
 * @param currentDir initial directory to do the search
 * @returns List of absolute gitignore patterns to ignore
 */
export const gitIgnoreToBlob = (rootDir: string, currentDir: string): string[] => {
  if (currentDir.indexOf(rootDir) === -1) {
    throw new Error('currentDir is not a subdirectory of the root directory');
  }
  const stat = fs.statSync(currentDir);
  if (!stat.isDirectory()) {
    throw new Error('currentDir is not a directory');
  }

  let patterns: string[] = [];
  let currentPath = currentDir;

  // eslint-disable-next-line no-constant-condition
  // find and merge all gitignore patterns from the current directory to the root directory
  while (true) {
    const gitIgnorePath = path.join(currentPath, '.gitignore');

    // read gitignore file statements
    if (fs.existsSync(gitIgnorePath)) {
      const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
      const lines = gitIgnoreContent.split('\n');

      // prepare patterns to have absolute paths
      const absLines = lines
        .filter((elem) => {
          return elem.trim().length > 0 && !elem.trim().startsWith('#');
        })
        .map((elem) => {
          if (elem.startsWith('/')) {
            return elem.substring(1);
          }
          return elem;
        })
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        .map((elem) => {
          return `${currentPath}/**/${elem}/**`;
        });

      patterns = [...patterns, ...absLines];
    }

    // stop if we reached the root directory
    if (currentPath === rootDir || path.parse(currentPath).root === currentPath) {
      break;
    }

    // go up one level
    currentPath = path.dirname(currentPath);
  }

  return patterns;
};

/**
 * Find all ignore patterns from the baseDir up to all children directories
 * It will look for all .gitignore files and merge all patterns found
 * @param {string} baseDir Dir to start the search
 * @returns {string[]} Blob pattern list with absolute paths
 */
export const findAllGitIgnorePatterns = (baseDir: string): string[] => {
  // find all .gitignore files from baseDir up
  const rootIgnorePatterns = gitIgnoreToBlob(baseDir, baseDir);
  const gitIgnoreEntries = fg.sync(`${baseDir}/**/.gitignore`, {
    dot: true,
    ignore: rootIgnorePatterns,
    globstar: true,
    extglob: true,
  });

  // merge all gitignore files patterns
  let ignorePatterns: string[] = [];
  for (let i = 0; i < gitIgnoreEntries.length; i += 1) {
    const gitIgnorePath = gitIgnoreEntries[i];
    ignorePatterns.push(...gitIgnoreToBlob(baseDir, path.dirname(gitIgnorePath)));
  }
  // remove duplicated ignore patterns
  ignorePatterns = [...new Set(ignorePatterns)];

  return ignorePatterns;
};
