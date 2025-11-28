let { describe, it, beforeEach } = require('node:test')
let assert = require('node:assert/strict')
let inventory = require('@architect/inventory')

describe('destroy credentials', () => {
  let awsLiteArgs = []

  beforeEach(() => {
    awsLiteArgs = []

    // Mock @aws-lite/client module
    let mockAwsLite = (args) => {
      awsLiteArgs.push(args)
      return Promise.resolve({
        cloudformation: {
          DescribeStacks: ({ StackName }) => Promise.reject({
            code: 'ValidationError',
            message: `Stack with id ${StackName} does not exist`,
          }),
          DeleteStack: () => Promise.resolve({}),
        },
        CloudFormation: {
          DescribeStacks: ({ StackName }) => Promise.reject({
            code: 'ValidationError',
            message: `Stack with id ${StackName} does not exist`,
          }),
          DeleteStack: () => Promise.resolve({}),
        },
        ssm: {
          GetParameter: () => Promise.resolve({
            Parameter: {
              Value: 'test-bucket-name',
            },
          }),
          GetParametersByPath: () => Promise.resolve({ Parameters: [] }),
          DeleteParameters: () => Promise.resolve({}),
        },
        s3: {
          HeadBucket: () => Promise.reject({ code: 'NotFound' }),
          ListObjectsV2: () => Promise.resolve({ Contents: [] }),
          DeleteBucket: () => Promise.resolve({}),
        },
        cloudwatchlogs: {
          DescribeLogGroups: () => Promise.resolve({ logGroups: [] }),
          DeleteLogGroup: () => Promise.resolve({}),
        },
      })
    }

    // Replace the module in cache
    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: mockAwsLite,
    }

    // Clear the destroy module cache so it picks up the mocked @aws-lite/client
    delete require.cache[require.resolve('../../')]
  })

  it('should accept and pass through credentials to AWS client', async () => {
    // Import destroy after mocking
    let destroy = require('../../')

    let inv = await inventory({
      rawArc: '@app\ntest-app\n@http\nget /',
      deployStage: 'staging',
    })

    await destroy({
      appname: 'test-app',
      env: 'staging',
      credentials: {
        accessKeyId: 'ASIATEST123456789',
        secretAccessKey: 'testSecretKey123456789',
        sessionToken: 'testSessionToken123456789',
      },
      inventory: inv,
      now: true, // Skip the 5-second delay for testing
      dryRun: true,
    })

    assert.ok(awsLiteArgs[0].accessKeyId, 'accessKeyId is present')
    assert.ok(awsLiteArgs[0].secretAccessKey, 'secretAccessKey is present')
    assert.ok(awsLiteArgs[0].sessionToken, 'sessionToken is present')
  })
})
