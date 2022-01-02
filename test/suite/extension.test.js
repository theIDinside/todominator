const { doesNotMatch } = require("assert");
const assert = require("assert");

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const path = require("path");
const vscode = require("vscode");
const myExtension = require("../../extension");
const PROJECT_ROOT = path.normalize(path.join(__dirname, "..", ".."));
suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Test todo's found is 1", async () => {
    let TODO_FILE = path.join(PROJECT_ROOT, "src", "todo.js");
    let nb = new myExtension.NotaBenes();
    await nb.parse_file(TODO_FILE);

    // assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    // assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    return nb.get_todos(TODO_FILE).then((todos) => {
      assert.strictEqual(1, todos.length);
    });
  });

  test("Test feature requests found is 1", async () => {
    let TODO_FILE = path.join(PROJECT_ROOT, "src", "todo.js");
    let nb = new myExtension.NotaBenes();
    await nb.parse_file(TODO_FILE);

    // assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    // assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    return nb.get_feature_requests(TODO_FILE).then((todos) => {
      assert.strictEqual(1, todos.length);
    });
  });

  test("Test fix me's found is 1", async () => {
    let TODO_FILE = path.join(PROJECT_ROOT, "src", "todo.js");
    let nb = new myExtension.NotaBenes();
    await nb.parse_file(TODO_FILE);

    // assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    // assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    return nb.get_fixmes(TODO_FILE).then((todos) => {
      assert.strictEqual(1, todos.length);
    });
  });

  test("Test bugs found is 1", async () => {
    let TODO_FILE = path.join(PROJECT_ROOT, "src", "todo.js");
    let nb = new myExtension.NotaBenes();
    await nb.parse_file(TODO_FILE);

    // assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    // assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    return nb.get_bugs(TODO_FILE).then((todos) => {
      assert.strictEqual(1, todos.length);
    });
  });

  test("Test owner is simon of all 4", async () => {
    let TODO_FILE = path.join(PROJECT_ROOT, "src", "todo.js");
    let nb = new myExtension.NotaBenes();
    await nb.parse_file(TODO_FILE);
    return nb.get_all_in(TODO_FILE).then(async (parsed_file) => {
      assert.strictEqual(
        true,
        await parsed_file
          .nota_benes()
          .then((nbs) => nbs.every((nb) => nb.owner == "simon"))
      );
      assert.strictEqual(
        4,
        await parsed_file.nota_benes().then((nbs) => nbs.length)
      );
    });
  });
});
