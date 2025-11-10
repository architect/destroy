let test = require('tape')
let proxyquire = require('proxyquire')
let inventory = require('@architect/inventory')

let awsLiteArgs = []
let mockAwsLite = (args) => {
  awsLiteArgs.push(args)
  return Promise.resolve({
    cloudformation: { DescribeStacks: ({ StackName }) => Promise.reject({ code: 'ValidationError', message: `Stack with id ${StackName} does not exist` }) },
    CloudFormation: { DescribeStacks: ({ StackName }) => Promise.reject({ code: 'ValidationError', message: `Stack with id ${StackName} does not exist` }) },
    ssm: {
      GetParameter: () => Promise.resolve({
        Parameter: {
          Value: 'test-bucket-name',
        },
      }),
      GetParametersByPath: () => Promise.resolve({ Parameters: [] }),
    },
    s3: {
      HeadBucket: () => Promise.reject({ code: 'NotFound' }),
    },
    cloudwatchlogs: {
      DescribeLogGroups: () => Promise.resolve({ logGroups: [] }),
    },
  })
}

let destroy = proxyquire('../../', {
  '@aws-lite/client': mockAwsLite,
})

test('destroy credentials accepted', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })
  try {

    await destroy({
      appname: 'test-app',
      env: 'staging',
      credentials: {
        accessKeyId: 'ASIATEST123456789',
        secretAccessKey: 'testSecretKey123456789',
        sessionToken: 'testSessionToken123456789',
      },
      inventory: inv,
      now: true, // Skip the 5-second delay for testing
      dryRun: true,
      region: 'ca-central-1',
    })

    t.ok(awsLiteArgs[0].region, 'region is present')
    t.equal(awsLiteArgs[0].region, 'ca-central-1', 'region is set correctly')
  }
  catch (err) {

    t.fail('Destroy failed: ' + err.message)
  }
})
