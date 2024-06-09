import { parsePromptOutput } from './parsePromptOutput';

describe('parsePromptOutput', () => {
  it('should parse valid output correctly', () => {
    const validOutput = JSON.stringify({
      outcome: 'codes-generated',
      files: [{ filename: 'file1', contents: 'content1' }],
      notes: ['note1'],
      hasMoreToGenerate: false,
    });

    const result = parsePromptOutput(validOutput);

    expect(result).toEqual({
      outcome: 'codes-generated',
      files: [{ filename: 'file1', contents: 'content1' }],
      notes: ['note1'],
      hasMoreToGenerate: false,
    });
  });

  it('should throw an error for invalid output', () => {
    const invalidOutput = JSON.stringify({
      outcome: 'invalid-outcome',
      files: [{ filename: 'file1', contents: 'content1' }],
      notes: ['note1'],
      hasMoreToGenerate: false,
    });

    expect(() => parsePromptOutput(invalidOutput)).toThrow();
  });

  it('should handle "files-requested" outcome correctly', () => {
    const outputWithFilesRequested = JSON.stringify({
      outcome: 'files-requested',
      files: [{ filename: 'file1', contents: 'content1', relevance: 5 }],
      notes: ['note1'],
      hasMoreToGenerate: false,
    });

    const result = parsePromptOutput(outputWithFilesRequested);

    expect(result).toStrictEqual({
      outcome: 'files-requested',
      files: [{ filename: 'file1', contents: 'content1', relevance: 5 }],
      notes: ['note1'],
      hasMoreToGenerate: false,
    });
  });
});
