import { PromptFileContentsArgs, promptFileContents } from './promptFileContents';

/**
 * Arguments for generating a code prompt
 */
export type CodePromptGeneratorArgs = {
  /**
   * Description of the task to be performed. It will be added to the prompt as the main task that must be performed by the model.
   * A bunch of other instructions will be added besides this task to the prompt that is sent to OpenAI API
   * @required
   */
  taskDescription: string;
  /**
   * Information about the project that the task is related to. It will be added to the prompt as the context of the task.
   * Add here informations such as the project's purpose, the technologies used, the structure of the project, etc.
   * You can use markdown format to make the content more readable.
   */
  projectInformation?: string;
  /**
   * Workspace files that will be sent along with the prompt to the OpenAI API so it can use it as a context to generate the codes.
   * It will use these files to understand the structure of the project, technologies used and other informations that can help to generate the code.
   * @required
   */
  workspaceFiles: PromptFileContentsArgs;
  /**
   * Example of the task to be performed. It will be added to the prompt as an example of the task that must be performed by the model.
   * You fully describe an example for the task, or indicate which files or folders can be used as an example and it will try to generate a code based on this example.
   * e.g.: "Use workspace files under folder `packages/reference-runner` as an example"
   */
  example: string;
};

/**
 * Generate a code prompt to be sent to OpenAI API
 * This will get a base task description and add a bunch of other instructions to the prompt that is sent to OpenAI API
 * in order to generate code based on the task description.
 * @param args {CodePromptGeneratorArgs}
 * @returns {string} Model prompt tailored for generating code
 */
export const codePromptGenerator = (args: CodePromptGeneratorArgs): string => {
  const workspaceFilesContents = promptFileContents(args.workspaceFiles);

  if (!args.taskDescription) {
    throw new Error('taskDescription should be non empty');
  }

  return `
  ## Instructions

  ### Task

${args.taskDescription}
  
  ### Approach
  
  1. Analyse the request, but don't generate any codes yet
  
  2. Which additional files would you want to see its contents to help you improving the solution? Answer with the list of files ordered by relevance (most relevant first). Only request files that you didn't receive yet and limit this list to the 20 most important files.
  
  3. After you receive the required files, proceed with code generation starting the output with "outcome: code-generated"

## Context

### General instructions

* Act as a senior developer that is very good at design, maintaining projects structures and communicating your decisions via comments
* Ignore comments in this prompt that are marked as markdown comments (e.g.: <!-- this is a comment -->)
* Don't bullshit in your answers. Be precise and tell when you don't know how to do something.
* Don't appologize
* Don't ask questions if you have options that can be followed by default
<!-- * Think step by step
* Imagine that you have multiple developers doing the same task in parallel and before coming with the final result you compare all results and selects which one is the best fit to the instructions in this request -->

### Coding instructions

* Only output generated code
* Make questions only when strictly necessary
* Communicate well what you are doing so other developers can easily maintain and debug the code you are generating
* We call it "workspace" a collection of folders and files that contains the source code of an application
* Understand the structure of the project and used technological stack before starting to generate code. When analyzing the task, always use all the files in Workspace to have insights on how to solve the problem.
* Look for additional instructions on markup files and ts-docs found in Workspace

#### Coding style
* Fix errors proactively
* Write comments that explain the purpose of the code, not just its effects
* Emphasize modularity, DRY principles (when you really have reuse), performance, and security in coding and comments
* Show clear, step-by-step reasoning
* Prioritize tasks, completing one file before starting another
* Use TODO comments for unfinished code
* Avoid using functions that are marked as “deprecated”

#### Source code generation
* Always output source code along with its relative filename and path
* Deliver completely edited files so it can replace any existing file in the workspace. If the generated code is supposed to be included in an existing file, include the existing file contents along with the generated code so this file can be used as is in the final version. Don’t omit details as the generated code is supposed to be as complete as possible.
* All codes generated have to follow the structure of the Workspace. The generated codes must fit in this structure because they will be included in this workspace after generation


### Project information

${checkValidString(args.projectInformation, 'No specific project information')}

## Input Data

* For handling input files, look for the pattern "File [file name with relative path]: \`\`\`[file contents]\`\`\`"

### Workspace files

### Full content files

* This is the workspace where the developer works and where the source code of our system resides. All generated files should be located in this structure

${checkValidString(workspaceFilesContents.fullFileContents, 'No files')}

#### File previews

${checkValidString(workspaceFilesContents.previewFileContents, 'No files')}

### Example

${checkValidString(
  args.example,
  'Do a best effort to generate code based on the structure and examples present in workspace files',
)}

## Output Indicator

* If source code was generated, start the output with "outcome: code-generated" and generate file output contents using the following template: "File {file name with relative path}: \`\`\`{file contents}\`\`\`" 
* If asking for more files, start the output with "outcome: files-requested" followed by the list of requested files using the format "File: {file name}"
* If you have more source codes that could be generated, indicate that with the text "note: more-codes-to-be-generated"
* Don't explain the reasoning, only generate code or questions

`;
};

// check if variable is non empty and a valid string
const checkValidString = (str: string | null | undefined, messageIfNot: string): string => {
  const valid = typeof str !== 'undefined' && str !== null && str.trim() !== '';
  if (!valid) {
    return messageIfNot;
  }
  return str;
};
