let aws = require('aws-sdk')

module.exports = function deleteLogs ({ StackName, update }, callback) {
  let cloudwatch = new aws.CloudWatchLogs()
  let logGroups = []
  function getLogs (nextToken, cb) {
    let params = {
      logGroupNamePrefix: `/aws/lambda/${StackName}-`
    }
    if (nextToken) params.nextToken = nextToken
    cloudwatch.describeLogGroups(params, function (err, data) {
      if (err) cb(err)
      else {
        data.logGroups.forEach(l => {
          logGroups.push(l.logGroupName)
        })
        if (data.nextToken) getLogs(data.nextToken, cb)
        else cb()
      }
    })
  }
  getLogs(null, function (err) {
    if (err) callback(err)
    else if (logGroups.length) {
      let timer = 0
      let numComplete = 0
      logGroups.forEach(log => {
        timer += 400 // max of about 2-3 transactions per second :/
        let params = { logGroupName: log }
        setTimeout(function delayedDelete () {
          cloudwatch.deleteLogGroup(params, function (err /* , data */) {
            if (err) update.warn(err)
            numComplete++
            if (logGroups.length === numComplete) callback()
          })
        }, timer)
      })
    }
    else callback()
  })
}
