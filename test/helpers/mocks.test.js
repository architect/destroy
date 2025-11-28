let { describe, it } = require('node:test')
let assert = require('node:assert/strict')
let {
  createMockAwsClient,
  staticBucket,
  dbTables,
  deployBucket,
  ssmParams,
  cloudwatchLogs,
  deleteStack,
} = require('./mocks')

describe('Mock Helpers', () => {
  describe('createMockAwsClient', () => {
    it('should create a mock AWS client with default implementations', () => {
      let aws = createMockAwsClient()

      assert.ok(aws.CloudFormation, 'CloudFormation service exists')
      assert.ok(aws.cloudformation, 'cloudformation service exists (lowercase)')
      assert.ok(aws.s3, 's3 service exists')
      assert.ok(aws.ssm, 'ssm service exists')
      assert.ok(aws.cloudwatchlogs, 'cloudwatchlogs service exists')

      assert.ok(typeof aws.CloudFormation.DescribeStacks === 'function', 'DescribeStacks is a function')
      assert.ok(typeof aws.cloudformation.DescribeStacks === 'function', 'DescribeStacks is a function (lowercase)')
      assert.ok(typeof aws.s3.ListObjectsV2 === 'function', 'ListObjectsV2 is a function')
      assert.ok(typeof aws.ssm.GetParameter === 'function', 'GetParameter is a function')
      assert.ok(typeof aws.cloudwatchlogs.DescribeLogGroups === 'function', 'DescribeLogGroups is a function')
    })

    it('should allow custom mock implementations', async () => {
      let customMock = () => Promise.resolve({ custom: 'data' })
      let aws = createMockAwsClient({
        s3: {
          ListObjectsV2: customMock,
        },
      })

      let result = await aws.s3.ListObjectsV2()
      assert.deepStrictEqual(result, { custom: 'data' })
    })
  })

  describe('staticBucket', () => {
    it('should return stack with bucket URL on first call', async () => {
      let mockFn = staticBucket('http://my-bucket.s3.amazonaws.com')
      let result = await mockFn()

      assert.ok(result.Stacks, 'Stacks array exists')
      assert.strictEqual(result.Stacks[0].Outputs[0].OutputKey, 'BucketURL')
      assert.strictEqual(result.Stacks[0].Outputs[0].OutputValue, 'http://my-bucket.s3.amazonaws.com')
    })

    it('should reject with ValidationError on subsequent calls', async () => {
      let mockFn = staticBucket('http://my-bucket.s3.amazonaws.com')
      await mockFn() // first call succeeds

      await assert.rejects(
        async () => await mockFn(),
        { code: 'ValidationError' },
      )
    })

    it('should return empty Outputs when url is false', async () => {
      let mockFn = staticBucket(false)
      let result = await mockFn()

      assert.strictEqual(result.Stacks[0].Outputs.length, 0)
    })
  })

  describe('dbTables', () => {
    it('should return stack resources for tables', async () => {
      let mockFn = dbTables([ 'table1', 'table2' ])
      let result = await mockFn()

      assert.strictEqual(result.StackResources.length, 2)
      assert.strictEqual(result.StackResources[0].ResourceType, 'AWS::DynamoDB::Table')
      assert.strictEqual(result.StackResources[0].Name, 'table1')
    })
  })

  describe('deployBucket', () => {
    it('should return parameter value when bucket exists', async () => {
      let mockFn = deployBucket('my-deploy-bucket')
      let result = await mockFn()

      assert.strictEqual(result.Parameter.Value, 'my-deploy-bucket')
    })

    it('should reject with ParameterNotFound when bucket does not exist', async () => {
      let mockFn = deployBucket(false)

      await assert.rejects(
        async () => await mockFn(),
        { code: 'ParameterNotFound' },
      )
    })
  })

  describe('ssmParams', () => {
    it('should return parameters when they exist', async () => {
      let mockFn = ssmParams([ 'param1', 'param2' ])
      let result = await mockFn()

      assert.strictEqual(result.Parameters.length, 2)
      assert.strictEqual(result.Parameters[0].Name, 'param1')
    })

    it('should reject with ParameterNotFound when no params exist', async () => {
      let mockFn = ssmParams([])

      await assert.rejects(
        async () => await mockFn(),
        { code: 'ParameterNotFound' },
      )
    })
  })

  describe('cloudwatchLogs', () => {
    it('should return log groups', async () => {
      let mockFn = cloudwatchLogs([ 'log-group-1', 'log-group-2' ])
      let result = await mockFn()

      assert.strictEqual(result.logGroups.length, 2)
      assert.strictEqual(result.logGroups[0].logGroupName, 'log-group-1')
    })
  })

  describe('deleteStack', () => {
    it('should resolve successfully', async () => {
      let mockFn = deleteStack()
      let result = await mockFn()

      assert.deepStrictEqual(result, {})
    })
  })
})
