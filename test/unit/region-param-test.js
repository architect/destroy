let { describe, it, beforeEach } = require('node:test')
let assert = require('node:assert/strict')
let proxyquire = require('proxyquire')
let inventory = require('@architect/inventory')

describe('region parameter functionality', () => {
  let awsLiteArgs = []
  let destroy

  beforeEach(() => {
    awsLiteArgs = []

    let mockAwsLite = (args) => {
      awsLiteArgs.push(args)
      return Promise.resolve({
        cloudformation: { DescribeStacks: ({ StackName }) => Promise.reject({ code: 'ValidationError', message: `Stack with id ${StackName} does not exist` }) },
        CloudFormation: { DescribeStacks: ({ StackName }) => Promise.reject({ code: 'ValidationError', message: `Stack with id ${StackName} does not exist` }) },
        ssm: {
          GetParameter: () => Promise.resolve({
            Parameter: {
              Value: 'test-bucket-name',
            },
          }),
          GetParametersByPath: () => Promise.resolve({ Parameters: [] }),
        },
        s3: {
          HeadBucket: () => Promise.reject({ code: 'NotFound' }),
        },
        cloudwatchlogs: {
          DescribeLogGroups: () => Promise.resolve({ logGroups: [] }),
        },
      })
    }

    destroy = proxyquire('../../', {
      '@aws-lite/client': mockAwsLite,
    })
  })

  it('should accept and use region parameter', async () => {
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
      region: 'ca-central-1',
    })

    assert.ok(awsLiteArgs[0].region, 'region is present')
    assert.strictEqual(awsLiteArgs[0].region, 'ca-central-1', 'region is set correctly')
  })
})
