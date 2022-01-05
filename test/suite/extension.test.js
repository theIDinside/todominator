const { doesNotMatch } = require("assert");
const assert = require("assert");

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const path = require("path");
const vscode = require("vscode");
const myExtension = require("../../extension");
const PROJECT_ROOT = path.normalize(path.join(__dirname, "..", ".."));
const TODO_FILE = path.join(PROJECT_ROOT, "testworkspace", "src", "main.rs");
suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Test todo's found is 1", async () => {
    let nb = new myExtension.NotaBenes();
    nb.parse_file(TODO_FILE);
    return nb.get_todos(TODO_FILE).then((todos) => {
      assert.strictEqual(todos.length, 1);
    });
  });

  test("Test feature requests found is 2", async () => {
    let nb = new myExtension.NotaBenes();
    nb.parse_file(TODO_FILE);
    return nb.get_feature_requests(TODO_FILE).then((todos) => {
      assert.strictEqual(todos.length, 2);
    });
  });

  test("Test fix me's found is 1", async () => {
    let nb = new myExtension.NotaBenes();
    nb.parse_file(TODO_FILE);
    return nb.get_fixmes(TODO_FILE).then((todos) => {
      assert.strictEqual(todos.length, 1);
    });
  });

  test("Test bugs found is 1", async () => {
    let nb = new myExtension.NotaBenes();
    nb.parse_file(TODO_FILE);
    return nb.get_bugs(TODO_FILE).then((todos) => {
      assert.strictEqual(todos.length, 1);
    });
  });

  test("Test owner is simon of all 5", async () => {
    let nb = new myExtension.NotaBenes();
    nb.parse_file(TODO_FILE);
    return nb.get_all_in(TODO_FILE).then(async (parsed_file) => {
      assert.strictEqual(
        await parsed_file
          .nota_benes()
          .then((nbs) => nbs.every((nb) => nb.owner == "simon")),
        true
      );
      assert.strictEqual(
        await parsed_file.nota_benes().then((nbs) => nbs.length),
        5
      );
    });
  });

  test("Test urgency of feature request NB, is 4", async () => {
    let nb = new myExtension.NotaBenes();
    nb.parse_file(TODO_FILE);
    return nb.get_feature_requests(TODO_FILE).then((nb) => {
      assert.strictEqual(nb[0].urgency, 4);
    });
  });
});
