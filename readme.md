[<img src="https://assets.arc.codes/architect-logo-500b@2x.png" width=500>](https://www.npmjs.com/package/@architect/destroy)

## [`@architect/destroy`](https://www.npmjs.com/package/@architect/destroy)

> Architect serverless framework module for destroying projects created with Architect

[![GitHub CI status](https://github.com/architect/destroy/workflows/Node%20CI/badge.svg)](https://github.com/architect/destroy/actions?query=workflow%3A%22Node+CI%22)

Architect Destroy destroys Architect-generated projects. More specifically, it destroys your projects' CloudFormation Stacks, CloudWatch Log Groups, S3 bucket used during deployment, SSM Parameters added by [`arc env`](https://github.com/architect/env), and if called with `--force` (or the `force` param via API), destroys your DynamoDB (`@tables`) databases and S3 bucket housing your static assets (`@static`).

## API

### `destroy({ appname, stackname, env, force, now, retries, credentials, quiet }, callback)`

Destroys all infrastructure associated to your Architect app.

- `appname`: the name of the Architect app in question as defined in your `app.arc` file.
- `stackname`: the custom stack name (if specified during deployment, e.g. `arc deploy --name foo`)
- `env`: the stage or environment name to destroy, typical values are `staging` or `production`
- `force` proceeds to destroy your app even if it contains DynamoDB tables and / or an S3 bucket containing `@static` assets.
- `now`: (boolean) immeditely destroy the app (instead of waiting the requisite 5 seconds)
- `retries`: while waiting for a CloudFormation Stack to be destroyed, how many
    times do we ping the CloudFormation API checking if the Stack has been
    removed? This API is pinged every 10 seconds. If `retries` is exhausted,
    `callback` will be invoked with an error.
- `credentials`: (object) AWS credentials object with `accessKeyId`, `secretAccessKey`, and optionally `sessionToken`
- `quiet`: (boolean) suppress status output during destruction

## CLI

The CLI also supports additional options:

### Credentials
- `--access-key-id`: AWS Access Key ID
- `--secret-access-key`: AWS Secret Access Key  
- `--session-token`: AWS Session Token (optional, for temporary credentials)

### Other Options
- `--force` (`-f`): Force deletion including DynamoDB tables and S3 buckets
- `--production` (`-p`): Target production environment
- `--now`: Skip the 5-second delay before destruction
- `--verbose` (`-v`): Show verbose output
- `--debug` (`-d`): Show debug output

### Examples

```bash
# Basic usage with credentials
arc-destroy --app myapp --force --access-key-id AKIA... --secret-access-key abc123...

# Multiple flags
arc-destroy --app myapp --force --production
```

**Security Note**: While CLI credential arguments are supported, using environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or AWS credential files is recommended for better security.
