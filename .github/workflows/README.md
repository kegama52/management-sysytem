# GitHub Actions Workflows

This directory contains automated CI/CD pipelines for the TIISGS project.

## Active Workflows

### `ci-cd.yml` - Main CI/CD Pipeline

This workflow runs on every push to `main` or `develop` branches and on pull requests.

#### Stages:

1. **Lint** - Code quality checks
   - Frontend ESLint
   - Backend ESLint
   - Fails on warnings

2. **Build** - Compile and package
   - Frontend production build (`npm run build`)
   - Backend dependency check
   - Uploads artifacts for deployment

3. **Test** - Run test suite
   - Backend API tests (when present)
   - Runs on PRs and main branch merges

4. **Docker** - Container images (only on main branch)
   - Builds frontend Docker image
   - Builds backend Docker image
   - Push to Docker Hub (if credentials configured)

5. **Security** - Vulnerability scanning
   - Trivy scanner on codebase
   - Uploads SARIF results to GitHub Security tab

## Required Secrets

To enable full CI/CD functionality, add these secrets in your GitHub repository Settings → Secrets and variables → Actions:

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `DOCKERHUB_USERNAME` | Docker Hub username | Docker builds |
| `DOCKERHUB_TOKEN` | Docker Hub access token | Docker pushes |

### Creating Docker Hub Token:
1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Give it a name (e.g., "tiisgs-ci")
4. Select permissions: Read & Write
5. Copy the token and add it as `DOCKERHUB_TOKEN` secret

## Manual Triggers

To manually trigger a workflow:
1. Go to GitHub → Actions tab
2. Select the workflow
3. Click "Run workflow"

## Workflow Status

Check the status of your CI/CD pipeline:
- Green check ✓ = All checks passed
- Red X ❌ = One or more jobs failed
- Yellow ⚠️ = Warnings or skipped steps

## Disabling Workflows

To temporarily disable a workflow, rename the `.yml` file to `.yml.disabled`.

## Adding New Workflows

Create a new `.yml` file in this directory. Follow [GitHub Actions documentation](https://docs.github.com/actions).
