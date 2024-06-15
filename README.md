# co-coder

This library aim making LLM engines able to generate code in the context of a project, not only for generating pieces of code for specific problems, but to reason what is the project structure, architecture, conventions and to create new files or update existing ones to solve a certain task.

See [examples/](/examples/) folder for a showcase

## Concepts

We will structure the LLM prompts with the different aspects that have to be taken into account while working in a real project, such as "architecture", "tech stack", "coding conventions", "workspace files", "task breakdown example", "task".

The difference to Github Co-Pilot is that you can use more advanced OpenAI models with much larger contexts to process more complex tasks that involves the entire workspace, for example. For simple tasks, Co-Pilot is the way to go.

The prompts and output format was crafted in a way that the model can continue generating the files with continuation after finish_reason="length" while generating long contents that exceeds "max_tokens".

## Usage

## CLI tool

```
npx co-coder run --task <task description> --workspace <workspace dir> [options]
```

```
co-coder run

Run a task in the context of workspace files and possibly generate new files
based on the prompt

Options:
  --version        Show version number     [boolean]
  --help           Show help      [boolean]
 -t, --task        Task to be performed in the context of the
                   workspace files  [string] [required]
 -w, --workspace   Base directory with workspace files
                   [string] [default: "."]
 -f, --files       Regex for file names that will have its
                   full content included in the prompt. e.g.
                   "src/.*\.ts"   [array] [required]
 -p, --preview     Regex for file names that will have its
                   partial content included in the prompt
                   [array]
 -e, --example     Instruction with an example of the task to
                   be performed, or a path to a file that
                   should be used as an example   [string]
 -i, --info        General information about the workspace
                   structure, standards, and other relevant
                   information to be included in the prompt
                   [string]
 -m, --model       Model to be used. e.g. "gpt-4o",
                   "gpt-3.5-turbo-0125". If using Azure, must
                   match the custom deployment name you chose
                   for your model   [string] [required]
 -o, --output      Output directory for generated files by
                   the prompt   [string] [default: ".out"]
  --max-tokens-total, --tt  Max number of tokens allowed to be used in
                            total for the task
                            [string] [default: "4000"]
  --max-tokens-per-request, --tr  Max number of tokens to send to the API in
                                  a single request
                                  [string] [default: "128000"]
  --api-provider   API provider. One of "openai" or "azure"
                   [string] [default: "openai"]
  --api-url        API url. e.g. "https://localhost:1234". If
                   using Azure, it's required to use the
                   endpoint URL from Azure     [string]
  --api-auth       API auth method. One of "token" or
          "apikey" [string] [default: "apikey"]
  --api-key        OpenAI API key     [string]
  --api-azure-version    Azure API version. Required when using
                         Azure provider
                         [string] [default: "2024-02-01"]
```

### Examples

Here are a few examples of how to use the CLI tool:

```
npx co-coder run --task "refactor code"
```

This command will run the prompt "refactor code" over all files in the current dir and output its results to folder ".out"

```
cli-tool run --task "generate unit tests" --files ["src/app.ts"] --output "."
```

This command will generate unit tests for the file src/app.ts in the workspace

```sh
co-coder run --task "fix any bugs in these files" --files "src/*.ts" --model "gpt-3.5-turbo-0125"
```

This command will fix bugs in all TypeScript files in the `src` directory using the `gpt-3.5-turbo-0125` model.

```sh
co-coder run --task "generate documentation for these files" --files "src/**/*.ts" --output "docs"
```

This command will generate documentation for all TypeScript files in the `src` directory and output the generated files to the `docs` directory.


## TODO
  - convert JSON file contents back to ``` because it uses 30% less output tokens
  - create a way to generate file in fragments for responses bigger than the max_tokens permitted for the model
  