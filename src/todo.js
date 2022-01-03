const IDENTIFIERS_REGEX = [/TODO/g, /FIXME/g, /BUG/g, /FEATURE_REQUEST/g];
const IDENTIFIERS = ["TODO", "FIXME", "BUG", "FEATURE_REQUEST"];
const NotaBeneType = {
  TODO: 0,
  FIXME: 1,
  BUG: 2,
  FREQ: 3,
};

class NotaBene {
  /** @type {number} */
  #line;
  /** @type {number} */
  #column;
  /** @type {string} */
  #owner;
  /** @type {string} */
  #description;
  /** @type {number} */
  #urgency;
  /** @type {number} */
  #type;
  /**
   *
   * @param {number} line
   * @param {number} col
   * @param {string} owner
   * @param {string} description
   * @param {number} urgency
   * @param {number} type
   */
  constructor(line, col, owner, description, urgency, type) {
    this.#line = line;
    this.#column = col;
    this.#owner = owner;
    this.#description = description;
    this.#urgency = urgency;
    this.#type = type;
  }

  get owner() {
    return this.#owner;
  }
  get col() {
    return this.#column;
  }
  get line() {
    return this.#line;
  }
  get description() {
    return this.#description;
  }
  get urgency() {
    return this.#urgency;
  }

  get type_id() {
    return this.#type;
  }

  get type() {
    return IDENTIFIERS[this.#type];
  }
}

class ParsedFile {
  /** @type {Promise<NotaBene[]>} */
  #nbs;
  // for a quick comparison of a file, so we don't have to reparse (since the built in hash, is faster)
  #filehash;
  constructor(nbs, filehash) {
    this.#nbs = nbs;
    this.#filehash = filehash;
  }

  get hash_sum() {
    return this.#filehash;
  }

  nota_benes() {
    return this.#nbs;
  }
}

class NotaBenes {
  /** @typedef {string} Path */
  // The founds t_odos.
  /** @type { Map<Path, Promise<ParsedFile>> } */
  #nbs;
  constructor() {
    this.#nbs = new Map();
  }
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
              resolve(new ParsedFile(parse_file(data), sum));
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
          resolve(new ParsedFile(parse_file(data), sum));
        });
      });
      this.#nbs.set(path, promise);
    }
  }

  async get_all_in(file_name) {
    return this.#nbs.get(file_name);
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
}

async function parse_file(contents) {
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
        };
        parses.push(parse_nb(lexing, line));
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
 * @param { {file_offset: number, line_number: number, column: number, type: number } } info
 * @param { string } line_contents
 */
function parse_nb(info, line_contents) {
  const urgency = (str) => {
    const re = /!/g;
    return ((str || "").match(re) || []).length;
  };
  // todo(simon): implement a test for parsing
  // fixme(simon): maybe clean this code up
  // bug(simon): possible bug description
  // feature_request(simon)!!!!: display the nota bene's in a nice list in vscode
  let owner_end = line_contents.indexOf(")");
  let owner = line_contents.substring(
    info.column + IDENTIFIERS[info.type].length + 1,
    owner_end
  );
  let description = line_contents.substring(
    line_contents.indexOf(":", owner_end) + 1
  );
  let urgency_ = urgency(line_contents);
  let res = new NotaBene(
    info.line_number,
    info.column,
    owner.trim(),
    description.trim(),
    urgency_,
    info.type
  );
  return res;
}

module.exports = {
  NotaBenes,
};
