let { describe, it } = require('node:test')
let assert = require('node:assert/strict')
let { createMockAwsClient } = require('../helpers/mocks')
let ssm = require('../../src/_ssm')

describe('_ssm', () => {
  describe('getDeployBucket', () => {
    it('should error if SSM.GetParameter errors', (t, done) => {
      let mockAws = createMockAwsClient({
        ssm: {
          GetParameter: () => Promise.reject(new Error('SSM error')),
        },
      })

      ssm.getDeployBucket(mockAws, 'appname', (err) => {
        assert.ok(err, 'error surfaced')
        done()
      })
    })

    it('should return null if SSM.GetParameter cannot be found', (t, done) => {
      let mockAws = createMockAwsClient({
        ssm: {
          GetParameter: () => Promise.reject({ code: 'ParameterNotFound' }),
        },
      })

      ssm.getDeployBucket(mockAws, 'appname', (err) => {
        assert.ok(!err, 'error not surfaced')
        done()
      })
    })

    it('should return the deploy bucket parameter value if it exists', (t, done) => {
      let mockAws = createMockAwsClient({
        ssm: {
          GetParameter: () => Promise.resolve({ Parameter: { Value: 'dfv' } }),
        },
      })

      ssm.getDeployBucket(mockAws, 'appname', (err, val) => {
        assert.ok(!err, 'no error surfaced')
        assert.strictEqual(val, 'dfv', 'parameter value returned')
        done()
      })
    })
  })

  describe('deleteAll', () => {
    it('should gracefully handle no parameters being found', (t, done) => {
      let mockAws = createMockAwsClient({
        ssm: {
          GetParametersByPath: () => Promise.reject({ code: 'ParameterNotFound' }),
          DeleteParameters: () => Promise.resolve({}),
        },
      })

      ssm.deleteAll(mockAws, 'appname', 'staging', (err) => {
        assert.ok(!err, 'no error surfaced')
        done()
      })
    })

    it('should delete all collected params', (t, done) => {
      let paramsDeleted = []
      let mockAws = createMockAwsClient({
        ssm: {
          GetParametersByPath: () => Promise.resolve({ Parameters: [ { Name: 'bond' } ] }),
          DeleteParameters: (params) => {
            paramsDeleted = params.Names
            return Promise.resolve({})
          },
        },
      })

      ssm.deleteAll(mockAws, 'appname', 'staging', (err) => {
        assert.ok(!err, 'no error surfaced')
        assert.ok(paramsDeleted.includes('bond'), 'parameter returned by getParametersByPath passed into deleteParameters')
        done()
      })
    })

    it('should handle SSM parameter paths that contain more than 10 parameters (recursive collect)', (t, done) => {
      let paramsDeleted = []
      let appParams = []
      for (let i = 0; i < 13; i++) {
        appParams.push(`param${i}`)
      }

      let mockAws = createMockAwsClient({
        ssm: {
          GetParametersByPath: () => {
            let batch = appParams.splice(0, 10)
            return Promise.resolve({
              Parameters: batch.map(p => ({ Name: p })),
              NextToken: appParams.length > 0 ? 'moarplz' : null,
            })
          },
          DeleteParameters: (params) => {
            paramsDeleted = paramsDeleted.concat(params.Names)
            return Promise.resolve({})
          },
        },
      })

      ssm.deleteAll(mockAws, 'appname', 'staging', (err) => {
        assert.ok(!err, 'no error surfaced')
        assert.strictEqual(paramsDeleted.length, 13, '<number of app params> deleted')
        done()
      })
    })
  })
})
