# Architect Sandbox changelog

---

## [1.2.1] 2021-05-24

### Added

- Use of latest architect inventory for plugins support.

---

## [1.2.0] 2021-04-30

### Added

- Added support for custom stage names (aka stack names), fixes #1055; thanks @filmaj + @ryanbethel!
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
