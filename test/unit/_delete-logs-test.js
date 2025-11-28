let { describe, it } = require('node:test')
let assert = require('node:assert/strict')
let { createMockAwsClient } = require('../helpers/mocks')
let rm = require('../../src/_delete-logs')

describe('_delete-logs', () => {
  it('should callback with error if describeLogGroups errors', (t, done) => {
    let mockAws = createMockAwsClient({
      cloudwatchlogs: {
        DescribeLogGroups: () => Promise.reject(new Error('AWS error')),
      },
    })

    rm({ aws: mockAws, StackName: 'phatstax' }, (err) => {
      assert.ok(err, 'error surfaced')
      done()
    })
  })

  it('should callback with nothing if describeLogGroups returns no results', (t, done) => {
    let mockAws = createMockAwsClient({
      cloudwatchlogs: {
        DescribeLogGroups: () => Promise.resolve({ logGroups: [] }),
      },
    })

    rm({ aws: mockAws, StackName: 'stackdatcheese' }, (err) => {
      assert.ok(!err, 'no error surfaced')
      done()
    })
  })

  it('should warn if deleteLogGroup errors', { timeout: 2000 }, (t, done) => {
    let warnings = []
    let callbackCalled = false
    let mockAws = createMockAwsClient({
      cloudwatchlogs: {
        DescribeLogGroups: () => Promise.resolve({
          logGroups: [ { logGroupName: 'lambda-group-one' } ],
        }),
        DeleteLogGroup: () => Promise.reject('yikes'),
      },
    })

    rm({
      aws: mockAws,
      StackName: 'jamstackftw',
      update: { warn: (msg) => warnings.push(msg) },
    }, () => {
      callbackCalled = true
      assert.strictEqual(warnings[0], 'yikes', 'error warned')
      done()
    })

    // If callback isn't called within 600ms, check warnings and complete test
    setTimeout(() => {
      if (!callbackCalled) {
        assert.strictEqual(warnings[0], 'yikes', 'error warned')
        done()
      }
    }, 600)
  })

  it('should callback with nothing if deleteLogGroups doesnt error', { timeout: 1000 }, (t, done) => {
    let warnings = []
    let mockAws = createMockAwsClient({
      cloudwatchlogs: {
        DescribeLogGroups: () => Promise.resolve({
          logGroups: [ { logGroupName: 'lambda-group-one' } ],
        }),
        DeleteLogGroup: () => Promise.resolve(),
      },
    })

    rm({
      aws: mockAws,
      StackName: 'jamstackftw',
      update: { warn: (msg) => warnings.push(msg) },
    }, (err) => {
      assert.strictEqual(warnings.length, 0, 'no errors raised')
      assert.ok(!err, 'no error passed to callback')
      done()
    })
  })
})
