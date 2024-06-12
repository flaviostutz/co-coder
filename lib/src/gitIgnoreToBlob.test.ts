import fs from 'fs';
import path from 'path';
import os from 'os';

import { findAllGitIgnorePatterns, gitIgnoreToBlob } from './gitIgnoreToBlob';

describe('mergeGitIgnorePatternsAbsolute', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitignore-test-'));

    // Setup directory structure and .gitignore files
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir);
    fs.writeFileSync(path.join(projectDir, '.gitignore'), 'node_modules\n');

    const srcDir = path.join(projectDir, 'src', 'another');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, '.gitignore'), 'dist\n');

    const srcDir2 = path.join(projectDir, 'src', 'another2');
    fs.mkdirSync(srcDir2, { recursive: true });
    fs.writeFileSync(path.join(srcDir2, '.gitignore'), 'dist2\n');
  });

  afterEach(() => {
    // Remove the temporary directory and its contents
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws if currentDir is not a subdirectory of rootDir', () => {
    // Use actual directories for the test
    expect(() => gitIgnoreToBlob('/anotherRoot', tempDir)).toThrow();
  });

  it('throws if currentDir is not a directory', () => {
    // Create a file to test with
    const filePath = path.join(tempDir, 'notADirectory');
    fs.writeFileSync(filePath, '');
    expect(() => gitIgnoreToBlob(tempDir, filePath)).toThrow();
  });

  it('merges patterns from multiple .gitignore files', () => {
    // Use the temporary directory structure for the test
    const mergedPatterns = gitIgnoreToBlob(
      tempDir,
      path.join(tempDir, 'project', 'src', 'another'),
    );
    expect(mergedPatterns).toStrictEqual([
      `${tempDir}/project/src/another/**/dist/**`,
      `${tempDir}/project/**/node_modules/**`,
    ]);
  });

  it('should find all ignore patterns from baseDir and its children directories', () => {
    const ignorePatterns = findAllGitIgnorePatterns(tempDir);
    // Assuming gitIgnoreToBlob function returns patterns relative to baseDir
    // Verify the length to ensure no unexpected patterns are included
    expect(ignorePatterns.length).toBe(3);
    expect(ignorePatterns).toStrictEqual([
      `${tempDir}/project/**/node_modules/**`,
      `${tempDir}/project/src/another/**/dist/**`,
      `${tempDir}/project/src/another2/**/dist2/**`,
    ]);
  });
});
