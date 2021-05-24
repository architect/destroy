let aws = require('aws-sdk')
let waterfall = require('run-waterfall')
let deleteBucket = require('./_delete-bucket')
let ssm = require('./_ssm')
let deleteLogs = require('./_delete-logs')
let { updater, toLogicalID  } = require('@architect/utils')

/**
 * @param {object} params - named parameters
 * @param {string} params.env - name of environment/stage to delete
 * @param {string} params.appname - name of arc app
 * @param {boolean} params.force - deletes app with impunity, regardless of tables or buckets
 */
module.exports = function destroy (params, callback) {
  let { appname, stackname, env, force = false, now, update } = params
  if (!update) update = updater('Destroy')

  // always validate input
  if (!env) {
    throw ReferenceError('Missing params.env')
  }
  if (!appname) {
    throw ReferenceError('Missing params.appname')
  }

  // StackName → AWS, stackname → user-specified
  let StackName = toLogicalID(`${appname}-${env}`)
  if (stackname) {
    StackName += toLogicalID(stackname)
  }

  // hack around no native promise in aws-sdk
  let promise
  if (!callback) {
    promise = new Promise(function ugh (res, rej) {
      callback = function errback (err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }

  // actual code
  let region = process.env.AWS_REGION
  let cloudformation = new aws.CloudFormation({ region })

  waterfall([
    // Warning
    function (callback) {
      if (now) {
        update.status(`Destroying ${StackName} immediately, hope you know what you're doing!`)
        callback()
      }
      else {
        update.status(`Destroying ${StackName} in 5 seconds...`)
        setTimeout(() => {
          callback()
        }, 5000)
      }
    },

    // check for the stack
    function (callback) {
      update.status(`Destroying ${StackName}`)
      cloudformation.describeStacks({
        StackName
      },
      function (err, data) {
        if (err) callback(err)
        else {
          let bucket = o => o.OutputKey === 'BucketURL'
          let hasBucket = data.Stacks[0].Outputs.find(bucket)
          callback(null, hasBucket)
        }
      })
    },

    // delete static assets
    function (bucketExists, callback) {
      if (bucketExists && force) {
        let bucket = bucketExists.OutputValue.replace('http://', '').replace('https://', '').split('.')[0]
        update.status('Deleting static S3 bucket...')
        deleteBucket({
          bucket
        }, callback)
      }
      else if (bucketExists && !force) {
        // throw a big error here
        callback(Error('bucket_exists'))
      }
      else {
        callback()
      }
    },

    // look up the deployment bucket name from SSM and delete that
    function (callback) {
      update.status('Retrieving deployment bucket...')
      ssm.getDeployBucket(appname, callback)
    },

    // wipe the deployment bucket and delete it
    function (deploymentBucket, callback) {
      if (deploymentBucket) {
        update.status('Deleting deployment S3 bucket...')
        deleteBucket({ bucket: deploymentBucket }, callback)
      }
      else callback()
    },

    // destroy all SSM Parameters associated to app
    function (callback) {
      update.status('Deleting SSM parameters...')
      ssm.deleteAll(appname, env, callback)
    },

    // destroy all cloudwatch log groups
    function (callback) {
      update.status('Deleting CloudWatch log groups...')
      deleteLogs({ StackName, update }, callback)
    },

    // check for dynamodb tables
    function (callback) {
      cloudformation.describeStackResources({
        StackName
      },
      function (err, data) {
        if (err) callback(err)
        else {
          let type = t => t.ResourceType
          let table = i => i === 'AWS::DynamoDB::Table'
          let hasTables = data.StackResources.map(type).some(table)
          callback(null, hasTables)
        }
      })
    },

    function (hasTables, callback) {
      if (hasTables && !force) {
        callback(Error('table_exists'))
      }
      else {
        // got this far, delete everything
        update.start(`Destroying CloudFormation Stack ${StackName}...`)
        cloudformation.deleteStack({
          StackName,
        },
        function (err) {
          if (err) callback(err)
          else callback()
        })
      }
    },

    // poll for progress
    function (callback) {
      let tries = 1
      let max = 6
      function checkit () {
        cloudformation.describeStacks({
          StackName
        },
        function done (err) {
          let msg = `Stack with id ${StackName} does not exist` // Specific AWS message
          if (err && err.code == 'ValidationError' && err.message == msg) {
            update.done(`Successfully destroyed ${StackName}`)
            callback()
          }
          else {
            setTimeout(function delay () {
              if (tries === max) {
                callback(Error('Destroy failed; hit max retries'))
              }
              else {
                tries += 1
                checkit()
              }
            }, 10000 * tries)
          }
        })
      }
      checkit()
    }

  ], callback)

  // only happens if there is no callback
  return promise
}
