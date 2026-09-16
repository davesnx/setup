function getCurrentWorkingDirectory(): string {
  return process.cwd()
}

export { getCurrentWorkingDirectory as cwd }
