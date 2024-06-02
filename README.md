# co-coder

Tools to help prompting code tasks to LLM engines

See [examples/](/examples/) folder for a showcase

## APIs

* describeWorkspace(baseDir: string, filesRegex: string[]): string

* simplifyOpenapiSpec(openapiPath: string): string

* parseOutputFiles(outputText: string): {filename:string, contents:string}[]

