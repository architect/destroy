let test = require('tape')
let aws = require('aws-sdk-mock')
let rm = require('../../src/_delete-bucket')

test('delete-bucket should callback with error if S3.listObjects errors', t => {
  t.plan(1)
  aws.mock('S3', 'headBucket', (params, cb) => cb(null, {}))
  aws.mock('S3', 'deleteBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(true)
  })
  rm({ bucket: 'crabsinmahbucket' }, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('delete-bucket should callback with nothing if S3.listObjects returns no results', t => {
  t.plan(1)
  aws.mock('S3', 'headBucket', (params, cb) => cb(null, {}))
  aws.mock('S3', 'deleteBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(null, { Contents: [] })
  })
  rm({ bucket: 'bucketlist' }, (err) => {
    t.notOk(err, 'no error surfaced')
    aws.restore()
  })
})

test('delete-bucket should callback with error if S3.deleteObjects errors', t => {
  t.plan(1)
  aws.mock('S3', 'headBucket', (params, cb) => cb(null, {}))
  aws.mock('S3', 'deleteBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    cb(true)
  })
  rm({ bucket: 'bucketlist' }, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('delete-bucket should callback with nothing if S3.deleteObjects doesnt error', t => {
  t.plan(1)
  aws.mock('S3', 'headBucket', (params, cb) => cb(null, {}))
  aws.mock('S3', 'deleteBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(null, { Contents: [ { Key: 'stone' }, { Key: 'lime' } ] })
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    cb()
  })
  rm({ bucket: 'bucketlist' }, (err) => {
    t.notOk(err, 'no error surfaced')
    aws.restore()
  })
})

test('delete-bucket should work even with buckets with more than 1000 items', t => {
  t.plan(2)
  let Contents = []
  for (let i = 0; i < 1337; i++) {
    Contents.push({ Key: '' + i })
  }
  aws.mock('S3', 'headBucket', (params, cb) => cb(null, {}))
  aws.mock('S3', 'deleteBucket', (params, cb) => cb(null))
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(null, {
      Contents: Contents.splice(0, 1000),
      IsTruncated: Contents.length > 0,
      NextContinuationToken: Contents.length > 0 ? 'show me the money!' : null
    })
  })
  let deleteCounter = 0
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    deleteCounter++
    cb()
  })
  rm({ bucket: 'bucketlist' }, (err) => {
    t.notOk(err, 'no error surfaced')
    t.equals(deleteCounter, 2, 'S3.deleteObjects called twice')
    aws.restore()
  })
})

test('delete-bucket should callback with nothing if bucket does not exist and not attempt to delete the bucket nor list nor delete its contents', t => {
  t.plan(4)
  let deleteCalled = false
  let listCalled = false
  let rmObjsCalled = false
  aws.mock('S3', 'headBucket', (params, cb) => cb(true))
  aws.mock('S3', 'deleteBucket', (params, cb) => {
    deleteCalled = true
    cb(null)
  })
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    listCalled = true
    cb(true)
  })
  aws.mock('S3', 'deleteObjects', (params, cb) => {
    rmObjsCalled = true
    cb(true)
  })
  rm({ bucket: 'crabsinmahbucket' }, (err) => {
    t.notOk(err, 'no error surfaced')
    t.notOk(deleteCalled, 'deleteBucket not invoked')
    t.notOk(listCalled, 'listObjects not invoked')
    t.notOk(rmObjsCalled, 'deleteObjects not invoked')
    aws.restore()
  })
})
