// if baseUrl path doesn't ends with /, this path will be not prepended to passed pathname for new URL(input, base)
import { URL } from "url"
// @ts-ignore
import * as escapeRegExp from "lodash.escaperegexp"
import { PathLike, rename } from "fs-extra"

/** @internal */
export function newBaseUrl(url: string): URL {
  const result = new URL(url)
  if (!result.pathname.endsWith("/")) {
    result.pathname += "/"
  }
  return result
}

// addRandomQueryToAvoidCaching is false by default because in most cases URL already contains version number,
// so, it makes sense only for Generic Provider for channel files
export function newUrlFromBase(pathname: string, baseUrl: URL, addRandomQueryToAvoidCaching = false): URL {
  const result = new URL(pathname, baseUrl)
  // search is not propagated (search is an empty string if not specified)
  const search = baseUrl.search
  if (search != null && search.length !== 0) {
    result.search = search
  } else if (addRandomQueryToAvoidCaching) {
    result.search = `noCache=${Date.now().toString(32)}`
  }
  return result
}

export function getChannelFilename(channel: string): string {
  return `${channel}.yml`
}

export function blockmapFiles(baseUrl: URL, oldVersion: string, newVersion: string): URL[] {
  const newBlockMapUrl = newUrlFromBase(`${baseUrl.pathname}.blockmap`, baseUrl)
  const oldBlockMapUrl = newUrlFromBase(`${baseUrl.pathname.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion)}.blockmap`, baseUrl)
  return [oldBlockMapUrl, newBlockMapUrl]
}

export async function renameWithRetryOnBusy(oldPath: PathLike, newPath: PathLike): Promise<void> {
  const timeoutThreshold = 30000
  const startTime = Date.now()

  while (true) {
    try {
      await rename(oldPath, newPath)
      return
    } catch (error) {
      if (!(error instanceof Error) || error.message.match(/^(?!EBUSY:)/) || Date.now() - startTime > timeoutThreshold) {
        throw error
      }
      // retry after a while if error is EBUSY
      await new Promise(r => setTimeout(r, 500))
    }
  }
}
