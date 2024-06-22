/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */

// Function to simplify schema
const simplifySchema = (schema: any): any => {
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    const simplified = {} as any;
    // this will be recursive over all attributes inside schema, so sum all possible attributes here
    if (schema.type) simplified.type = schema.type;
    if (schema.minimum) simplified.minimum = schema.minimum;
    if (schema.required) simplified.required = schema.required;
    if (schema.nullable) simplified.nullable = schema.nullable;
    if (schema.description) simplified.description = schema.description;
    if (schema.properties) simplified.properties = schema.properties;
    if (schema.format) simplified.format = schema.format;

    for (const key in schema) {
      if (schema[key] && typeof schema[key] === 'object') {
        simplified[key] = simplifySchema(schema[key]);
      }
    }
    return simplified;
  }

  return schema;
};

// Function to remove non-2xx responses
const removeNon2xxResponses = (responsesObj: any): any => {
  if (responsesObj && typeof responsesObj === 'object') {
    for (const key in responsesObj) {
      if (!key.startsWith('2')) {
        // eslint-disable-next-line fp/no-delete, no-param-reassign
        delete responsesObj[key];
      }
    }
  }
};

// Function to remove headers from responses
const removeHeadersFromResponses = (obj: any): any => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key === 'headers') {
        // eslint-disable-next-line fp/no-delete, no-param-reassign
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        removeHeadersFromResponses(obj[key]);
      }
    }
  }
};

export const simplifyOpenapiSpec = (openapiContents: string): string => {
  // Read the OpenAPI spec from the provided path
  const openapiSpec = JSON.parse(openapiContents);

  // Iterate over all paths
  for (const pathItem of Object.values(openapiSpec.paths) as any) {
    for (const operation of Object.values(pathItem) as any) {
      if (operation.parameters) {
        // Remove header parameters
        operation.parameters = operation.parameters.filter((param: any) => param.in !== 'header');
      }

      if (operation.responses) {
        // Remove non-2xx responses
        operation.responses = Object.fromEntries(
          Object.entries(operation.responses).filter(([responseCode]) =>
            responseCode.startsWith('2'),
          ),
        );
      }
    }
  }

  // Simplify components
  if (openapiSpec.components) {
    for (const [key, schema] of Object.entries(openapiSpec.components.schemas)) {
      openapiSpec.components.schemas[key] = simplifySchema(schema);
      // console.log(JSON.stringify(openapiSpec.components.schemas[key]));
    }

    // Remove headers from responses in components
    removeNon2xxResponses(openapiSpec.components.responses);
    removeHeadersFromResponses(openapiSpec.components.responses);
  }

  // Create a simplified spec that only includes the paths, components and info
  const simplifiedSpec = {
    paths: openapiSpec.paths,
    components: openapiSpec.components,
    info: openapiSpec.info,
  };

  // Return the simplified spec as a string
  return JSON.stringify(simplifiedSpec, null, 2);
};
