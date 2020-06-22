#!/usr/bin/env node
let parser = require('@architect/parser')
let utils = require('@architect/utils')
let nuke = require('./index')

let forcers = p => [ '-f', '--force', 'force' ].includes(p)
let force = process.argv.some(forcers)
let result = parser.read()
let env = process.env.NODE_ENV === 'production' ? 'production' : 'staging'
let name = utils.toLogicalID(`${result.arc.app[0]}-${env}`)

;(async function main () {
  try {
    await nuke({ name, force })
  }
  catch (e) {
    if (e && e.message === 'bucket_exists') {
      console.log('Error! Static bucket exists. Use --force to delete.')
    }
    else if (e && e.message === 'table_exists') {
      console.log('Error! Table(s) exist. Use --force to delete.')
    }
    else {
      console.error(e)
    }
  }
})()
