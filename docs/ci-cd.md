# CI/CD Guide

This repository uses GitHub Actions from `.github/workflows/ci-cd.yml`.

## What the pipeline does

On every push and pull request to `main` or `develop`, the workflow:

1. Installs dependencies for the active web + microservices stack.
2. Runs the core service test suite.
3. Runs the full active service test suite.
4. Builds the frontend in `apps/web`.
5. Validates `docker-compose.micro.yml`.
6. Builds Docker images for the active stack.

## Deploy behavior

Deployment is intentionally disabled by default.

The `deploy` job only runs when all of the following are true:

- event is a push
- branch is `main`
- repository variable `ENABLE_SELF_HOSTED_DEPLOY` is set to `true`

This prevents CI from failing in repositories that do not have a configured `self-hosted` runner.

## How to enable deployment

In GitHub:

1. Open `Settings`
2. Open `Secrets and variables`
3. Open `Actions`
4. Add repository variable:

```text
ENABLE_SELF_HOSTED_DEPLOY=true
```

You also need a self-hosted runner that has:

- Docker
- Docker Compose
- access to the deployment machine/environment
- permission to run `docker compose -f docker-compose.micro.yml up -d --build`

## Recommended branch strategy

- `develop`: CI only
- `main`: CI + optional deploy

## Notes

- MongoDB is provisioned as a GitHub Actions service container for tests.
- The workflow uses Node.js 20.
- npm package cache is enabled across the monorepo lockfiles to reduce CI time.
