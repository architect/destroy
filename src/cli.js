#!/usr/bin/env node
let { read } = require('@architect/parser')
let { banner, toLogicalID, updater } = require('@architect/utils')
let { version } = require('../package.json')
let { arc } = read()
let destroy = require('./index')
let update = updater('Destroy')

// Args
let args = process.argv

let findName = p => p === '--name'
let named = args.includes('--name') && (args[args.findIndex(findName) + 1] === arc.app[0])

let forces = p => [ '-f', '--force', 'force' ].includes(p)
let force = args.some(forces)

let production = args.includes('--production')

;(async function main () {
  try {
    banner({ version: `Destroy ${version}` })
    if (!named) {
      throw Error('no_name')
    }
    let env = production ? 'production' : 'staging'
    let name = toLogicalID(`${arc.app[0]}-${env}`)
    await destroy({ name, force, update })
  }
  catch (err) {
    let { message } = err
    if (message === 'no_name') {
      update.error(`If you're really sure you want to destroy this app, run this command with: --name ${arc.app[0]}`)
    }
    else if (message === 'bucket_exists') {
      update.error('Static bucket exists. Use --force to delete.')
    }
    else if (message === 'table_exists') {
      update.error('Table(s) exist. Use --force to delete.')
    }
    else {
      update.error(err)
    }
  }
})()
