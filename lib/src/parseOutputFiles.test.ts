import { parseOutputFiles, OutputFile } from './parseOutputFiles';

describe('parseOutputFiles', () => {
  it('should correctly parse output files', () => {
    const outputText = `
            File: file1.txt: \`\`\`Hello, world!\`\`\`
            File: file2.txt: \`\`\`Goodbye, world!\`\`\`
        `;

    const expected: OutputFile[] = [
      { filename: 'file1.txt', contents: 'Hello, world!' },
      { filename: 'file2.txt', contents: 'Goodbye, world!' },
    ];

    expect(parseOutputFiles(outputText)).toEqual(expected);
  });
});
