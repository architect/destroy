let aws = require('aws-sdk')
let test = require('tape')

test('helper for me which I will delete', async t=> {
  t.plan(1)
  let cloudformation = new aws.CloudFormation({region: 'us-west-1'})
  cloudformation.describeStackResources({
    StackName: 'LearnBeginProduction'
  }, 
  function(err, data) {
    if (err) t.fail(err)
    else t.ok(true, 'got the stack')
    console.log(data.StackResources.map(t=> t.ResourceType).some(item=> item === 'AWS::DynamoDB::Table'))
  })

}) 
