let test = require('tape')
let awsLite = require('@aws-lite/client')
let inventory = require('@architect/inventory')
let destroy = require('../../')

// Store original console.log to capture output
let originalLog = console.log
let capturedOutput = []

function captureOutput () {
  capturedOutput = []
  console.log = function (...args) {
    capturedOutput.push(args.join(' '))
  }
}

function restoreOutput () {
  console.log = originalLog
}

function getOutputCount () {
  return capturedOutput.length
}

function getOutputContent () {
  return capturedOutput.join('\n')
}

test('Set up env', async t => {
  t.plan(1)
  awsLite.testing.enable()
  t.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')
})

test('destroy with quiet=false shows output', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })

  captureOutput()

  try {
    await destroy({
      appname: 'test-app',
      env: 'staging',
      quiet: false, // Explicitly not quiet
      credentials: {
        accessKeyId: 'ASIATEST123456789',
        secretAccessKey: 'testSecretKey123456789',
        sessionToken: 'testSessionToken123456789',
      },
      inventory: inv,
      now: true, // Skip the 5-second delay for testing
    })
  }
  catch {
    // Expected to fail since we're not destroying real resources
    // But we should have captured output
  }

  restoreOutput()

  let outputCount = getOutputCount()
  let outputContent = getOutputContent()

  t.ok(outputCount > 0, `Non-quiet mode shows output (${outputCount} messages)`)
  t.ok(outputContent.includes('Destroy'), `Output contains destroy messages: ${outputContent.substring(0, 100)}...`)
})

test('destroy with quiet=true suppresses output', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })

  captureOutput()

  try {
    await destroy({
      appname: 'test-app',
      env: 'staging',
      quiet: true, // Quiet mode
      credentials: {
        accessKeyId: 'ASIATEST123456789',
        secretAccessKey: 'testSecretKey123456789',
        sessionToken: 'testSessionToken123456789',
      },
      inventory: inv,
      now: true, // Skip the 5-second delay for testing
    })
  }
  catch {
    // Expected to fail since we're not destroying real resources
    // But output should be suppressed
  }

  restoreOutput()

  let outputCount = getOutputCount()
  let outputContent = getOutputContent()

  t.equal(outputCount, 0, `Quiet mode suppresses output (${outputCount} messages)`)
  t.notOk(outputContent.includes('Destroy'), `No destroy messages in quiet mode: "${outputContent}"`)
})

test('destroy with default (no quiet param) shows output', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })

  captureOutput()

  try {
    await destroy({
      appname: 'test-app',
      env: 'staging',
      // No quiet parameter - should default to showing output
      credentials: {
        accessKeyId: 'ASIATEST123456789',
        secretAccessKey: 'testSecretKey123456789',
        sessionToken: 'testSessionToken123456789',
      },
      inventory: inv,
      now: true, // Skip the 5-second delay for testing
    })
  }
  catch {
    // Expected to fail since we're not destroying real resources
  }

  restoreOutput()

  let outputCount = getOutputCount()
  let outputContent = getOutputContent()

  t.ok(outputCount > 0, `Default mode shows output (${outputCount} messages)`)
  t.ok(outputContent.includes('Destroy'), `Output contains destroy messages`)
})

test('Teardown', t => {
  t.plan(1)
  awsLite.testing.disable()
  awsLite.testing.reset()
  t.notOk(awsLite.testing.isEnabled(), 'AWS client testing disabled')
})
