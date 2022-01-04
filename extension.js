const {
  commands,
  window,
  workspace,
  TextDocumentSaveReason,
  Selection,
} = require("vscode");
const { NotaBenes } = require("./src/todo");
const { NotaBeneTreeDataProvider } = require("./src/todoTreeDataProvider");
const { readFile, readdir, stat } = require("fs");

let NBS = new NotaBenes();

/**
 * @param { import ("vscode").ExtensionContext } context
 */
function activate(context) {
  const rootPath =
    workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  let treeDataProvider = new NotaBeneTreeDataProvider(NBS, rootPath);

  let tv = window.createTreeView("todominator", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
    canSelectMany: false,
  });

  window.registerTreeDataProvider("todominator", treeDataProvider);
  context.subscriptions.push(
    workspace.onDidSaveTextDocument((td) => {
      const configuration = workspace.getConfiguration("todominator");
      const parseOnSave = configuration.get("parse_on_save");
      if (parseOnSave) {
        NBS.parse_file(td.uri.fsPath);
        treeDataProvider.refresh();
      }
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

  let parse_file_cmd = commands.registerCommand(
    "todominator.parse_file",
    async () => {
      let files = await getSourceFiles();
      window.showQuickPick(files).then((sourceFilePath) => {
        NBS.parse_file(sourceFilePath);
        treeDataProvider.refresh();
      });
    }
  );

  let goto_nb_cmd = commands.registerCommand(
    `todominator.goto_nb`,
    async (path, line) => {
      let doc = await workspace.openTextDocument(path);
      let editor = await window.showTextDocument(doc);
      let range = editor.document.lineAt(line - 1).range;
      const position = editor.selection.active;

      editor.selection = new Selection(
        position.with(line - 1),
        position.with(line - 1)
      );
      editor.revealRange(range);
    }
  );

  let parse_ws_cmd = commands.registerCommand(
    "todominator.parse_workspace",
    function () {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      window.showInformationMessage("Hello World from todominator!");
    }
  );

  let parse_workspace_folder = commands.registerCommand(
    "todominator.parse_workspace_folder",
    function (folder) {
      const filesFilter = `**${folder.path.substring(
        folder.path.lastIndexOf("/")
      )}/*.*`;
      let filesPromise = workspace.findFiles(filesFilter, "**/node_modules/**");
      filesPromise.then((files) => {
        for (const strPath of files.map((uri) => uri.fsPath)) {
          console.log(`parsing: ${strPath}`);
          NBS.parse_file(strPath);
        }
        treeDataProvider.refresh();
      });
    }
  );

  context.subscriptions.push(
    parse_file_cmd,
    parse_ws_cmd,
    goto_nb_cmd,
    parse_workspace_folder
  );
}

async function getSourceFiles() {
  let files = workspace.findFiles("**/*.rs", "**/node_modules/**");
  return files.then((res) => {
    return res.map((uri) => uri.fsPath);
  });
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
  NotaBenes,
};
