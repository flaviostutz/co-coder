## Instructions

### Task

1. From the workspace-file “sample.wsdl” use the library “asteasolutions/zod-to-openapi” to implement the openapi version of this service along with schemas and utility functions to build those operations. All operations of this wsdl must be implemented.

2. Generate a working Lambda implementation for all operations discovered in the previous step. Try to identify and invoke external services or connectors that would be involved in the implementation of the operation.

3. Create unit tests using Jest. Unit tests should be placed in the same folder as the tested file

### Approach

1. Analyse the request, but don't generate any codes yet

2. Which additional files would you want to see its contents to help you improving the solution but you didn't have access yet? Answer with the list of files ordered by relevance (most relevant first). Include only files with relevance score >= 4. Limit this list to the 20 most important files.

3. After you receive the required files, proceed with code generation starting the output with "outcome: code-generated"

## Context

### General instructions

* Act as a senior developer that is very good at design, maintaining projects structures and communicating your decisions via comments
* Ignore comments in this prompt that are marked with <!--{comment}-->
* Don't bullshit in your answers. Be precise and tell when you don't know how to do something.
* Don't use apologies
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
* Generate source code for files that are similar too

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


### Project specific information

#### General architecture
* Our system exposes a rest API and its operations are implemented by AWS Lambda functions.
* Always generate the related infrastructure code to the lambda function using CDK (according to the structure in the workspace)
* The implementation of the Lambda function for a certain operation normally is solved by invoking external rest APIs (described in connectors) while doing some mapping and applying some business rules. 
* DynamoDB might be used to store data

#### Structure
* This is not a complete description of the workspace. Look into the workspace files to have more insights
* The project is organized in a monorepo which have multiple deployable services, web forms and shared libraries that are used among the services and web forms.

#### Code guidelines
* Rely heavily on Typescript types while generating code. Avoid using “any” type.

##### Connectors
* We call it "connector" a library that is used to invoke an external service (normally based on openapi in rest)
* When generating code for connecting to external apis defined by openapi, first look in workspace if there is an existing connector function to do such invocation. If it doesn’t exist, generate the code that includes the call to the external api to one of the existing connectors, using the same structure of existing connectors.


## Input Data

* For handling input files, look for the pattern "File [file name with relative path]: ```[file contents]```"

### Workspace files

* This is the workspace where the developer works and where the source code of our system resides. All generated files should be located in this structure

#### File previews 

* These files are not complete and contains only the first characters of its contents
* Ask for the contents of these files if it can help with the final coding solution

File docs/how-to-implement-service.md:
```
# Non sense
Nothing to see here
...
```

File docs/nothing.md:
```
# Nothing
* To implement a complete service using zod-to-openapi, Lambda and CDK, follow a sequence of steps:
  1. Start your project locally
...
```

File tests/all.ts:
```
import 'test' from 'test'

describe('something', () => {
...
```

### Full content files

File package.json:
```
{
  "name": "examples",
  "version": "0.0.1",
  "description": "Examples for the lib",
  "packageManager": "pnpm@8.9.0",
  "scripts": {},
  "author": "flaviostutz",
  "license": "MIT",
  "devDependencies": {
    "@stutzlab/eslint-config": "^3.0.4",
    "@tsconfig/node16": "16.1.1",
    "@types/aws-lambda": "^8.10.131",
    "@types/jest": "^29.4.0",
    "@types/node": "18.11.18",
    "aws-cdk": "2.117.0",
    "aws-sdk-client-mock": "^3.0.1",
    "esbuild-jest": "^0.5.0",
    "eslint": "^8.56.0",
    "jest": "^29.4.2",
    "ts-node": "^10.9.2",
    "typescript": "5.3.3"
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^6.3.1",
    "aws-cdk-lib": "2.117.0",
    "aws-lambda": "^1.0.7",
    "cdk-practical-constructs": "^0.6.0",
    "co-coder": "file:../lib/dist/co-coder-0.0.1.tgz",
    "constructs": "^10.3.0",
    "esbuild": "^0.19.11",
    "openapi3-ts": "^4.2.1",
    "zod": "^3.22.4"
  }
}
```

