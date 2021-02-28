[<img src="https://s3-us-west-2.amazonaws.com/arc.codes/architect-logo-500b@2x.png" width=500>](https://www.npmjs.com/package/@architect/destroy)

## [`@architect/destroy`](https://www.npmjs.com/package/@architect/destroy)

> Architect serverless framework module for destroying projects created with Architect

[![GitHub CI status](https://github.com/architect/destroy/workflows/Node%20CI/badge.svg)](https://github.com/architect/destroy/actions?query=workflow%3A%22Node+CI%22)


Architect Destroy destroys Architect-generated projects. More specifically, it destroys your projects' CloudFormation Stacks, CloudWatch Log Groups, S3 bucket used during deployment, SSM Parameters added by [`arc env`](https://github.com/architect/env), and if called with `--force` (or the `force` param via API), destroys your DynamoDB (`@tables`) databases and S3 bucket housing your static assets (`@static`).


## API

### `destroy({ appname, env, force }, callback)`

Destroys all infrastructure associated to your Architect app.

- `appname`: the name of the Architect app in question as defined in your `app.arc` file.
- `env`: the stage or environment name to destroy. Typical values are `staging` or `production`.
- `force` proceeds to destroy your app even if it contains DynamoDB tables and / or an S3 bucket containing `@static` assets.
