#!/usr/bin/env node
let _inventory = require('@architect/inventory')
let { banner, updater } = require('@architect/utils')
let { version } = require('../package.json')

let destroy = require('./index.js')
let update = updater('Destroy')

if (require.main === module) {
  (async function () {
    try {
      await main(process.argv)
    }
    catch (err) {
      console.log(err)
    }
  })()
}

// TODO move CLI logic into CLI and turn other libs into stand alone pure modules
async function main (args) {
  let appname
  try {
    let inventory = await _inventory({})
    appname = inventory.inv.app

    if (require.main === module) {
      banner({ inventory, version: `Destroy ${version}` })
    }

    let findApp = p => p === '--app'
    let app = args.includes('--app') && (args[args.findIndex(findApp) + 1] === appname)
    if (!app) throw Error('no_app_name')

    // User should supply --app $appname in the CLI, however if they only supply --name (the old destroy behavior) then interpret that as --app (and warn)
    let findName = p => p === '--name'
    let stackname = args.includes('--name') && args[args.findIndex(findName) + 1]

    let forces = p => [ '-f', '--force', 'force' ].includes(p)
    let force = args.some(forces)
    let production = args.includes('--production')
    let retries = args.includes('--no-timeout') ? 999 : 15 // how many times do we ping the CloudFormation API to check if the stack is deleted?

    let now = args.includes('--now')

    let env = production ? 'production' : 'staging'
    update.status(`Destroying ${env} environment`)
    if (env === 'staging') {
      update.status(`Reminder: if you deployed to production, don't forget to run destroy again with: --production`)
    }
    await destroy({ appname, stackname, env, force, now, retries, update })
  }
  catch (err) {
    let { message } = err
    let msg = 'To destroy this app (and any static assets and database tables that belong to it), run destroy with: --force'
    if (message === 'no_app_name') {
      update.warn(`If you're really sure you want to destroy this app, run destroy with: --app ${appname}`)
    }
    else if (message === 'bucket_exists') {
      update.warn(`Found static bucket!`)
      update.warn(msg)
    }
    else if (message === 'table_exists') {
      update.warn('Found DynamoDB table(s)!')
      update.warn(msg)
    }
    else {
      update.error(err)
    }
    process.exit(1)
  }
}

module.exports = main
