[<img src="https://assets.arc.codes/architect-logo-500b@2x.png" width=500>](https://www.npmjs.com/package/@architect/destroy)

## [`@architect/destroy`](https://www.npmjs.com/package/@architect/destroy)

> Architect serverless framework module for destroying projects created with Architect

[![GitHub CI status](https://github.com/architect/destroy/workflows/Node%20CI/badge.svg)](https://github.com/architect/destroy/actions?query=workflow%3A%22Node+CI%22)

Architect Destroy destroys Architect-generated projects. More specifically, it destroys your projects' CloudFormation Stacks, CloudWatch Log Groups, S3 bucket used during deployment, SSM Parameters added by [`arc env`](https://github.com/architect/env), and if called with `--force` (or the `force` param via API), destroys your DynamoDB (`@tables`) databases and S3 bucket housing your static assets (`@static`).

## Testing

This project uses Node.js's native test runner (`node:test`) for all testing. The test suite includes unit tests and integration tests.

### Running Tests

```bash
# Run linter and unit tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage report
npm run coverage
```

### Test Structure

Tests are organized in the `test/` directory:
- `test/unit/` - Unit tests for individual modules
- `test/integration/` - Integration tests for end-to-end scenarios
- `test/helpers/` - Shared test utilities and mock helpers

For detailed information about writing tests, mock patterns, and testing best practices, see [TESTING.md](./TESTING.md).

## API

### `destroy({ appname, stackname, env, force, now, retries, credentials, quiet, region }, callback)`

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
- `region`: (string) provide region override
