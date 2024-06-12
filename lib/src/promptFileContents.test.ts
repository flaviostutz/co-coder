import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { promptFileContents } from './promptFileContents';

describe('describeWorkspace', () => {
  it('should correctly describe the workspace', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const matchingFile = path.join(tempDir, 'test.txt');
    const matchingFile2 = path.join(tempDir, 'test.txt2');
    const nonMatchingFile = path.join(tempDir, 'test.jpg');

    fs.writeFileSync(matchingFile, 'This is a test file');
    fs.writeFileSync(matchingFile2, 'This is a test file2');
    fs.writeFileSync(nonMatchingFile, 'This is another test file');

    const output = promptFileContents({
      baseDir: tempDir,
      filePatterns: ['*.txt', '*.txt2'],
    });

    expect(output.fileContentsPrompt).toMatch(
      `File ${path.relative(tempDir, matchingFile)}: \`\`\`This is a test file\`\`\`\n\n`,
    );
    expect(output.fileContentsPrompt).toMatch(
      `File ${path.relative(tempDir, matchingFile2)}: \`\`\`This is a test file2\`\`\`\n\n`,
    );
    expect(output.fileContentsPrompt).not.toMatch(
      `File ${path.relative(tempDir, nonMatchingFile)}: \`\`\`This is another test file\`\`\`\n\n`,
    );

    expect(output.filesProcessed.length).toBe(2);
    expect(output.filesProcessed).toStrictEqual(['test.txt', 'test.txt2']);
    expect(output.filesSkipped.length).toBe(0);
    expect(output.filesTruncated.length).toBe(0);

    fs.unlinkSync(matchingFile);
    fs.unlinkSync(matchingFile2);
    fs.unlinkSync(nonMatchingFile);
    fs.rmdirSync(tempDir);
  });

  it('should truncate files larger than maxFileSize', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const largeFile = path.join(tempDir, 'largeFile.txt');

    fs.writeFileSync(largeFile, 'a'.repeat(4000));

    const output = promptFileContents({
      baseDir: tempDir,
      filePatterns: ['*.txt'],
      maxFileSize: 3000,
    });

    expect(output.fileContentsPrompt).toMatch(
      `File largeFile.txt: \`\`\`${'a'.repeat(3000)}\`\`\`\n\n`,
    );

    expect(output.filesProcessed.length).toBe(1);
    expect(output.filesSkipped.length).toBe(0);
    expect(output.filesTruncated.length).toBe(1);

    fs.unlinkSync(largeFile);
    fs.rmdirSync(tempDir);
  });

  it('should skip files if we exceed max tokens', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const largeFile = path.join(tempDir, 'largeFile.txt');
    const smallFile = path.join(tempDir, 'smallFile.txt');

    fs.writeFileSync(largeFile, 'a'.repeat(4000));
    fs.writeFileSync(smallFile, 'a'.repeat(20000));

    const output = promptFileContents({
      baseDir: tempDir,
      filePatterns: ['*.txt'],
      maxTokens: 2000, // this will be enought for one file, but probably not for the other
    });

    expect(output.filesProcessed.length).toBe(1);
    expect(output.filesSkipped.length).toBe(1);

    fs.unlinkSync(largeFile);
    fs.unlinkSync(smallFile);
    fs.rmdirSync(tempDir);
  });
});
