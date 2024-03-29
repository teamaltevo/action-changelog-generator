# action-changelog-generator

This action is designed to generate a changelog based on the merged pull
requests between two git tags. It is particularly useful when you want to
generate a changelog for a new release.

## Inputs

#### `fromTag`

**Required**. The git tag to start from when generating the changelog. Usually
the tag of the previous release.

Example : `v1.0.0`

---

#### `toTag`

**Required**. The git tag to end at when generating the changelog. Usually the
tag of the new release.

Example : `v1.1.0`

---

#### `token`

**Required**. The GitHub token to use when fetching pull requests details. This
can be set to `${{ secrets.GITHUB_TOKEN }}` to use the default token provided by
GitHub Actions.

Example : `${{ secrets.GITHUB_TOKEN }}`

## Outputs

#### `changelog`

The generated changelog as a Markdown string.

This output can be used in subsequent steps to save the changelog to a file,
create a release, or send it to a chat application.

---

## Example Workflow

```yml
name: Create Release

on:
  pull_request:
    types: [closed]
    branches:
      - main

jobs:
  tag-release:
    # This action only works on linux runners
    runs-on: ubuntu-latest

    # Check if the PR is merged and if it is a release branch
    if:
      ${{ github.event.pull_request.merged == true &&
      startsWith(github.event.pull_request.head.ref, 'release/')}}

    # Define the permissions for the action
    permissions:
      contents: write
      pull-requests: read
      actions: write
      issues: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required to fetch tags and commits

      - name: Extract release branch version
        id: new-version
        run:
          echo "VERSION=$(echo ${{ github.event.pull_request.head.ref }} | awk
          -F/ '{print $NF}')" >> "$GITHUB_OUTPUT"

      - name: Get previous release Tag
        id: latest-version
        run: echo "TAG=$(git describe --tags --abbrev=0)" >> "$GITHUB_OUTPUT"

      - name: Create new release Tag
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.git.createRef({
                owner: context.repo.owner,
                repo: context.repo.repo,
                ref: 'refs/tags/v${{ steps.new-version.outputs.VERSION }}',
                sha: context.sha
            })

      - name: Create tag locally
        run: git tag "v${{ steps.new-version.outputs.VERSION }}"

      - name: Generate Changelog
        id: changelog
        uses: teamaltevo/action-changelog-generator@v1.0.5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fromTag: ${{ steps.latest-version.outputs.TAG }}
          toTag: v${{ steps.new-version.outputs.VERSION }}

      - name: Create Release
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: 'v${{ steps.new-version.outputs.VERSION }}',
              name: 'v${{ steps.new-version.outputs.VERSION }}',
              body: `${{ steps.changelog.outputs.changelog }}`
            });

      - name: Complete
        run:
          echo "**Tag v${{ steps.new-version.outputs.VERSION }} was created
          successfully** :white_check_mark:" >> $GITHUB_STEP_SUMMARY
```

---

## Development

### Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy (20.x or later should work!). If you are
> using [`volta`](https://volta.sh) to manage your Node.js versions, this is
> already taken care of.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

### Publishing a New Release

This project includes a helper script, [`script/release`](./script/release)
designed to streamline the process of tagging and pushing new releases for
GitHub Actions.

```sh
npm run bundle
git add -A
git commit -m "Release v1.x.x"
git push
./script/release
```
