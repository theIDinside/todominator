const { resolve } = require("path");
const { readdir, readFile } = require("fs").promises;
const { ParsedFile, parseFile } = require("./todo");
/**
 * Returns sub folders of dir
 * @param {string} root the root folder which we start from. We need to keep this around, so that we can match against sub-folders, like for instance target/debug
 * @param {string} dir - current dir to yield folders from
 * @param {string[]} ignoreFolders - the folders which we want to ignore
 */
async function* getAllFolders(root, dir, ignoreFolders) {
  const directoryEntries = await readdir(dir, { withFileTypes: true });
  for (const directoryEntry of directoryEntries) {
    const res = resolve(dir, directoryEntry.name);
    let component = res.substring(root.length + 1);
    if (directoryEntry.isDirectory()) {
      if (component.charAt(component.length - 1) != "/") {
        component = component.concat("/");
      }
      let wasExcluded = ignoreFolders.some((ignoreValue) => {
        let fullFound = component.includes(ignoreValue);
        return fullFound;
      });
      if (!wasExcluded) {
        yield* getAllFolders(root, res, ignoreFolders);
        yield res;
      }
    }
  }
}

/**
 * Returns sub folders of `rootDir` and ignores folders that match values in `ignores`
 * @param {string} rootDir - current dir to yield folders from
 * @param {string[]} ignores - the folders which we want to ignore
 * @returns {AsyncGenerator<String>}
 */
async function* getFolders(rootDir, ignores) {
  yield* getAllFolders(rootDir, rootDir, ignores);
}

/**
 * @param {String} dir
 * @returns {Promise<import("./todo").ParsedFile[] }
 */
async function parseFolder(dir, fileExtensions) {
  let result = [];
  const directoryEntries = await readdir(dir, { withFileTypes: true });
  for (const de of directoryEntries) {
    if (de.isFile()) {
      let path = resolve(dir, de.name);
      let ext = de.name.slice(de.name.lastIndexOf(".") + 1);
      if (fileExtensions.some((extension) => extension == ext)) {
        result.push(
          readFile(path, { encoding: "utf8", flag: "r" }).then((data) => {
            return new ParsedFile(path, parseFile(path, data), data.length);
          })
        );
      }
    }
  }
  return Promise.all(result);
}

module.exports = {
  getFolders,
  parseFolder,
};
