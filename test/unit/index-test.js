let { describe, it, beforeEach } = require('node:test')
let assert = require('node:assert/strict')
let mockHelpers = require('../helpers/mocks')

let now = true
let base = {
  appname: 'pentagon-security',
  env: 'staging',
  now,
  update: {
    start: () => {},
    status: () => {},
    done: () => {},
  },
}

// Mock inventory for all tests
let mockInventory = (opts, cb) => {
  cb(null, { inv: { aws: { region: 'us-east-1' } } })
}

describe('destroy main functionality', () => {
  beforeEach(() => {
    // Clear the destroy module cache before each test
    delete require.cache[require.resolve('../../')]
    delete require.cache[require.resolve('../../src')]
  })
  it('should throw if base parameters are not provided', () => {
    let destroy = require('../../src')

    assert.throws(() => {
      destroy({ appname: 'poop', now })
    }, { message: 'Missing params.env' }, 'missing env error thrown')

    assert.throws(() => {
      destroy({ env: 'staging', now })
    }, { message: 'Missing params.appname' }, 'missing appname error thrown')
  })

  it('should error if describeStacks errors generically', async () => {
    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: () => Promise.reject(new Error('Generic AWS error')),
      },
    })

    // Mock @aws-lite/client module
    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    // Mock @architect/inventory module
    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          destroy(base, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      },
      'error surfaced',
    )
  })

  it('should handle a non-existent Stack gracefully', async () => {
    let deleteFlag = false
    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: (params) => {
          let stackName = params?.StackName || 'UnknownStack'
          // Stack doesn't exist - reject immediately
          return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
        },
        DeleteStack: () => {
          deleteFlag = true
          return Promise.resolve({})
        },
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await new Promise((resolve, reject) => {
      destroy(base, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    assert.ok(!deleteFlag, 'CloudFormation.deleteStack was not called')
  })

  it('should error if static bucket exists and force is not provided', async () => {
    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: mockHelpers.staticBucket('somebucketurl'),
        DescribeStackResources: mockHelpers.dbTables([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          destroy(base, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      },
      { message: 'bucket_exists' },
      'bucket_exists error surfaced',
    )
  })

  it('should delete static bucket contents and the bucket itself if static bucket exists and force is provided', async () => {
    let S3objectDelete = false
    let S3delete = false
    let describeStacksCalls = 0

    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: (params) => {
          describeStacksCalls++
          let stackName = params?.StackName || 'UnknownStack'
          if (describeStacksCalls === 1) {
            // First call: return stack with static bucket
            return Promise.resolve({
              Stacks: [ { Outputs: [ { OutputKey: 'BucketURL', OutputValue: 'somebucketurl' } ] } ],
            })
          }
          else {
            // Subsequent calls: stack is being deleted
            return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
          }
        },
        DeleteStack: mockHelpers.deleteStack(),
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      s3: {
        HeadBucket: () => Promise.resolve({}),
        ListObjectsV2: () => Promise.resolve({ Contents: [ { Key: 'stone' }, { Key: 'lime' } ] }),
        DeleteObjects: () => {
          S3objectDelete = true
          return Promise.resolve({})
        },
        DeleteBucket: (params) => {
          S3delete = params.Bucket
          return Promise.resolve({})
        },
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    let params = { ...base, force: true }
    await new Promise((resolve, reject) => {
      destroy(params, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    assert.ok(S3objectDelete, 'S3.deleteObjects called')
    assert.strictEqual(S3delete, 'somebucketurl', 'S3.deleteBucket called for static bucket')
  })

  it('should delete deployment bucket contents and bucket itself if deployment bucket exists', async () => {
    let S3objectDelete = false
    let S3delete = false
    let describeStacksCalls = 0

    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: (params) => {
          describeStacksCalls++
          let stackName = params?.StackName || 'UnknownStack'
          if (describeStacksCalls === 1) {
            // First call: return stack with no static bucket
            return Promise.resolve({ Stacks: [ { Outputs: [] } ] })
          }
          else {
            // Subsequent calls: stack is being deleted
            return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
          }
        },
        DeleteStack: mockHelpers.deleteStack(),
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      s3: {
        HeadBucket: () => Promise.resolve({}),
        ListObjectsV2: () => Promise.resolve({ Contents: [ { Key: 'stone' }, { Key: 'lime' } ] }),
        DeleteObjects: () => {
          S3objectDelete = true
          return Promise.resolve({})
        },
        DeleteBucket: (params) => {
          S3delete = params.Bucket
          return Promise.resolve({})
        },
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket('myappdeploybucket'),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await new Promise((resolve, reject) => {
      destroy(base, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    assert.ok(S3objectDelete, 'S3.deleteObjects called')
    assert.strictEqual(S3delete, 'myappdeploybucket', 'S3.deleteBucket called for deployment bucket')
  })

  it('should error if describeStackResources errors', async () => {
    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: mockHelpers.staticBucket(false),
        DescribeStackResources: () => Promise.reject(new Error('DescribeStackResources error')),
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          destroy(base, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      },
      'error surfaced',
    )
  })

  it('should error if DynamoDB tables exist and force is not provided', async () => {
    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: mockHelpers.staticBucket(false),
        DescribeStackResources: mockHelpers.dbTables([ 'cats' ]),
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          destroy(base, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      },
      { message: 'table_exists' },
      'table exists error surfaced',
    )
  })

  it('should delete ssm params', async () => {
    let paramsDeleted = []
    let deleteFlag = false
    let describeStacksCalls = 0

    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: (params) => {
          describeStacksCalls++
          let stackName = params?.StackName || 'UnknownStack'
          if (describeStacksCalls === 1) {
            // First call: return stack with no outputs
            return Promise.resolve({ Stacks: [ { Outputs: [] } ] })
          }
          else {
            // Subsequent calls: stack is being deleted
            return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
          }
        },
        DeleteStack: () => {
          deleteFlag = true
          return Promise.resolve({})
        },
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: () => Promise.resolve({ Parameters: [ { Name: 'thing' } ] }),
        DeleteParameters: (params) => {
          paramsDeleted = params.Names
          return Promise.resolve({})
        },
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await new Promise((resolve, reject) => {
      destroy(base, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    assert.ok(deleteFlag, 'CloudFormation.deleteStack called')
    assert.ok(paramsDeleted.includes('thing'), 'SSM.deleteParameters called')
  })

  it('should not delete ssm params when stackname is provided', async () => {
    let paramsDeleted = []
    let deleteFlag = false
    let describeStacksCalls = 0

    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: (params) => {
          describeStacksCalls++
          let stackName = params?.StackName || 'UnknownStack'
          if (describeStacksCalls === 1) {
            // First call: return stack with no outputs
            return Promise.resolve({ Stacks: [ { Outputs: [] } ] })
          }
          else {
            // Subsequent calls: stack is being deleted
            return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
          }
        },
        DeleteStack: () => {
          deleteFlag = true
          return Promise.resolve({})
        },
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      ssm: {
        DeleteParameters: (params) => {
          paramsDeleted = params.Names
          return Promise.resolve({})
        },
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await new Promise((resolve, reject) => {
      destroy({ stackname: 'myPR', ...base }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    assert.ok(deleteFlag, 'CloudFormation.deleteStack called')
    assert.strictEqual(paramsDeleted.length, 0, 'SSM.deleteParameters not called')
  })

  it('should invoke deleteStack and return once describeStacks return a not found message', async () => {
    let deleteFlag = false
    let describeStacksCalls = 0

    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: (params) => {
          describeStacksCalls++
          let stackName = params?.StackName || 'UnknownStack'
          if (describeStacksCalls === 1) {
            // First call: return stack with no outputs
            return Promise.resolve({ Stacks: [ { Outputs: [] } ] })
          }
          else {
            // Subsequent calls: stack is being deleted
            return Promise.reject({ code: 'ValidationError', message: `Stack with id ${stackName} does not exist` })
          }
        },
        DeleteStack: () => {
          deleteFlag = true
          return Promise.resolve({})
        },
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await new Promise((resolve, reject) => {
      destroy(base, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    assert.ok(deleteFlag, 'CloudFormation.deleteStack called')
  })

  it('should invoke deleteStack and error if describeStacks returns a status of DELETE_FAILED', async () => {
    let mockAws = mockHelpers.createMockAwsClient({
      CloudFormation: {
        DescribeStacks: () => Promise.resolve({
          Stacks: [ {
            StackName: 'PentagonSecurityStaging',
            StackStatus: 'DELETE_FAILED',
            StackStatusReason: 'task failed successfully',
            Outputs: [],
          } ],
        }),
        DeleteStack: mockHelpers.deleteStack(),
        DescribeStackResources: mockHelpers.dbTables([]),
      },
      ssm: {
        GetParameter: mockHelpers.deployBucket(false),
        GetParametersByPath: mockHelpers.ssmParams([]),
      },
      cloudwatchlogs: {
        DescribeLogGroups: mockHelpers.cloudwatchLogs([]),
      },
    })

    require.cache[require.resolve('@aws-lite/client')] = {
      id: require.resolve('@aws-lite/client'),
      filename: require.resolve('@aws-lite/client'),
      loaded: true,
      exports: () => Promise.resolve(mockAws),
    }

    require.cache[require.resolve('@architect/inventory')] = {
      id: require.resolve('@architect/inventory'),
      filename: require.resolve('@architect/inventory'),
      loaded: true,
      exports: mockInventory,
    }

    let destroy = require('../../src')

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          destroy(base, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      },
      (err) => {
        assert.match(err.message, /task failed successfully/, 'Delete failed reason provided')
        return true
      },
      'Error returned',
    )
  })
})
