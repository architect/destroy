let aws = require('aws-sdk')
let waterfall = require('run-waterfall')
let deleteBucket = require('./_delete-bucket')
let ssm = require('./_ssm')
let deleteLogs = require('./_delete-logs')
let { updater, toLogicalID  } = require('@architect/utils')

function stackNotFound (StackName, err) {
  if (err && err.code == 'ValidationError' && err.message == `Stack with id ${StackName} does not exist`) {
    return true
  }
  return false
}
/**
 * @param {object} params - named parameters
 * @param {string} params.env - name of environment/stage to delete
 * @param {string} params.appname - name of arc app
 * @param {boolean} params.force - deletes app with impunity, regardless of tables or buckets
 */
module.exports = function destroy (params, callback) {
  let { appname, stackname, env, force = false, now, retries, update } = params
  if (!update) update = updater('Destroy')

  // always validate input
  if (!env) {
    throw ReferenceError('Missing params.env')
  }
  if (!appname) {
    throw ReferenceError('Missing params.appname')
  }

  // StackName → AWS, stackname → user-specified suffix (via --name param)
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

  let stackExists
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
        if (stackNotFound(StackName, err)) {
          stackExists = false
          callback(null, false)
        }
        else if (err) callback(err)
        else callback(null, data.Stacks[0])
      })
    },

    // check for dynamodb tables and if force flag not provided, error out
    function (stack, callback) {
      if (stack) {
        stackExists = true
        cloudformation.describeStackResources({
          StackName
        },
        function (err, data) {
          if (err) callback(err)
          else {
            let type = t => t.ResourceType
            let table = i => i === 'AWS::DynamoDB::Table'
            let hasTables = data.StackResources.map(type).some(table)

            if (hasTables && !force) callback(Error('table_exists'))
            else callback(null, stack)
          }
        })
      }
      else callback(null, stack)
    },

    // check if static bucket exists in stack
    function (stack, callback) {
      if (stack) {
        let bucket = o => o.OutputKey === 'BucketURL'
        let hasBucket = stack.Outputs.find(bucket)
        callback(null, hasBucket)
      }
      else callback(null, false)
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

    // finally, destroy the cloudformation stack
    function (callback) {
      if (stackExists) {
        update.start(`Destroying CloudFormation Stack ${StackName}...`)
        cloudformation.deleteStack({
          StackName,
        },
        function (err) {
          if (err) callback(err)
          else callback(null, true)
        })
      }
      else callback(null, false)
    },

    // poll for destroy progress in case we are in the process of destroying a stack
    function (destroyInProgress, callback) {
      if (!destroyInProgress) return callback()
      let tries = 1
      let max = retries // typical values are 15 or 999; see cli.js
      function checkit () {
        cloudformation.describeStacks({
          StackName
        },
        function done (err, result) {
          if (stackNotFound(StackName, err)) {
            update.done(`Successfully destroyed ${StackName}`)
            return callback()
          }
          if (!err && result.Stacks) {
            let stack = result.Stacks.find(s => s.StackName === StackName)
            if (stack && stack.StackStatus === 'DELETE_FAILED') {
              return callback(Error(`CloudFormation Stack "${StackName}" destroy failed: ${stack.StackStatusReason}`))
            }
          }
          setTimeout(function delay () {
            if (tries === max) {
              callback(Error(`CloudFormation Stack destroy still ongoing; aborting as we hit max number of retries (${max})`))
            }
            else {
              tries += 1
              checkit()
            }
          }, 10000)
        })
      }
      checkit()
    }

  ], callback)

  // only happens if there is no callback
  return promise
}