File cdk.json:
```
{
    "app": "pnpm exec ts-node --prefer-ts-exts src/cdk/app.ts"
}

File src/cdk/app.ts:
```
/* eslint-disable no-new */
import { App } from 'aws-cdk-lib/core';
import { resolveStageConfig } from 'cdk-practical-constructs';

import { testStageConfigs } from './configs';
import { AppStack } from './stack';
import { TestConfig } from './types/TestConfig';

const app = new App();

// this file is the entry point file and can have access to process env
// eslint-disable-next-line no-process-env
const stage = process.env.STAGE;
if (!stage) throw new Error('Process env STAGE is required');

const stageConfig = resolveStageConfig<TestConfig>(stage, testStageConfigs);

new AppStack(app, 'example-stack', { stageConfig });

app.synth();
```

File src/cdk/stack.ts:
```
/* eslint-disable camelcase */
import { Stack } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

import { addWso2Api } from '../wso2/cdk';
import { addLambdaGetTest } from '../lambda/cdk';
import { addTodoApi } from '../apigateway/cdk';

import { StageStackProps } from './types/StageStackProps';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: StageStackProps) {
    super(scope, id, props);

    // todo api example
    addTodoApi(this, props);

    // base lambda node js example
    addLambdaGetTest(this);

    // wso2 api resource example
    addWso2Api(this);
  }
}
```

```
File src/apigateway/cdk.ts:
```
/* eslint-disable camelcase */
import { Construct } from 'constructs';
import { LambdaOperation, OpenApiGatewayLambda } from 'cdk-practical-constructs';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { RemovalPolicy } from 'aws-cdk-lib';

import { StageStackProps } from '../cdk/types/StageStackProps';

import { buildGetTodoOperation } from './handlers/http/getTodo/cdk';
import { buildPostTodoOperation } from './handlers/http/postTodo/cdk';

// prepare zod with openapi extensions
extendZodWithOpenApi(z);

export const addTodoApi = (scope: Construct, props: StageStackProps): void => {
  const operations: LambdaOperation[] = [];

  // build Lambda + openapi defs for GetTodo operation
  const getLoanOp = buildGetTodoOperation(scope, props);
  operations.push(getLoanOp);

  // build Lambda + openapi defs for PostTodo operation
  const postLoanOp = buildPostTodoOperation(scope, props);
  operations.push(postLoanOp);

  // aws api gateway from openapi definitions
  const apigw = new OpenApiGatewayLambda(scope, 'todo-api', {
    stage: 'test',
    openapiBasic: {
      openapi: '3.0.3',
      info: {
        title: 'Todo API',
        description: 'Todo management API',
        version: 'v1',
      },
    },
    openapiOperations: operations,
  });

  // remove API GW when CFN stack is removed
  apigw.specRestApi.applyRemovalPolicy(RemovalPolicy.DESTROY);
  // console.log(JSON.stringify(apigw.openapiDocument, null, 2));
};
```

File src/apigateway/handlers/http/getTodo/cdk.ts:
```
import { BaseNodeJsFunction, EventType, LambdaOperation } from 'cdk-practical-constructs';
import { Construct } from 'constructs';

import { StageStackProps } from '../../../../cdk/types/StageStackProps';

import { pathParamsSchema, responseBodySchema } from './schemas';

export const buildGetTodoOperation = (
  scope: Construct,
  props: StageStackProps,
): LambdaOperation => {
  if (!props.stageConfig.stage) throw new Error('props.stageConfig.stage is required');

  const func = new BaseNodeJsFunction(scope, 'getTodo', {
    ...props.stageConfig.lambda,
    baseCodePath: 'src/apigateway/handlers',
    stage: props.stageConfig.stage,
    network: props.stageConfig.lambda.network,
    eventType: EventType.Http,
    description: 'Get Todo by id',
  });

  if (!func.liveAlias) throw new Error('func.liveAlias is required');

  return {
    lambdaAlias: func.liveAlias,
    routeConfig: {
      method: 'get',
      path: '/todos/{todoId}',
      request: {
        params: pathParamsSchema,
      },
      responses: {
        200: {
          description: 'Info about a todo item',
          content: {
            'application/json': {
              schema: responseBodySchema,
            },
          },
        },
      },
    },
  };
};
```

