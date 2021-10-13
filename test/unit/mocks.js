let AWS = require('aws-sdk')
let aws = require('aws-sdk-mock')
aws.setSDKInstance(AWS)

// utility functions for the various AWS service mocking combinations we need
module.exports = {
  staticBucket: function fakeStaticBucket (url) {
    let describeCounter = 0
    aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
      describeCounter++
      if (describeCounter > 1) {
        // subsequent calls check for stack deletion status
        cb({ code: 'ValidationError', message: `Stack with id ${ps.StackName} does not exist` })
      }
      else {
        // first call checks for static bucket
        cb(null, {
          Stacks: [ { Outputs: url ? [ { OutputKey: 'BucketURL', OutputValue: url } ] : [] } ]
        })
      }
    })
  },
  dbTables: function fakeDynamoTables (tables) {
    aws.mock('CloudFormation', 'describeStackResources', (query, cb) => {
      cb(null, { StackResources: tables.map(t => ({ ResourceType: 'AWS::DynamoDB::Table', Name: t })) })
    })
  },
  /**
   * @param name: should the deploy bucket for the app exist or not?
   */
  deployBucket: function fakeDeployBucket (name) {
    aws.mock('SSM', 'getParameter', (params, cb) => {
      if (name) cb(null, { Parameter: { Value: name } })
      else cb({ code: 'ParameterNotFound' })
    })
  },
  ssmParams: function fakeSSMParams (params) {
    aws.mock('SSM', 'getParametersByPath', (query, cb) => {
      if (params.length) cb(null, { Parameters: params.map(p => ({ Name: p })) })
      else cb({ code: 'ParameterNotFound' })
    })
    aws.mock('SSM', 'deleteParameters', (query, cb) => cb(null, {}))
  },
  cloudwatchLogs: function fakeCloudWatchLogs (groups) {
    aws.mock('CloudWatchLogs', 'describeLogGroups', (query, cb) => {
      cb(null, { logGroups: groups.map(g => ({ logGroupName: g })) })
    })
    aws.mock('CloudWatchLogs', 'deleteLogGroup', (query, cb) => cb(null, {}))
  },
  deleteStack: function fakeDeleteStack () {
    aws.mock('CloudFormation', 'deleteStack', (query, cb) => cb(null, {}))
  }
}
