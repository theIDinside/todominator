const { TreeItem, TreeItemCollapsibleState } = require("vscode");
const vscode = require("vscode");
/** @typedef {string} Path */
let NB_IDS = 0;
const IDENTIFIERS_REGEX = [/TODO/g, /FIXME/g, /BUG/g, /FEATURE/g];
const IDENTIFIERS = ["TODO", "FIXME", "BUG", "FEATURE"];
const NotaBeneType = {
  TODO: 0,
  FIXME: 1,
  BUG: 2,
  FREQ: 3,
};

class NotaBene extends TreeItem {
  _id;
  /** @type {number} */
  line;
  /** @type {number} */
  column;
  /** @type {string} */
  owner;
  /** @type {string} */
  description_;
  /** @type {number} */
  urgency;
  /** @type {string} */
  type;
  /** @type {number} */
  type_id;
  /** @type {string} */
  label;

  /** @type {import("vscode").Command} */
  command;

  /**
   * @param {number} line
   * @param {number} col
   * @param {string} owner
   * @param {string} description
   * @param {number} urgency
   * @param {number} type
   * @param {string} path
   */
  constructor(label, line, col, owner, description, urgency, type, path) {
    super(label, TreeItemCollapsibleState.None);
    this._id = NB_IDS++;
    this.line = line;
    this.column = col;
    this.owner = owner;
    this.description = description;
    this.urgency = urgency;
    this.type = IDENTIFIERS[type];
    this.type_id = type;
    let sub = description.substring(0, description.indexOf(" "));
    this.label = label;
    let cmd = {
      /** Title of the command, like `save`.*/
      title: "todominator.goto_nb",
      /** * The identifier of the actual command handler */
      command: "todominator.goto_nb",
      /** A tooltip for the command, when represented in the UI. */
      tooltip: "Go to N.B.",
      /** * Arguments that the command handler should be invoked with. */
      arguments: [path, line],
    };
    this.command = cmd;
    this.path = path;
  }
  isRoot() {
    return false;
  }
}

/**
 * @param {string} path
 * @returns {string}
 */
function make_label(path) {
  let last_slash = path.lastIndexOf("/");
  if (last_slash == -1) {
    return path;
  }
  let sub = path.substring(0, last_slash);
  let last_slash_2 = sub.lastIndexOf("/");
  if (last_slash_2 == -1) return path;
  return path.substring(last_slash_2);
}

class ParsedFile extends TreeItem {
  /** @type {Promise<NotaBene[]>} */
  #nbs;
  // for a quick comparison of a file, so we don't have to reparse (since the built in hash, is faster)
  #filehash;
  path;
  /**
   *
   * @param {string} path
   * @param {Promise<NotaBene[]>} nbs
   * @param {number} filehash
   */
  constructor(path, nbs, filehash) {
    super(make_label(path), TreeItemCollapsibleState.Collapsed);
    this.#nbs = nbs;
    this.#filehash = filehash;
    this.path = path;
  }

  get hash_sum() {
    return this.#filehash;
  }

  async nota_benes() {
    return this.#nbs;
  }

  async get_by_label(label) {
    let nbs = await this.#nbs;
    return nbs.find((nb) => nb.label == label);
  }

  isRoot() {
    return true;
  }
}

class NotaBenes {
  // The founds t_odos.
  /** @type { Map<Path, Promise<ParsedFile>> } */
  #nbs;
  constructor() {
    this.#nbs = new Map();
  }
  /** @type {Map<number, Path>} */
  id_to_path = new Map();
  /** @type {Map<Path, number>} */
  path_found = new Map();
  // feature_request(simon): perhaps; this should be offloaded to native code, that could potentially handle this alot faster, via multi threading
  parse_file(path) {
    const fs = require("fs");
    let previous = this.#nbs.get(path);

    if (previous) {
      previous.then((previous_result) => {
        let promise = new Promise((resolve, reject) => {
          fs.readFile(path, { encoding: "utf8", flag: "r" }, (err, data) => {
            if (err) reject(err);
            let sum = data.length;
            if (sum != previous_result.hash_sum) {
              resolve(
                new ParsedFile(
                  path,
                  parse_file(this.path_found, path, data),
                  sum
                )
              );
            } else {
              resolve(previous_result);
            }
          });
        });
        this.#nbs.set(path, promise);
      });
    } else {
      let promise = new Promise((resolve, reject) => {
        fs.readFile(path, { encoding: "utf8", flag: "r" }, (err, data) => {
          if (err) reject(err);
          let sum = data.length;
          resolve(
            new ParsedFile(path, parse_file(this.path_found, path, data), sum)
          );
        });
      });
      this.#nbs.set(path, promise);
    }
  }

