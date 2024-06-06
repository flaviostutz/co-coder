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

    const output = promptFileContents(tempDir, ['\\.txt$', '\\.txt2$']);

    expect(output).toMatch(`File: ${matchingFile}: \`\`\`This is a test file\`\`\`\n\n`);
    expect(output).toMatch(`File: ${matchingFile2}: \`\`\`This is a test file2\`\`\`\n\n`);
    expect(output).not.toMatch(
      `File: ${nonMatchingFile}: \`\`\`This is another test file\`\`\`\n\n`,
    );

    fs.unlinkSync(matchingFile);
    fs.unlinkSync(matchingFile2);
    fs.unlinkSync(nonMatchingFile);
    fs.rmdirSync(tempDir);
  });

  it('should skip files larger than maxFileSize', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const largeFile = path.join(tempDir, 'largeFile.txt');
    const smallFile = path.join(tempDir, 'smallFile.txt');

    fs.writeFileSync(largeFile, 'a'.repeat(4000));
    fs.writeFileSync(smallFile, 'This is a small file');

    const output = promptFileContents(tempDir, ['\\.txt$'], 3000);

    expect(output).toMatch(`File: ${smallFile}: \`\`\`This is a small file\`\`\`\n\n`);
    expect(output).not.toMatch(`File: ${largeFile}`);

    fs.unlinkSync(largeFile);
    fs.unlinkSync(smallFile);
    fs.rmdirSync(tempDir);
  });
});
