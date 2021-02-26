let test = require('tape')
let aws = require('aws-sdk-mock')
let rm = require('../../src/_delete-bucket-contents')

test('delete-bucket-contents should callback with error if S3.listObjects errors', t => {
  t.plan(1)
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(true)
  })
  rm({ bucket: 'crabsinmahbucket' }, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('delete-bucket-contents should callback with nothing if S3.listObjects returns no results', t => {
  t.plan(1)
  aws.mock('S3', 'listObjectsV2', (params, cb) => {
    cb(null, { Contents: [] })
  })
  rm({ bucket: 'bucketlist' }, (err) => {
    t.notOk(err, 'no error surfaced')
    aws.restore()
  })
})

test('delete-bucket-contents should callback with error if S3.deleteObjects errors', t => {
  t.plan(1)
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

test('delete-bucket-contents should callback with nothing if S3.deleteObjects doesnt error', t => {
  t.plan(1)
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
