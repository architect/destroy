let { describe, it, afterEach } = require('node:test')
let assert = require('node:assert/strict')
let { createMockAwsClient } = require('../helpers/mocks')
let rm = require('../../src/_delete-bucket')

describe('delete-bucket', () => {
  let mockAws

  afterEach(() => {
    mockAws = null
  })

  it('should callback with error if S3.listObjects errors', (t, done) => {
    mockAws = createMockAwsClient({
      s3: {
        HeadBucket: () => Promise.resolve({}),
        ListObjectsV2: () => Promise.reject(new Error('S3 error')),
        DeleteBucket: () => Promise.resolve({}),
      },
    })

    rm({ bucket: 'crabsinmahbucket', aws: mockAws }, (err) => {
      assert.ok(err, 'error surfaced')
      done()
    })
  })

  it('should callback with nothing if S3.listObjects returns no results', (t, done) => {
    mockAws = createMockAwsClient({
      s3: {
        HeadBucket: () => Promise.resolve({}),
        ListObjectsV2: () => Promise.resolve({ Contents: [] }),
        DeleteBucket: () => Promise.resolve({}),
      },
    })

    rm({ bucket: 'bucketlist', aws: mockAws }, (err) => {
      assert.ok(!err, 'no error surfaced')
      done()
    })
  })

  it('should callback with error if S3.deleteObjects errors', (t, done) => {
    mockAws = createMockAwsClient({
      s3: {
        HeadBucket: () => Promise.resolve({}),
        ListObjectsV2: () => Promise.resolve({ Contents: [ { Key: 'stone' }, { Key: 'lime' } ] }),
        DeleteObjects: () => Promise.reject(new Error('Delete error')),
        DeleteBucket: () => Promise.resolve({}),
      },
    })

    rm({ bucket: 'bucketlist', aws: mockAws }, (err) => {
      assert.ok(err, 'error surfaced')
      done()
    })
  })

  it('should callback with nothing if S3.deleteObjects doesnt error', (t, done) => {
    mockAws = createMockAwsClient({
      s3: {
        HeadBucket: () => Promise.resolve({}),
        ListObjectsV2: () => Promise.resolve({ Contents: [ { Key: 'stone' }, { Key: 'lime' } ] }),
        DeleteObjects: () => Promise.resolve({}),
        DeleteBucket: () => Promise.resolve({}),
      },
    })

    rm({ bucket: 'bucketlist', aws: mockAws }, (err) => {
      assert.ok(!err, 'no error surfaced')
      done()
    })
  })

  it('should work even with buckets with more than 1000 items', (t, done) => {
    let Contents = []
    for (let i = 0; i < 1337; i++) {
      Contents.push({ Key: '' + i })
    }

    let deleteCounter = 0
    mockAws = createMockAwsClient({
      s3: {
        HeadBucket: () => Promise.resolve({}),
        // When paginate: true is used, @aws-lite/client returns all items in Contents
        ListObjectsV2: () => Promise.resolve({ Contents }),
        DeleteObjects: () => {
          deleteCounter++
          return Promise.resolve({})
        },
        DeleteBucket: () => Promise.resolve({}),
      },
    })

    rm({ bucket: 'bucketlist', aws: mockAws }, (err) => {
      assert.ok(!err, 'no error surfaced')
      assert.strictEqual(deleteCounter, 2, 'S3.deleteObjects called twice')
      done()
    })
  })

  it('should callback with nothing if bucket does not exist and not attempt to delete the bucket nor list nor delete its contents', (t, done) => {
    let deleteCalled = false
    let listCalled = false
    let rmObjsCalled = false

    mockAws = createMockAwsClient({
      s3: {
        HeadBucket: () => Promise.reject(new Error('Bucket does not exist')),
        ListObjectsV2: () => {
          listCalled = true
          return Promise.reject(new Error('Should not be called'))
        },
        DeleteObjects: () => {
          rmObjsCalled = true
          return Promise.reject(new Error('Should not be called'))
        },
        DeleteBucket: () => {
          deleteCalled = true
          return Promise.resolve({})
        },
      },
    })

    rm({ bucket: 'crabsinmahbucket', aws: mockAws }, (err) => {
      assert.ok(!err, 'no error surfaced')
      assert.ok(!deleteCalled, 'deleteBucket not invoked')
      assert.ok(!listCalled, 'listObjects not invoked')
      assert.ok(!rmObjsCalled, 'deleteObjects not invoked')
      done()
    })
  })
})
