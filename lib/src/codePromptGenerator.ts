import { promptFileContents } from './promptFileContents';
import { PromptGeneratorArgs, CodePromptGeneratorResponse } from './types';

/**
 * Generate a code prompt to be sent to OpenAI API
 * This will get a base task description and add a bunch of other instructions to the prompt that is sent to OpenAI API
 * in order to generate code based on the task description.
 * @param firstPrompt {boolean} If true, prompt basic file input/output instructions, expected behaviors and general instructions that are not necessary on subsequent prompts
 * @param args {PromptGeneratorArgs}
 * @returns {string} Model prompt tailored for generating code
 */
export const codePromptGenerator = (
  firstPrompt: boolean,
  args: PromptGeneratorArgs,
): CodePromptGeneratorResponse => {
  // generate prompt contents for workspace files
  let fullFileContents;
  if (args.workspaceFiles?.fullContents) {
    fullFileContents = promptFileContents(args.workspaceFiles.fullContents);
  }

  let previewFileContents;
  if (args.workspaceFiles?.previewContents) {
    previewFileContents = promptFileContents(args.workspaceFiles?.previewContents);
  }

  if (!args.task) {
    throw new Error('task should be non empty');
  }

  const inputDataTemplate = `
## Input Data

* For handling input files, look for the pattern "File [file name with relative path]: \`\`\`[file contents]\`\`\`"

### Workspace files

### Full content files

* This is the workspace where the developer works and where the source code of our system resides. All generated files should be located in this structure

${checkValidString(fullFileContents?.fileContentsPrompt, 'No files')}

#### File previews

${checkValidString(previewFileContents?.fileContentsPrompt, 'No files')}
`;

  // code prompt for first prompts (full instructions)
  const fullCodePrompt = `
  ## Instructions

  ### Task

${args.task}
  
  ### Approach (THIS IS VERY IMPORTANT TO FOLLOW)
  
  1. Don't generate any codes until you have analyzed the whole task and has requested all files you need

  2. Analyse the task and the files that you already received

  3. Keep asking for additional files until you have everything you need to generate the response files. In that case, answer with the list of files ordered by relevance (most relevant first). Only request files that you didn't receive yet and limit this list to the 30 most important files.

  4. After you finish analyzing the whole task with all necessary files, generate the resulting files according to "Output Indicator" section without asking for any permission. Order the file generation according to the least dependant file to the most dependant file. Generate the files in this order.

## Output Indicator (THIS IS VERY IMPORTANT TO FOLLOW)

* The first prompt response should start with 'HEADER (outcome="{one of: files-generated, files-requested, notes-generated}"; count={number files requested or notes generated})'
* Each generated file, requested file list or notes should be output using the following template:
'CONTENT_START (filename="{filename if appliable}"; relevance={a score between 1-10}; motivation="{motivation in 10 words}")
{file contents if exists}
CONTENT_END (size={content length}; md5="{md5 hash hex for contents}")')
* When continuing a response, don't skip or repeat any characters
* After generating all contents, end response with 'FOOTER (hasMoreToGenerate={true or false})'

* If source code or files were generated set outcome to "files-generated" and generate the file contents
* If asking for more files, set outcome to "files-requested" and generate the list of requested files with motivation and relevance
* If notes are generated, but no source codes or files, set outcome to "notes-generated" and add create one CONTENT per note with the note contents
* If you have more files that could be generated in order to make the solution more complete, set "hasMoreToGenerate" to true in footer. Otherwise, set it to false

## Context

### General instructions

* We call it "workspace" a collection of folders and files that contains the source code or generic files used in a project
* Act as a senior developer that is very good at design, maintaining projects structures and communicating your decisions via comments
* Ignore comments in this prompt that are marked as markdown comments (e.g.: <!-- this is a comment -->)
* Be precise and tell when you don't know how to do something.
* Don't appologize
* Don't explain. Do.
* Don't ask questions if you have options that can be followed by default
* Output generated code comments or notes with instructions about things you need in order to improve the solution

### Coding instructions

* Understand the structure of the project and used technological stack before starting to generate code. When analyzing the task, always use all the files in Workspace to have insights on how to solve the problem.
* Communicate well what you are doing by using comments so other developers can easily maintain and debug the code you are generating
* Look for additional instructions on markup files and ts-docs found in Workspace
* Develop everything necessary to have a complete working solution. Ask for additional files from the workspace if needed. Output notes with requests for information.

#### Coding style

* Follow the style of the existing code
* Write comments that explain the purpose of the code, not just its effects
* Emphasize modularity, DRY principles (when you really have reuse), performance, and security in coding and comments
* Show clear, step-by-step reasoning
* Avoid using functions that are marked as “deprecated”

#### Source code generation

* Always output source code along with its relative filename and path
* Deliver completely edited files so it can replace any existing file in the workspace. If the generated code is supposed to be included in an existing file, include the existing file contents along with the generated code so this file can be used as is in the final version. Don’t omit details as the generated code is supposed to be as complete as possible.
* All codes generated have to follow the structure of the Workspace. The generated codes must fit in this structure because they will be included in this workspace after generation

### Project information

${checkValidString(args.projectInformation, 'No specific project information')}

${inputDataTemplate}

#### File previews

${checkValidString(previewFileContents?.fileContentsPrompt, 'No files')}

### Example

${checkValidString(
  args.example,
  'Do a best effort to generate code based on the structure and examples present in workspace files',
)}
`;

  // code prompt for subsequent prompts (only task + input data)
  const secondPrompt = `${args.task}

${inputDataTemplate}`;

  return {
    codePrompt: firstPrompt ? fullCodePrompt : secondPrompt,
    fullFileContents,
    previewFileContents,
  };
};

// check if variable is non empty and a valid string
const checkValidString = (str: string | null | undefined, messageIfNot: string): string => {
  const valid = typeof str !== 'undefined' && str !== null && str.trim() !== '';
  if (!valid) {
    return messageIfNot;
  }
  return str;
};
