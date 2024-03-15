import * as core from '@actions/core'
import * as github from '@actions/github'
import { runCommand } from './run-command'
import markdown from 'markdown-doc-builder'

const categories = [
  {
    title: 'Implemented new features :',
    labels: ['feature', 'enhancement']
  },
  {
    title: 'Fixed bugs :',
    labels: ['fix', 'bug', 'bugfix']
  },
  {
    title: 'Breaking changes :',
    labels: ['breaking']
  },
  {
    title: 'Removed features :',
    labels: ['removed']
  },
  {
    title: 'Security fixes :',
    labels: ['security']
  },
  {
    title: 'Merged pull requests :'
  }
]

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const fromTag = core.getInput('fromTag')
    const toTag = core.getInput('toTag')
    const githubToken = core.getInput('token')

    core.info(`Generating changelog from ${fromTag} to ${toTag}...`)

    const pullRequestNumbers = await getPullRequestNumbersFromCommits(
      fromTag,
      toTag
    )

    if (pullRequestNumbers.length === 0) {
      core.setFailed('No pull requests found in the commit logs.')
      return
    }

    const prs = await getPullRequestWithNumbers(pullRequestNumbers, githubToken)
    const prsByCategory = groupPullRequestByCategories(prs)

    const changelog = buildMarkdownChangelog(prsByCategory, toTag)
    core.setOutput('changelog', changelog)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function getPullRequestNumbersFromCommits(
  fromTag: string,
  toTag: string
) {
  const commitLogs = await runCommand('git', [
    'log',
    `${fromTag}..${toTag}`,
    '--oneline',
    '--grep="Merge pull request #"'
  ])

  const regex = /#\d+/g
  const pullRequestNumbers =
    commitLogs
      .match(regex)
      ?.map((match: string) => match.replace('#', ''))
      .map(Number) || []

  return [...new Set(pullRequestNumbers)]
}

async function getPullRequestWithNumbers(numbers: number[], token: string) {
  const octokit = github.getOctokit(token)

  return await Promise.all(
    numbers.map(async prNumber => {
      core.info(`Getting info on PR #${prNumber}`)
      const pr = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber
      })
      return pr.data
    })
  )
}

function groupPullRequestByCategories(prs: any): { title: string; prs: any }[] {
  return categories.map(category => {
    if (category.labels) {
      return {
        title: category.title,
        prs: prs.filter((pr: any) =>
          pr.labels.some((label: { name: string }) =>
            category.labels.includes(label.name)
          )
        )
      }
    } else {
      const allLabels = categories.flatMap(c => c.labels || [])
      return {
        title: category.title,
        prs: prs.filter(
          (pr: any) =>
            !pr.labels.some((label: { name: string }) =>
              allLabels.includes(label.name)
            )
        )
      }
    }
  })
}

function buildMarkdownChangelog(
  prsByCategory: { title: string; prs: any }[],
  toTag: string
) {
  const document = markdown.newBuilder().headerOrdered(false)

  document.h1('Changelog')
  document.h2(toTag)

  prsByCategory
    .filter(c => c.prs.length > 0)
    .forEach(category => {
      document.h3(category.title)
      document.list(
        category.prs.map((pr: any) => {
          return `${pr.title} #${pr.number} (@${pr.user.login})`
        })
      )
    })

  return document.toMarkdown()
}
