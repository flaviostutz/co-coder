import { simplifyOpenapiSpec } from './simplifyOpenapiSpec';

describe('simplifyOpenapiSpec', () => {
  it('should simplify the OpenAPI spec', () => {
    const mockOpenapiSpec = {
      paths: {
        '/pets': {
          get: {
            description: 'Get pets',
            summary: 'Get pets',
            parameters: [
              { name: 'limit', in: 'query', required: false },
              { name: 'Authorization', in: 'header', required: true },
            ],
            responses: {
              '200': { description: 'successful operation' },
              '400': { description: 'Invalid ID supplied' },
              '404': { description: 'Pet not found' },
            },
          },
        },
      },
      components: {
        schemas: {},
        responses: {},
      },
      info: {},
    };

    const result = simplifyOpenapiSpec(JSON.stringify(mockOpenapiSpec));

    expect(result).toStrictEqual(
      JSON.stringify(
        {
          paths: {
            '/pets': {
              get: {
                description: 'Get pets',
                summary: 'Get pets',
                parameters: [{ name: 'limit', in: 'query', required: false }],
                responses: {
                  '200': { description: 'successful operation' },
                },
              },
            },
          },
          components: {
            schemas: {},
            responses: {},
          },
          info: {},
        },
        null,
        2,
      ),
    );
  });

  it('should simplify the components of the OpenAPI spec', () => {
    const mockOpenapiSpec = {
      paths: {},
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                type: 'string',
                description: 'The name of the pet2',
              },
              tag: {
                type: 'string',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'successful operation',
            headers: {
              'X-RateLimit-Limit': {
                description: 'The number of allowed requests in the current period',
                schema: {
                  type: 'integer',
                },
              },
            },
          },
          '400': { description: 'Invalid ID supplied' },
          '404': { description: 'Pet not found' },
        },
      },
      info: {},
    };

    const result = JSON.parse(simplifyOpenapiSpec(JSON.stringify(mockOpenapiSpec)));

    expect(result).toStrictEqual({
      paths: {},
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                type: 'string',
                description: 'The name of the pet2',
              },
              tag: {
                type: 'string',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'successful operation',
          },
        },
      },
      info: {},
    });
  });
});
