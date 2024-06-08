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
      fullContentsRegexes: ['\\.txt$', '\\.txt2$'],
    });

    expect(output.fullFileContents).toMatch(
      `File ${path.relative(tempDir, matchingFile)}: \`\`\`This is a test file\`\`\`\n\n`,
    );
    expect(output.fullFileContents).toMatch(
      `File ${path.relative(tempDir, matchingFile2)}: \`\`\`This is a test file2\`\`\`\n\n`,
    );
    expect(output.fullFileContents).not.toMatch(
      `File ${path.relative(tempDir, nonMatchingFile)}: \`\`\`This is another test file\`\`\`\n\n`,
    );

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
      fullContentsRegexes: ['\\.txt$'],
      fullContentsMaxFileSize: 3000,
    });

    expect(output.fullFileContents).toMatch(
      `File largeFile.txt: \`\`\`${'a'.repeat(3000)}\`\`\`\n\n`,
    );

    fs.unlinkSync(largeFile);
    fs.rmdirSync(tempDir);
  });

  it('should create full and preview contents', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const largeFile = path.join(tempDir, 'largeFile.txt');
    const largeFile2 = path.join(tempDir, 'largeFile2.txt2');

    fs.writeFileSync(largeFile, 'a'.repeat(5000));
    fs.writeFileSync(largeFile2, 'b'.repeat(5000));

    const output = promptFileContents({
      baseDir: tempDir,
      fullContentsRegexes: ['\\.txt$'],
      fullContentsMaxFileSize: 3000,
      previewContentsRegexes: ['\\.txt2$'],
      previewContentsMaxFileSize: 300,
    });

    expect(output.fullFileContents).toMatch(
      `File largeFile.txt: \`\`\`${'a'.repeat(3000)}\`\`\`\n\n`,
    );

    expect(output.previewFileContents).toMatch(
      `File largeFile2.txt2: \`\`\`${'b'.repeat(300)}\`\`\`\n\n`,
    );

    fs.unlinkSync(largeFile);
    fs.unlinkSync(largeFile2);
    fs.rmdirSync(tempDir);
  });
});
