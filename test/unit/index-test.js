let test = require('tape')
let mocks = require('./mocks')
let AWS = require('aws-sdk')
let aws = require('aws-sdk-mock')
aws.setSDKInstance(AWS)
let utils = require('@architect/utils')
let destroy = require('../../src')

let now = true
let base = {
  appname: 'pentagon-security',
  env: 'staging',
  now,
  update: {
    start: () => {},
    status: () => {},
    done: () => {}
  }
}

let StackName = utils.toLogicalID(`${base.appname}-${base.env}`)

test('destroy should throw if base parameters are not provided', t => {
  t.plan(2)
  t.throws(() => {
    destroy({ appname: 'poop', now })
  }, { message: 'Missing params.env' }, 'missing env error thrown')
  t.throws(() => {
    destroy({ env: 'staging', now })
  }, { message: 'Missing params.appname' }, 'missing appname error thrown')
})

test('destroy should error if describeStacks errors generically', t => {
  t.plan(1)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(true)
  })
  destroy(base, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('destroy should handle a non-existent Stack gracefully', t => {
  t.plan(2)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb({ code: 'ValidationError', message: `Stack with id ${StackName} does not exist` })
  })
  let deleteFlag = false
  aws.mock('CloudFormation', 'deleteStack', (params, cb) => {
    deleteFlag = true
    cb(null)
  })
  mocks.staticBucket(false) // no static bucket
  mocks.deployBucket(false) // no deploy bucket
  mocks.dbTables([]) // no tables
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  destroy(base, (err) => {
    t.notOk(err, 'no error raised')
    t.notOk(deleteFlag, 'CloudFormation.deleteStack was not called')
    aws.restore()
  })
})

test('destroy should error if static bucket exists and force is not provided', t => {
  t.plan(1)
  mocks.staticBucket('somebucketurl')
  mocks.dbTables([]) // no tables
  destroy(base, (err) => {
    t.equals(err.message, 'bucket_exists', 'bucket_exists error surfaced')
    aws.restore()
  })
})

test('destroy should delete static bucket contents and the bucket itself if static bucket exists and force is provided', t => {
  t.plan(2)
  mocks.staticBucket('somebucketurl')
  mocks.deployBucket(false) // no deploy bucket
  mocks.dbTables([]) // no tables
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  mocks.deleteStack()
  let S3objectDelete = false
  let S3delete = false
  aws.mock('S3', 'headBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (ps, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    S3objectDelete = true
    cb()
  })
  aws.mock('S3', 'deleteBucket', (params, cb) => {
    S3delete = params.Bucket
    cb()
  })
  let params = { ... base, force: true }
  destroy(params, () => {
    t.ok(S3objectDelete, 'S3.deleteObjects called')
    t.equals(S3delete, 'somebucketurl', 'S3.deleteBucket called for static bucket')
    aws.restore()
  })
})

test('destroy should delete deployment bucket contents and bucket itself if deployment bucket exists', t => {
  t.plan(2)
  mocks.staticBucket(false)
  mocks.deployBucket('myappdeploybucket') // no deploy bucket
  mocks.dbTables([]) // no tables
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  mocks.deleteStack()
  let S3objectDelete = false
  let S3delete = false
  aws.mock('S3', 'headBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (ps, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    S3objectDelete = true
    cb()
  })
  aws.mock('S3', 'deleteBucket', (params, cb) => {
    S3delete = params.Bucket
    cb()
  })
  destroy(base, () => {
    t.ok(S3objectDelete, 'S3.deleteObjects called')
    t.equals(S3delete, 'myappdeploybucket', 'S3.deleteBucket called for deployment bucket')
    aws.restore()
  })
})
test('destroy should error if describeStackResources errors', t => {
  t.plan(1)
  mocks.staticBucket(false) // no static bucket
  mocks.deployBucket(false) // no deploy bucket
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  aws.mock('CloudFormation', 'describeStackResources', (params, cb) => { cb(true) })
  destroy(base, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('destroy should error if DynamoDB tables exist and force is not provided', t => {
  t.plan(1)
  mocks.staticBucket(false) // no static bucket
  mocks.deployBucket(false) // no deploy bucket
  mocks.dbTables([ 'cats' ]) // one table
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  destroy(base, (err) => {
    t.equals(err.message, 'table_exists', 'table exists error surfaced')
    aws.restore()
  })
})

test('destroy should invoke deleteStack and return once describeStacks return a not found message', t => {
  t.plan(1)
  mocks.staticBucket(false) // no static bucket
  mocks.deployBucket(false) // no deploy bucket
  mocks.dbTables([]) // one table
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  let deleteFlag = false
  aws.mock('CloudFormation', 'deleteStack', (params, cb) => {
    deleteFlag = true
    cb(null)
  })
  destroy(base, () => {
    t.ok(deleteFlag, 'CloudFormation.deleteStack called')
    aws.restore()
  })
})

test('destroy should invoke deleteStack and error if describeStacks returns a status of DELETE_FAILED', t => {
  t.plan(2)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(null, { Stacks: [ {
      StackName: 'PentagonSecurityStaging',
      StackStatus: 'DELETE_FAILED',
      StackStatusReason: 'task failed successfully',
      Outputs: []
    } ] })
  })
  mocks.deployBucket(false) // no deploy bucket
  mocks.dbTables([]) // one table
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  mocks.deleteStack()
  destroy(base, (err) => {
    t.ok(err, 'Error returned')
    t.match(err.message, /task failed successfully/, 'Delete failed reason provided')
    aws.restore()
  })
})
