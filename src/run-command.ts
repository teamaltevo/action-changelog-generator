import { ExecOptions, exec } from '@actions/exec'

export function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let output = ''
    let errorOutput = ''
    const options: ExecOptions = {}
    options.listeners = {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
      stderr: (data: Buffer) => {
        errorOutput += data.toString()
      }
    }

    await exec(command, args, options)
    if (errorOutput) {
      reject(errorOutput)
    } else {
      resolve(output)
    }
  })
}
