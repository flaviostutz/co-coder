import crc32 from 'crc/crc32';

export type PromptResponse = {
  header: Header;
  contents: Content[];
  footer: Footer;
};

export type Header = {
  outcome: 'files-generated' | 'files-requested' | 'notes-generated';
  count: number;
};

export type Footer = {
  hasMoreToGenerate: boolean;
};

export type Content = {
  filename: string;
  relevance: number;
  motivation: string;
  content: string;
  size: number;
  crc32: string;
  crcOK: boolean;
};

export const parseHeader = (promptResult: string): Header => {
  const outcomeRegex = /HEADER \(outcome="(.+?)"; count=(\d+)\)/;
  const match = promptResult.match(outcomeRegex);
  if (!match) throw new Error('Header not found');

  return {
    outcome: match[1] as Header['outcome'],
    count: parseInt(match[2], 10),
  };
};

export const parseFooter = (promptResult: string): Footer => {
  const footerRegex = /FOOTER \(hasMoreToGenerate=(.+?)\)/;
  const match = promptResult.match(footerRegex);
  if (!match) throw new Error('Footer not found');

  return {
    hasMoreToGenerate: match[1] === 'true',
  };
};

export const parseContents = (promptResult: string): Content[] => {
  const regex =
    /CONTENT_START\s*\(filename="(.*)";\s*relevance=(\d*);\s*motivation="(.*)"\)\s*\n*(.*)\n*CONTENT_END\s*\(size=(\d+);\s*crc32="(.*)"\)/g;
  const matches = [...promptResult.matchAll(regex)];

  if (!matches || matches.length === 0) throw new Error('Contents not found');

  const contents: Content[] = [];

  matches.forEach((match) => {
    const [, filename, relevance, motivation, content] = match;
    const size = parseInt(match[5], 10);
    const crc32p = match[6].toLowerCase();

    contents.push({
      filename,
      relevance: parseInt(relevance, 10),
      motivation,
      content,
      size,
      crc32: crc32p,
      crcOK: crc32(content).toString(16).toLowerCase() === crc32p,
    });
  });

  return contents;
};

export const parsePromptResponse = (output: string): PromptResponse => {
  return {
    header: parseHeader(output),
    contents: parseContents(output),
    footer: parseFooter(output),
  };
};
