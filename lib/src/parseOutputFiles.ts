export type OutputFile = {
  filename: string;
  contents: string;
};

export const parseOutputFiles = (outputText: string): OutputFile[] => {
  const regex = /File (.*?): ```(.*?)```/gs;
  let match = regex.exec(outputText);
  const outputFiles = [];

  while (match !== null) {
    outputFiles.push({
      filename: match[1],
      contents: match[2],
    });
    match = regex.exec(outputText);
  }

  return outputFiles;
};
