/** Placeholder body for public functions whose tasks have not been done yet. */
export function notImplemented(name: string, task: string): never {
  throw new Error(`not implemented: ${name} (task ${task})`);
}
