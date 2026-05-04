import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

export class JsonStore<T extends Record<string, unknown>> {
  private _path: string | null = null
  private data: T
  private readonly defaults: T

  constructor(config: { defaults: T }) {
    this.defaults = config.defaults
    this.data = { ...config.defaults }
  }

  private get filePath(): string {
    if (!this._path) {
      const dir = app.getPath('userData')
      mkdirSync(dir, { recursive: true })
      this._path = join(dir, 'config.json')
      try {
        this.data = { ...this.defaults, ...JSON.parse(readFileSync(this._path, 'utf8')) }
      } catch {
        // file doesn't exist yet, defaults stay in place
      }
    }
    return this._path
  }

  get store(): T {
    void this.filePath
    return this.data
  }

  get<K extends keyof T>(key: K): T[K] {
    void this.filePath
    return key in this.data ? this.data[key] : this.defaults[key]
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data[key] = value
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
  }
}
