let aws = require('aws-sdk')
let test = require('tape')

test('helper for me which I will delete', async t=> {
  t.plan(1)
  let url = 'http://nuketestingstaging-staticbucket-159i0fxw7a43x.s3-website-us-east-1.amazonaws.com'
  let Bucket = url.replace('http://', '').split('.')[0]
  let s3 = new aws.S3
  let result = await s3.listObjectsV2({ Bucket }).promise()
  console.log(result)
  t.ok(true)
}) 
