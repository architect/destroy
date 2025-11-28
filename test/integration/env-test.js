/*
 * Integration tests are disabled by default because they require:
 * - Valid AWS credentials
 * - Actual AWS resource creation and deletion
 * - @architect/deploy dependency
 *
 * These tests have been migrated to node:test syntax but remain commented out.
 * To run these tests, uncomment the code below and ensure you have:
 * 1. AWS credentials configured
 * 2. Appropriate AWS permissions
 * 3. Understanding that real AWS resources will be created and destroyed
 */

/*
let aws = require('aws-sdk')
let path = require('path')
let { describe, it } = require('node:test')
let assert = require('node:assert/strict')
let deploy = require('@architect/deploy')
let destroy = require('../..')

// this is important
const appname = 'DestroyTestingStaging'

describe('Integration tests', () => {
  it('should have destroy and deploy modules', () => {
    assert.ok(destroy, 'destroy module exists')
    assert.ok(deploy, 'deploy module exists')
  })

  it('should create the app', (t, done) => {
    let mockdir = path.join(__dirname, '..', 'mock')
    process.chdir(mockdir)
    deploy.sam({ tags: [] }, function errback (err) {
      if (err) {
        assert.fail(err)
      }
      else {
        assert.ok(true, 'app created successfully')
      }
      done()
    })
  })

  it('should verify the app was actually created', (t, done) => {
    let cloudformation = new aws.CloudFormation
    cloudformation.describeStacks({
      StackName: appname
    },
    function (err, data) {
      if (err) {
        assert.fail(err)
      }
      else {
        assert.strictEqual(data.Stacks[0].StackName, appname, 'got the stack')
      }
      done()
    })
  })

  it('should require name parameter', async () => {
    await assert.rejects(
      async () => {
        await destroy({})
      },
      'caught missing name'
    )
  })

  it('should destroy the app', (t, done) => {
    destroy({ name: appname, force: true }, function destroyed (err) {
      if (err) {
        assert.fail(err)
      }
      else {
        assert.ok(true, 'app destroyed successfully')
      }
      done()
    })
  })

  it('should verify the app is actually destroyed', (t, done) => {
    let cloudformation = new aws.CloudFormation
    cloudformation.describeStacks({
      StackName: appname
    },
    function (err) {
      let msg = 'Stack with id destroyTestingStaging does not exist'
      if (err && err.code === 'ValidationError' && err.message === msg) {
        assert.ok(true, 'stack successfully destroyed')
      }
      else if (err) {
        assert.fail(err)
      }
      else {
        assert.fail('stack still exists')
      }
      done()
    })
  })
})
*/
