# co-coder

This library aim making LLM engines able to generate code in the context of a project, not only for generating pieces of code for specific problems, but to reason what is the project structure, architecture, conventions and to create new files or update existing ones to solve a certain task.

See [examples/](/examples/) folder for a showcase

## Concepts

We will structure the LLM prompts with the different aspects that have to be taken into account while working in a real project, such as "architecture", "tech stack", "coding conventions", "workspace files", "task breakdown example", "task".

The difference to Github Co-Pilot is that you can use more advanced OpenAI models with much larger contexts to process more complex tasks that involves the entire workspace, for example. For simple tasks, Co-Pilot is the way to go.

## Usage

## CLI tool

To use the CLI tool, you can use the run command followed by various options:

```
npx co-coder run --task <task> --workspace <workspace> [options]
```

### Options

--task: This is the task to be performed in the context of the workspace files. This option is required.

--workspace: This is the base directory with workspace files. This option is required.

--files: This is an array of file paths relative to the workspace directory. These files will be included in the prompt sent to the model.

--preview: This is an array of file paths relative to the workspace directory. These files will be included in the prompt sent to the model, but their contents will not be editable.

--model: This is the OpenAI model to use for the task. The default model is text-davinci-002.

--max-tokens-total: This is the maximum total number of tokens that can be used by the tool. The default value is 4096.

--max-tokens-per-request: This is the maximum number of tokens that can be used in a single request. The default value is 4096.

--api-provider: This is the API provider to use. The default provider is openai.

--api-url: This is the URL of the API endpoint to use. The default URL is https://api.openai.com.

### Examples

Here are a few examples of how to use the CLI tool:

```
npx co-coder run --task "refactor code"
```

This command will run the prompt "refactor code" over all files in the current workspace and output its results to folder ".out"

```
cli-tool run --task "generate unit tests" --files ["src/app.ts"] --output "."
```

This command will generate unit tests for the file src/app.ts in the workspace