File src/apigateway/handlers/http/getTodo/schemas.ts:
```
import z from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const pathParamsSchema = z.strictObject({
  todoId: z.string().openapi({ example: '1234' }),
});

export const responseBodySchema = z
  .strictObject({
    id: z.string(),
    description: z.string(),
    priority: z.number().optional(),
  })
  .openapi({
    example: {
      id: '1234',
      description: 'Create a test for the todo examples',
    },
  });

export const lambdaEventSchema = z.object({
  pathParameters: pathParamsSchema,
});

export type LambdaEventType = z.infer<typeof lambdaEventSchema>;
```

File src/apigateway/handlers/http/getTodo/index.ts:
```
import { APIGatewayProxyResult } from 'aws-lambda';

import { LambdaEventType } from './schemas';

export const handler = async (event: LambdaEventType): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters?.todoId;
  if (!todoId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing todoId in path parameters' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ id: todoId, content: `This is item ${todoId}` }),
  };
};
```

File sample.wsdl:
```
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
             xmlns:tns="http://example.com/ecommerce"
             targetNamespace="http://example.com/ecommerce">

    <types>
        <schema xmlns="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ecommerce">
            <element name="Product">
                <complexType>
                    <sequence>
                        <element name="ProductId" type="string"/>
                        <element name="ProductName" type="string"/>
                        <element name="Price" type="decimal"/>
                    </sequence>
                </complexType>
            </element>
            <element name="Order">
                <complexType>
                    <sequence>
                        <element name="OrderId" type="string"/>
                        <element name="CustomerName" type="string"/>
                        <element name="Products" type="tns:Product" minOccurs="0" maxOccurs="unbounded"/>
                    </sequence>
                </complexType>
            </element>
        </schema>
    </types>

    <message name="GetProductRequest">
        <part name="ProductId" element="tns:ProductId"/>
    </message>
    <message name="GetProductResponse">
        <part name="Product" element="tns:Product"/>
    </message>

    <message name="PlaceOrderRequest">
        <part name="Order" element="tns:Order"/>
    </message>
    <message name="PlaceOrderResponse">
        <part name="Confirmation" type="string"/>
    </message>

    <portType name="ECommerceServicePortType">
        <operation name="GetProduct">
            <input message="tns:GetProductRequest"/>
            <output message="tns:GetProductResponse"/>
        </operation>
        <operation name="PlaceOrder">
            <input message="tns:PlaceOrderRequest"/>
            <output message="tns:PlaceOrderResponse"/>
        </operation>
    </portType>

    <binding name="ECommerceServiceSoapBinding" type="tns:ECommerceServicePortType">
        <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
        <operation name="GetProduct">
            <soap:operation soapAction="http://example.com/ecommerce/GetProduct"/>
            <input>
                <soap:body use="literal"/>
            </input>
            <output>
                <soap:body use="literal"/>
            </output>
        </operation>
        <operation name="PlaceOrder">
            <soap:operation soapAction="http://example.com/ecommerce/PlaceOrder"/>
            <input>
                <soap:body use="literal"/>
            </input>
            <output>
                <soap:body use="literal"/>
            </output>
        </operation>
    </binding>

    <service name="ECommerceService">
        <port name="ECommerceServicePort" binding="tns:ECommerceServiceSoapBinding">
            <soap:address location="http://example.com/ecommerce/service"/>
        </port>
    </service>

</definitions>
```

### Example

* Use structure at folder src/apigateway/handlers/http/getTodo as an example on how to implement a new openapi operation along with openapi, schemas and Lambda contents.

## Output Indicator

* If source code was generated, start the output with "outcome: code-generated" and generate file output contents using the following template: "File {file name with relative path}: ```{file contents}```" 

* If asking for more files, start the output with "outcome: files-requested" followed by the list of requested files using the format "File {file name} ({relevance score})"

* If you have more source codes that could be generated, indicate that with the text "note: more-codes-to-be-generated"

* Don't explain the reasoning, only generate code or questions
