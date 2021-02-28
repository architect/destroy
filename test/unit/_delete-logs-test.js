let test = require('tape')
let aws = require('aws-sdk-mock')
let rm = require('../../src/_delete-logs')

// helper mocking functions
function fakeLogGroups (groups) {
  aws.mock('CloudWatchLogs', 'describeLogGroups', (params, cb) => cb(null, { logGroups: groups.map(g => ({ logGroupName: g })) }))
}

test('delete-logs should callback with error if describeLogGroups errors', t => {
  t.plan(1)
  aws.mock('CloudWatchLogs', 'describeLogGroups', (params, cb) => {
    cb(true)
  })
  rm({ StackName: 'phatstax' }, (err) => {
    t.ok(err, 'error surfaced')
    aws.restore()
  })
})

test('delete-logs should callback with nothing if describeLogGroups returns no results', t => {
  t.plan(1)
  fakeLogGroups([])
  rm({ StackName: 'stackdatcheese' }, (err) => {
    t.notOk(err, 'no error surfaced')
    aws.restore()
  })
})

test('delete-logs should warn if deleteLogGroup errors', t => {
  t.plan(1)
  fakeLogGroups([ 'lambda-group-one' ])
  aws.mock('CloudWatchLogs', 'deleteLogGroup', (params, cb) => {
    cb('yikes')
  })
  let warnings = []
  rm({ StackName: 'jamstackftw', update: { warn: (msg) => warnings.push(msg) } }, () => {
    t.equals(warnings[0], 'yikes', 'error warned')
    aws.restore()
  })
})

test('delete-logs should callback with nothing if deleteLogGroups doesnt error', t => {
  t.plan(2)
  fakeLogGroups([ 'lambda-group-one' ])
  aws.mock('CloudWatchLogs', 'deleteLogGroup', (params, cb) => {
    cb(null)
  })
  let warnings = []
  rm({ StackName: 'jamstackftw', update: { warn: (msg) => warnings.push(msg) } }, (err) => {
    t.equals(warnings.length, 0, 'no errors raised')
    t.notOk(err, 'no error passed to callback')
    aws.restore()
  })
})
