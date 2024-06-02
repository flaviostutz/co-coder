import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { describeWorkspace } from './describeWorkspace';

describe('describeWorkspace', () => {
  it('should correctly describe the workspace', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const matchingFile = path.join(tempDir, 'test.txt');
    const nonMatchingFile = path.join(tempDir, 'test.jpg');

    fs.writeFileSync(matchingFile, 'This is a test file');
    fs.writeFileSync(nonMatchingFile, 'This is another test file');

    const output = describeWorkspace(tempDir, '\\.txt$');

    expect(output).toMatch(
      `Below there is a sequence of files and its contents. They are part of a workspace with source codes\n\nFile ${matchingFile}:\nThis is a test file\n\n`,
    );
    expect(output).not.toMatch(`File ${nonMatchingFile}:\nThis is another test file\n\n`);

    fs.unlinkSync(matchingFile);
    fs.unlinkSync(nonMatchingFile);
    fs.rmdirSync(tempDir);
  });
});
