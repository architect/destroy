let aws = require('aws-sdk')
let waterfall = require('run-waterfall')

module.exports = function deleteBucketContents ({ bucket }, callback) {

  let region = process.env.AWS_REGION
  let s3 = new aws.S3({ region })

  let objects = []
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
    function (callback) {
      collectObjects(null, callback)
    },

    function (stuffToDelete, callback) {
      if (Array.isArray(stuffToDelete) && stuffToDelete.length > 0) {
        deleteObjects(stuffToDelete, callback)
      }
      else {
        callback()
      }
    }
  ], callback)
}
