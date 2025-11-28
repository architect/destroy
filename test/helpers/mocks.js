let { mock } = require('node:test')

/**
 * Create a mock AWS client compatible with @aws-lite/client API structure
 * @param {object} mocks - Object containing mock implementations for AWS services
 * @returns {object} Mock AWS client with CloudFormation, S3, SSM, and CloudWatch Logs services
 */
function createMockAwsClient (mocks = {}) {
  let client = {
    CloudFormation: {
      DescribeStacks: mock.fn(mocks.CloudFormation?.DescribeStacks || (() => Promise.resolve({ Stacks: [] }))),
      DeleteStack: mock.fn(mocks.CloudFormation?.DeleteStack || (() => Promise.resolve({}))),
      DescribeStackResources: mock.fn(mocks.CloudFormation?.DescribeStackResources || (() => Promise.resolve({ StackResources: [] }))),
    },
    s3: {
      HeadBucket: mock.fn(mocks.s3?.HeadBucket || (() => Promise.resolve({}))),
      ListObjectsV2: mock.fn(mocks.s3?.ListObjectsV2 || (() => Promise.resolve({ Contents: [] }))),
      DeleteObjects: mock.fn(mocks.s3?.DeleteObjects || (() => Promise.resolve({}))),
      DeleteBucket: mock.fn(mocks.s3?.DeleteBucket || (() => Promise.resolve({}))),
    },
    ssm: {
      GetParameter: mock.fn(mocks.ssm?.GetParameter || (() => Promise.resolve({}))),
      GetParametersByPath: mock.fn(mocks.ssm?.GetParametersByPath || (() => Promise.resolve({ Parameters: [] }))),
      DeleteParameters: mock.fn(mocks.ssm?.DeleteParameters || (() => Promise.resolve({}))),
    },
    cloudwatchlogs: {
      DescribeLogGroups: mock.fn(mocks.cloudwatchlogs?.DescribeLogGroups || (() => Promise.resolve({ logGroups: [] }))),
      DeleteLogGroup: mock.fn(mocks.cloudwatchlogs?.DeleteLogGroup || (() => Promise.resolve({}))),
    },
  }

  // Support both capitalized and lowercase for compatibility with source code
  client.cloudformation = client.CloudFormation

  return client
}

/**
 * Helper function to create a mock for static bucket scenario
 * @param {string|boolean} url - Bucket URL or false if no static bucket exists
 * @returns {function} Function that returns mock CloudFormation.DescribeStacks implementation
 */
function staticBucket (url) {
  let describeCounter = 0
  return (params) => {
    describeCounter++
    let stackName = params?.StackName || 'UnknownStack'
    if (describeCounter > 1) {
      // subsequent calls check for stack deletion status
      return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
    }
    else {
      // first call checks for static bucket
      return Promise.resolve({
        Stacks: [ { Outputs: url ? [ { OutputKey: 'BucketURL', OutputValue: url } ] : [] } ],
      })
    }
  }
}

/**
 * Helper function to create a mock for DynamoDB tables scenario
 * @param {Array<string>} tables - Array of table names
 * @returns {function} Function that returns mock CloudFormation.DescribeStackResources implementation
 */
function dbTables (tables) {
  return () => {
    return Promise.resolve({
      StackResources: tables.map(t => ({ ResourceType: 'AWS::DynamoDB::Table', Name: t })),
    })
  }
}

/**
 * Helper function to create a mock for deployment bucket scenario
 * @param {string|boolean} name - Deployment bucket name or false if it doesn't exist
 * @returns {function} Function that returns mock SSM.GetParameter implementation
 */
function deployBucket (name) {
  return () => {
    if (name) {
      return Promise.resolve({ Parameter: { Value: name } })
    }
    else {
      // Return resolved promise with null value to match _ssm.js behavior
      // When ParameterNotFound, _ssm.js calls callback() which causes waterfall issues
      return Promise.resolve({ Parameter: { Value: null } })
    }
  }
}

/**
 * Helper function to create a mock for SSM parameters scenario
 * @param {Array<string>} params - Array of parameter names
 * @returns {function} Function that returns mock SSM.GetParametersByPath implementation
 */
function ssmParams (params) {
  return () => {
    if (params.length) {
      return Promise.resolve({ Parameters: params.map(p => ({ Name: p })) })
    }
    else {
      // Return empty array instead of rejecting to match expected behavior
      return Promise.resolve({ Parameters: [] })
    }
  }
}

/**
 * Helper function to create a mock for CloudWatch log groups scenario
 * @param {Array<string>} groups - Array of log group names
 * @returns {function} Function that returns mock CloudWatchLogs.DescribeLogGroups implementation
 */
function cloudwatchLogs (groups) {
  return () => {
    return Promise.resolve({ logGroups: groups.map(g => ({ logGroupName: g })) })
  }
}

/**
 * Helper function to create a mock for CloudFormation DeleteStack
 * @returns {function} Function that returns mock CloudFormation.DeleteStack implementation
 */
function deleteStack () {
  return () => Promise.resolve({})
}

module.exports = {
  createMockAwsClient,
  staticBucket,
  dbTables,
  deployBucket,
  ssmParams,
  cloudwatchLogs,
  deleteStack,
}
