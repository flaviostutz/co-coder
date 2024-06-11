import z from 'zod';

// Define the schema for a single file
const FileSchema = z.object({
  filename: z.string(), // Filename relative to workspace path
  contents: z.string().optional(), // File contents
  relevance: z.number().optional(), // File relevance in the context of the task
});

// Define the schema for the entire JSON structure
const PromptOutputSchema = z.object({
  outcome: z.enum(['codes-generated', 'files-requested', 'notes-generated']), // One of the specified outcomes
  files: z.array(FileSchema).optional(), // Array of files
  notes: z.array(z.string()).optional(), // Array of notes
  hasMoreToGenerate: z.boolean().optional(), // Boolean indicating if there is more to generate
});

export const parsePromptOutput = (output: string): z.infer<typeof PromptOutputSchema> => {
  let out = output;
  // remove ``` markers from the output
  if (out.startsWith('```json')) {
    out = output.slice(7);
  }
  if (out.endsWith('```')) {
    out = out.slice(0, -3);
  }
  return PromptOutputSchema.parse(JSON.parse(out));
};