  async insert_parsed(waiting_parsed) {
    await waiting_parsed.then(
      (/** @type {ParsedFile[]}*/ arrayOfParsedFiles) => {
        for (let pf of arrayOfParsedFiles) {
          this.#nbs.set(
            pf.path,
            new Promise((resolve, reject) => {
              resolve(pf);
            })
          );
        }
      }
    );
  }

  async get_all_in(file_name) {
    return this.#nbs.get(file_name);
  }

  all() {
    return [...this.#nbs.entries()];
  }

  async #get_filtered(file_name, type_id) {
    let r = this.#nbs.get(file_name);
    if (r) {
      let result = await r.then((parsed_file) => {
        return parsed_file.nota_benes().then((nbs) => {
          let filtered = nbs.filter((nb) => nb.type_id == type_id);
          return filtered;
        });
      });
      return result;
    }
    return [];
  }

  async get_todos(file_name) {
    return this.#get_filtered(file_name, NotaBeneType.TODO);
  }

  async get_fixmes(file_name) {
    return this.#get_filtered(file_name, NotaBeneType.FIXME);
  }

  async get_feature_requests(file_name) {
    return this.#get_filtered(file_name, NotaBeneType.FREQ);
  }

  async get_bugs(file_name) {
    return this.#get_filtered(file_name, NotaBeneType.BUG);
  }

  file_is_recorded(path) {
    return (this.path_found.get(path) ?? 0) != 0;
  }

  async getTreeViewRoots() {
    let result = [];
    for (let entry of this.#nbs) {
      let p = await entry[1];
      let nbs = await p.nota_benes();
      if (nbs.length != 0) {
        result.push(p);
      }
    }
    return result;
  }
}

/**
 * @param {Map<Path, number>} path_count_map
 * @param {string} path
 * @param {string} contents
 * @returns
 */
async function parse_file(path_count_map, path, contents) {
  const is_comment = (line) => {
    return line.indexOf("//") != -1 || line.indexOf("/*") != -1;
  };

  const contains_identifier = (line) => {
    let type = 0;
    for (const ident of IDENTIFIERS) {
      let pos = line.toUpperCase().indexOf(ident);
      if (pos != -1) return { type: type, column: pos };
      type += 1;
    }
    return { type: -1, column: -1 };
  };

  let parses = [];
  let file_offset = 0;
  let line_number = 1;
  for (const line of contents.split("\n")) {
    if (is_comment(line)) {
      const { type, column } = contains_identifier(line);
      if (type != -1) {
        let lexing = {
          // remember, we have to add the newline character to the length
          file_offset: file_offset + column + (line_number - 1),
          line_number: line_number,
          column: column,
          type: type,
          path: path,
        };
        let nb = parse_nb(lexing, line);
        if (nb != null) {
          let count = (path_count_map.get(path) ?? 0) + 1;
          path_count_map.set(path, count);
          parses.push(nb);
        }
      }
    }
    // remember, we have to add the newline character to the length
    file_offset += line.length + 1;
    line_number++;
  }
  return parses;
}

/**
 * @param {string} path
 * @param {string} contents
 * @returns
 */
async function parseFile(path, contents) {
  const is_comment = (line) => {
    return line.indexOf("//") != -1 || line.indexOf("/*") != -1;
  };

  const contains_identifier = (line) => {
    let type = 0;
    for (const ident of IDENTIFIERS) {
      let pos = line.toUpperCase().indexOf(ident);
      if (pos != -1) return { type: type, column: pos };
      type += 1;
    }
    return { type: -1, column: -1 };
  };

  let parses = [];
  let file_offset = 0;
  let line_number = 1;
  for (const line of contents.split("\n")) {
    if (is_comment(line)) {
      const { type, column } = contains_identifier(line);
      if (type != -1) {
        let lexing = {
          // remember, we have to add the newline character to the length
          file_offset: file_offset + column + (line_number - 1),
          line_number: line_number,
          column: column,
          type: type,
          path: path,
        };
        let nb = parse_nb(lexing, line);
        if (nb != null) {
          parses.push(nb);
        }
      }
    }
    // remember, we have to add the newline character to the length
    file_offset += line.length + 1;
    line_number++;
  }
  return parses;
}

/**
 *
 * @param { {file_offset: number, line_number: number, column: number, type: number, path: string} } info
 * @param { string | null } line_contents
 */
function parse_nb(
  { file_offset, line_number, column, type, path },
  line_contents
) {
  const urgency = (str) => {
    const re = /!/g;
    return ((str || "").match(re) || []).length;
  };
  // todo(simon): implement a test for parsing
  // fixme(simon): maybe clean this code up
  // bug(simon): possible bug description
  // feature_request(simon)!!!!: display the nota bene's in a nice list in vscode
  let owner_end = column + IDENTIFIERS[type].length + 1;

  let owner = "";
  let descriptionBegins = 0;

  let accountForStupidSpaceSomePeopleWrite =
    line_contents.charAt(column + IDENTIFIERS[type].length) == " "
      ? column + IDENTIFIERS[type].length + 1
      : column + IDENTIFIERS[type].length;

  if (line_contents.charAt(accountForStupidSpaceSomePeopleWrite) != "(") {
    owner = "NO OWNER";
    if (line_contents.charAt(accountForStupidSpaceSomePeopleWrite) == ":") {
      descriptionBegins = accountForStupidSpaceSomePeopleWrite + 1;
    } else {
      // means we've seen the word "bug" or "fixme" somewhere, without a ( after it, or without an : after it; thus, we should not treat this as a N.B.
      return null;
    }
  } else {
    owner_end = line_contents.indexOf(")");
    if (line_contents.charAt(owner_end + 1) == ":") {
      descriptionBegins = owner_end + 2;
    } else {
      descriptionBegins = owner_end + 1;
    }
    owner = line_contents.substring(
      column + IDENTIFIERS[type].length + 1,
      owner_end
    );
  }
  let description = line_contents.substring(descriptionBegins);
  let urgency_ = urgency(line_contents);
  const label = `${IDENTIFIERS[type]}(${owner}):`;
  let res = new NotaBene(
    label,
    line_number,
    column,
    owner.trim(),
    description.trim(),
    urgency_,
    type,
    path
  );
  return res;
}

module.exports = {
  NotaBenes,
  NotaBene,
  ParsedFile,
  parseFile,
};
