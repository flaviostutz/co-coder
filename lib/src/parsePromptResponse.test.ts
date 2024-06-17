import {
  parseContents,
  parseFooter,
  parseHeader,
  parsePromptResponse,
} from './parsePromptResponse';

describe('parsePromptResponse', () => {
  it('should correctly parse a prompt response with valid input', () => {
    const output = `HEADER (outcome="files-generated"; count=2)
CONTENT_START (filename="test1.txt"; relevance=5; motivation="example")
This is the first test content.
CONTENT_END (size=31; md5="68c575e20772ee543cd906fe0d0a8e4d")
CONTENT_START (filename="test-empty.txt"; relevance=5; motivation="example")
CONTENT_END (size=31; md5="d41d8cd98f00b204e9800998ecf8427e")
CONTENT_START (filename="test2.txt"; relevance=8; motivation="example")
\`\`\`text
This is the second test content.
\`\`\`
CONTENT_END (size=31; md5="444121b9607ee3b8330a523883baf409")
FOOTER (hasMoreToGenerate=false)`;

    const result = parsePromptResponse(output);

    expect(result).toStrictEqual({
      header: {
        outcome: 'files-generated',
        count: 2,
      },
      contents: [
        {
          filename: 'test1.txt',
          relevance: 5,
          motivation: 'example',
          content: 'This is the first test content.',
          size: 31,
          md5: '68c575e20772ee543cd906fe0d0a8e4d',
          md5OK: true,
        },
        {
          filename: 'test-empty.txt',
          relevance: 5,
          motivation: 'example',
          content: '',
          size: 31,
          md5: 'd41d8cd98f00b204e9800998ecf8427e',
          md5OK: true,
        },
        {
          filename: 'test2.txt',
          relevance: 8,
          motivation: 'example',
          content: 'This is the second test content.',
          size: 31,
          md5: '444121b9607ee3b8330a523883baf409',
          md5OK: true,
        },
      ],
      footer: {
        hasMoreToGenerate: false,
      },
    });
  });

  it('should throw an error for invalid input', () => {
    const output = `Invalid input format`;
    expect(() => parsePromptResponse(output)).toThrow('Header not found');
  });
  it('should throw an error for invalid header', () => {
    const output = `Invalid input format`;
    expect(() => parseHeader(output)).toThrow('Header not found');
  });
  it('should throw an error for invalid footer', () => {
    const output = `Invalid input format`;
    expect(() => parseFooter(output)).toThrow('Footer not found');
  });
  it('should throw an error for invalid contents', () => {
    const output = `Invalid input format`;
    expect(() => parseContents(output)).toThrow('Contents not found');
  });
});
