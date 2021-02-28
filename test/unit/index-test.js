let test = require('tape')
let mocks = require('./mocks')
let aws = require('aws-sdk-mock')
let destroy = require('../../src')

let base = {
  appname: 'pentagon-security',
  env: 'staging',
  update: {
    start: () => {},
    status: () => {},
    done: () => {}
  }
}

test('destroy should throw if base parameters are not provided', t => {
  t.plan(2)
  t.throws(() => {
    destroy({ appname: 'poop' })
  }, { message: 'Missing params.env' }, 'missing env error thrown')
  t.throws(() => {
    destroy({ env: 'staging' })
  }, { message: 'Missing params.appname' }, 'missing appname error thrown')
})

test('destroy should error if describeStacks errors', t => {
  t.plan(1)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(true)
  })
  destroy(base, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('destroy should error if static bucket exists and force is not provided', t => {
  t.plan(1)
  mocks.staticBucket('somebucketurl')
  destroy(base, (err) => {
    t.equals(err.message, 'bucket_exists', 'bucket_exists error surfaced')
    aws.restore()
  })
})

test('destroy should delete static bucket contents if static bucket exists and force is provided', t => {
  t.plan(1)
  mocks.staticBucket('somebucketurl')
  mocks.deployBucket(false) // no deploy bucket
  mocks.dbTables([]) // no tables
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  mocks.deleteStack()
  let S3flag = false
  aws.mock('S3', 'listObjectsV2', (ps, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    S3flag = true
    cb()
  })
  let params = { ... base, force: true }
  destroy(params, () => {
    t.ok(S3flag, 'S3.deleteObjects called')
    aws.restore()
  })
})

test('destroy should delete deployment bucket contents if deployment bucket exists', t => {
  t.plan(1)
  mocks.staticBucket(false)
  mocks.deployBucket('myappdeploybucket') // no deploy bucket
  mocks.dbTables([]) // no tables
  mocks.ssmParams([]) // no params
  mocks.cloudwatchLogs([]) // no logs
  mocks.deleteStack()
  let S3flag = false
  aws.mock('S3', 'listObjectsV2', (ps, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    S3flag = true
    cb()
  })
  destroy(base, () => {
    t.ok(S3flag, 'S3.deleteObjects called')
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

test('destroy should invoke deleteStack', t => {
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
