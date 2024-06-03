# co-coder

This library aim making LLM engines able to generate code in the context of a project, not only for generating pieces of code for specific problems, but to reason what is the project structure, architecture, conventions and to create new files or update existing ones to solve a certain task.

The generated code is supposed to be a good starting point for the developer to implement business rules, check and fix bugs. LLM will do the boring job of creating folders, files and basic code structures when the dev is starting to develop a new feature.

See [examples/](/examples/) folder for a showcase

## Concepts

We will structure the LLM prompts with the different aspects that have to be taken into account while working in a real project, such as "architecture", "tech stack", "coding conventions", "workspace files", "task breakdown example", "task".

It's a good idea to use some file simplifiers so that we reduce the number of required tokens for certain contents, such as "openapis" before sending its contents to the LLM.

## Ideas to explore

* Send the tree of file names and ask if LLM wants to see the contents of more files. Provide them as necessary then

* Divide into two calls: one with the overall project structure and example, and another with the specific task request, that can then used for multiple requests without adding more tokens (related to all the project structure etc) to the context.

* Experiment with [Self Consistency](https://www.promptingguide.ai/techniques/consistency) and [Tree of Thoughts (ToT)](https://www.promptingguide.ai/techniques/tot)" in prompt engineering to see if the results are enhanced

## APIs

* promptFileContents(baseDir: string, filesRegex: string[]): string

* simplifyOpenapiSpec(openapiContents: string): string

* parseOutputFiles(outputText: string): {filename:string, contents:string}[]

