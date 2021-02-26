let test = require('tape')
let aws = require('aws-sdk-mock')
let destroy = require('../../src')

let base = {
  name: 'pentagon-security',
  update: {
    start: () => {},
    status: () => {},
    done: () => {}
  }
}

test('destroy should throw if no StackName provided', t => {
  t.plan(1)
  t.throws(() => {
    destroy({ name: false })
  }, { message: 'Missing params.name' }, 'error thrown')
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
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(null, {
      Stacks: [ { Outputs: [ { OutputKey: 'BucketURL', OutputValue: 'mybucketurl' } ] } ]
    })
  })
  destroy(base, (err) => {
    t.equals(err.message, 'bucket_exists', 'bucket_exists error surfaced')
    aws.restore()
  })
})

test('destroy should delete static bucket contents if static bucket exists and force is provided', t => {
  t.plan(1)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(null, {
      Stacks: [ { Outputs: [ { OutputKey: 'BucketURL', OutputValue: 'mybucketurl' } ] } ]
    })
  })
  let S3flag = false
  aws.mock('S3', 'listObjectsV2', (ps, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    S3flag = true
    cb()
  })
  // error out at next CFN step to avoid triggering the rest of the logic
  aws.mock('CloudFormation', 'describeStackResources', (params, cb) => { cb(true) })
  let params = { ... base, force: true }
  destroy(params, () => {
    t.ok(S3flag, 'S3.deleteObjects called')
    aws.restore()
  })
})

test('destroy should error if describeStackResources errors', t => {
  t.plan(1)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(null, {
      Stacks: [ { Outputs: [] } ]
    })
  })
  aws.mock('CloudFormation', 'describeStackResources', (params, cb) => { cb(true) })
  destroy(base, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('destroy should error if DynamoDB tables exist and force is not provided', t => {
  t.plan(1)
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    cb(null, {
      Stacks: [ { Outputs: [] } ]
    })
  })
  aws.mock('CloudFormation', 'describeStackResources', (params, cb) => {
    cb(null, {
      StackResources: [ { ResourceType: 'AWS::DynamoDB::Table' } ]
    })
  })
  destroy(base, (err) => {
    t.equals(err.message, 'table_exists', 'table exists error surfaced')
    aws.restore()
  })
})

test('destroy should invoke deleteStack', t => {
  t.plan(1)
  let describeCounter = 0
  aws.mock('CloudFormation', 'describeStacks', (ps, cb) => {
    if (describeCounter === 0) {
      describeCounter++
      cb(null, {
        Stacks: [ { Outputs: [] } ]
      })
    }
    else {
      cb({
        code: 'ValidationError',
        message: `Stack with id ${base.name} does not exist`
      })
    }
  })
  aws.mock('CloudFormation', 'describeStackResources', (params, cb) => {
    cb(null, {
      StackResources: [ ]
    })
  })
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
