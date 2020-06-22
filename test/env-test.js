let aws = require('aws-sdk')
let path = require('path')
let test = require('tape')
let deploy = require('@architect/deploy')
let destroy = require('..')

// this is important
const appname = 'DestroyTestingStaging'

test('env', t => {
  t.plan(2)
  t.ok(destroy, 'destroy')
  t.ok(deploy, 'deploy')
})

test('create the app', t => {
  t.plan(1)
  let mockdir = path.join(__dirname, 'mock')
  process.chdir(mockdir)
  deploy.sam({ tags: [] }, function errback (err) {
    if (err) {
      t.fail(err)
    }
    else {
      t.ok(true)
    }
  })
})

test('verify the app did actually get really created', t => {
  t.plan(1)
  let cloudformation = new aws.CloudFormation
  cloudformation.describeStacks({
    StackName: appname
  },
  function (err, data) {
    if (err) t.fail(err)
    else t.ok(data.Stacks[0].StackName === appname, 'got the stack')
  })
})

test('must pass name', async t => {
  t.plan(1)
  try {
    await destroy({})
  }
  catch (e) {
    t.ok(true, 'caught missing name')
  }
})

test('destroy said app with our destroy module', t => {
  t.plan(1)
  destroy({ name: appname, force: true }, function destroyed (err) {
    if (err) t.fail(err)
    else t.ok(true)
  })
})

test('verify said app is actually destroyed', t => {
  t.plan(1)
  let cloudformation = new aws.CloudFormation
  cloudformation.describeStacks({
    StackName: appname
  },
  function (err) {
    let msg = 'Stack with id destroyTestingStaging does not exist'
    if (err && err.code == 'ValidationError' && err.message == msg) {
      t.ok(true)
    }
    else if (err) {
      t.fail(err)
    }
    else {
      t.fail('stack still exists')
    }
  })
})
