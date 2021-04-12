let aws = require('aws-sdk')
let waterfall = require('run-waterfall')

module.exports = function deleteBucketContents ({ bucket }, callback) {

  let region = process.env.AWS_REGION
  let s3 = new aws.S3({ region })

  let objects = []
  let bucketExists = false
  function ensureBucket (callback) {
    s3.headBucket({ Bucket: bucket }, function done (err) {
      if (err) bucketExists = false
      else bucketExists = true
      callback(null)
    })
  }

  function collectObjects (ContinuationToken, callback) {
    s3.listObjectsV2({
      Bucket: bucket,
      ContinuationToken
    }, function done (err, result) {
      if (err) {
        callback(err)
      }
      else {
        objects = objects.concat(result.Contents)
        if (result.IsTruncated) {
          collectObjects(result.NextContinuationToken, callback)
        }
        else {
          callback(null, objects.map(item => ({ Key: item.Key })))
        }
      }
    })
  }

  function deleteObjects (objs, callback) {
    let batch = objs.splice(0, 1000) // S3.deleteObjects supports up to 1k keys
    s3.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: batch
      }
    },
    function done (err) {
      if (err) callback(err)
      else if (objs.length) {
        deleteObjects(objs, callback)
      }
      else callback()
    })
  }

  waterfall([
    function checkBucketExists (callback) {
      ensureBucket(callback)
    },

    function maybeCollectObjectsInBucket (callback) {
      if (bucketExists) collectObjects(null, callback)
      else callback(null, [])
    },

    function maybeDeleteBucketObjects (stuffToDelete, callback) {
      if (bucketExists && Array.isArray(stuffToDelete) && stuffToDelete.length > 0) {
        deleteObjects(stuffToDelete, callback)
      }
      else {
        callback()
      }
    },

    function maybeDeleteBucket (callback) {
      if (bucketExists) {
        s3.deleteBucket({ Bucket: bucket }, function (err) {
          if (err) callback(err)
          else callback()
        })
      }
      else callback()
    }
  ], callback)
}
