// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

const {
  commands,
  window,
  workspace,
  TextDocumentSaveReason,
} = require("vscode");
const { NotaBenes } = require("./src/todo");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param { import ("vscode").ExtensionContext } context
 */
function activate(context) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  console.log(`activation of todominator ongoing`);
  context.subscriptions.push(
    workspace.onDidSaveTextDocument((td) => {
      const configuration = workspace.getConfiguration("todominator");
      const parseOnSave = configuration.get("parse_on_save");

      console.log(
        `did save ${td.uri.fsPath}. Running todominator parse: ${
          parseOnSave ?? false
        }`
      );
    })
  );
  context.subscriptions.push(
    workspace.onWillSaveTextDocument((e) => {
      console.log(
        `will save ${e.document.uri.fsPath}: ${
          TextDocumentSaveReason[e.reason]
        }`
      );
    })
  );

  let disposable = commands.registerCommand(
    "todominator.helloWorld",
    function () {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      window.showInformationMessage("Hello World from todominator!");
    }
  );
  context.subscriptions.push(disposable);

  // window.createTreeView("todominator", { treeDataProvider: aNodeWithIdTreeDataProvider(), showCollapseAll: true, canSelectMany: false }));
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
  NotaBenes,
};
