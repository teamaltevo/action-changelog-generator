import { ExecOptions, exec } from '@actions/exec'

export function runCommand(command: string, args?: string[]): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let output = ''
    let errorOutput = ''
    const options: ExecOptions = {}
    options.listeners = {
      stdline: (data: string) => {
        output += data + '\n'
      },
      errline: (data: string) => {
        errorOutput += data + '\n'
      }
    }

    const code = await exec(command, args, options)
    if (code !== 0) {
      reject(errorOutput)
    } else {
      resolve(output)
    }
  })
}
