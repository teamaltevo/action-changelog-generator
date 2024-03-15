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
    runs-on: ubuntu-latest
    # Check if the PR is merged and if it is a release branch
    if:
      ${{ github.event.pull_request.merged == true &&
      startsWith(github.event.pull_request.head.ref, 'release/')}}
    permissions:
      contents: write
      pull-requests: read
      actions: write
      issues: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Extract release branch version
        id: new-version
        run:
          echo "VERSION=$(echo ${{ github.event.pull_request.head.ref }} | awk
          -F/ '{print $NF}')" >> "$GITHUB_OUTPUT"

      - name: Get previous release Tag
        id: latest-version
        run: |
          git fetch --prune --unshallow --tags
          echo "VERSION=$(git describe --tags --abbrev=0)" >> "$GITHUB_OUTPUT"

      - name: Create new release Tag
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.git.createRef({
                owner: context.repo.owner,
                repo: context.repo.repo,
                ref: 'refs/tags/v${{ steps.extract-version.outputs.VERSION }}',
                sha: context.sha
            })

      - name: Generate Changelog
        id: changelog
        uses: teamaltevo/action-changelog-generator@v1.1.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fromTag: ${{ steps.latest-version.outputs.VERSION }}
          toTag: ${{ steps.new-version.outputs.VERSION }}

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

GitHub Actions allows users to select a specific version of the action to use,
based on release tags. This script simplifies this process by performing the
following steps:

1. **Retrieving the latest release tag:** The script starts by fetching the most
   recent release tag by looking at the local data available in your repository.
1. **Prompting for a new release tag:** The user is then prompted to enter a new
   release tag. To assist with this, the script displays the latest release tag
   and provides a regular expression to validate the format of the new tag.
1. **Tagging the new release:** Once a valid new tag is entered, the script tags
   the new release.
1. **Pushing the new tag to the remote:** Finally, the script pushes the new tag
   to the remote repository. From here, you will need to create a new release in
   GitHub and users can easily reference the new tag in their workflows.
