# Architect Destroy changelog

---

## [3.0.3] 2022-05-10

### Changed

- Updated dependencies; sub-dep `lambda-runtimes` adds `nodejs16.x`.

---

## [3.0.2] 2022-03-31

### Changed

- Updated dependencies

---

## [3.0.1] 2022-02-24

### Fixed

- Fix error reporting when run from `arc` (and not as standalone)

---

## [3.0.0] 2022-01-23

### Changed

- Breaking change: bare CLI arguments (e.g. `destroy force`) as aliases to flags are no longer used
- Stop publishing to the GitHub Package registry
- Updated dependencies

---

## [2.0.3] 2021-11-16

### Changed

- Updated dependencies

---

## [2.0.2] 2021-10-12

### Changed

- Updated dependencies

---

## [2.0.0 - 2.0.1] 2021-07-22

### Changed

- Breaking change: removed support for Node.js 10.x (now EOL, and no longer available to created in AWS Lambda) and Node.js 12.x
- Breaking change: the `--name` flag can no longer be used in place of `--app` to destroy apps; `--app` must now be used to destroy apps, while `--name` may only be used to destroy stacks; fixes #1165
- Updated dependencies

---

## [1.2.5 - 1.2.6] 2021-06-21

### Changed

- Updated dependencies

---

## [1.3.0] 2021-06-22

### Added

- Added a `--no-timeout` flag, which causes `destroy` to wait until the CloudFormation Stack is deleted before exiting

### Changed

- `destroy` now pings the CloudFormation API to check for Stack deletion every 10 seconds (instead of increasingly backing off starting from 10 seconds to 60 seconds)

---

## [1.2.4] 2021-06-09

### Changed

- If the CloudFormation DeleteStack operation detects that the Stack has a status of `DELETE_FAILED`, it will now report this, along with the status reason, and exit with a non-zero code rather than wait for the `destroy` command timeout to run out; this fixes [#1156](https://github.com/architect/architect/issues/1156)
- `destroy` will now exit with a non-zero code if any errors are raised during its execution

---

## [1.2.3] 2021-06-04

### Fixed

- Fixed failing destroy operations when CloudFormation Stack was already deleted; this fixes [#1155](https://github.com/architect/architect/issues/1150)

### Changed

- Detection of resources that require use of the `--force` flag is now done sooner, so as to fail faster in the case the flag is needed

---

## [1.2.2] 2021-05-24

### Added

- Use of latest architect inventory for plugins support.

---

## [1.2.1] 2021-05-24

### Fixed

- Fixed failing destroy operations when app doesn't have any SSM parameters (which is unusual, but possible in certain circumstances)

---

## [1.2.0] 2021-04-30

### Added

- Added support for custom stage names (aka stack names), fixes [#1055](https://github.com/architect/architect/issues/1055); thanks @filmaj + @ryanbethel!
- Added `--now` CLI flag in case you just like really need to destroy stuff right. now.

### Changed

- Specifying the app to destroy, formerly the `--name` CLI flag, should now be used as `--app`
  - `--app` and `--name` can now be used together

---

## [1.1.1] 2021-04-12

### Fixed

- Made S3 bucket removal idempotent: if buckets do not exist when attempting to clear/remove them, don't throw an exception.

---

## [1.1.0] 2021-02-28

### Added

- `destroy` now wipes out any CloudWatch logs, SSM Parameters added by `arc env` (for the specific environment being destroyed) and wipes and deletes the deployment bucket used during CloudFormation deploys.

---

## [1.0.5] 2021-02-26

### Changed

- Emptying out S3 bucket contents now supports buckets that contain more than 1,000 objects.

---

## [1.0.4] 2020-12-04

### Changed

- Updated dependencies

---

## [1.0.3] 2020-11-22

### Changed

- Implemented Inventory (`@architect/inventory`)
- Updated dependencies

---

## [1.0.2] 2020-06-22

### Added

- Say hello to `@architect/destroy`!
- Fixed src/cli to export a function
- Fixed src/cli to only show banner if being run standalone

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
