const {
  commands,
  window,
  workspace,
  TextDocumentSaveReason,
  Selection,
} = require("vscode");
const { NotaBenes } = require("./src/todo");
const { NotaBeneTreeDataProvider } = require("./src/todoTreeDataProvider");
const { readFile, stat } = require("fs");

const { gitToJs } = require("git-parse");

let NBS = new NotaBenes();

const { resolve } = require("path");
const { readdir } = require("fs").promises;

async function* getAllFolders(dir, ...ignores) {
  const curr = resolve(dir);
  const directoryEntries = await readdir(dir, { withFileTypes: true });
  for (const directoryEntry of directoryEntries) {
    const res = resolve(dir, directoryEntry.name);
    let component = res.substring(curr.length);
    if (!ignores.some((v) => component.includes(v))) {
      if (directoryEntry.isDirectory()) {
        yield* getAllFolders(res, ...ignores);
        yield res;
      }
    }
  }
  return dir;
}

/**
 * @param { import ("vscode").ExtensionContext } context
 */
function activate(context) {
  gitToJs("./").then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
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
    async () => {
      for await (const directory of getAllFolders(
        workspace.workspaceFolders[0].uri.fsPath,
        "node_modules",
        "target"
      )) {
        const filesFilter = `**${directory.slice(
          workspace.workspaceFolders[0].uri.fsPath.length
        )}/*.*`;
        let filesPromise = workspace.findFiles(filesFilter);
        filesPromise.then((files) => {
          for (const strPath of files.map((uri) => uri.fsPath)) {
            console.log(`parsing: ${strPath}`);
            NBS.parse_file(strPath);
          }
          treeDataProvider.refresh();
        });
      }
    }
  );

  let parse_workspace_folder = commands.registerCommand(
    "todominator.parse_workspace_folder",
    async (folder) => {
      for (const dir of getAllFolders(
        `${folder.path}`,
        "node_modules",
        "target"
      )) {
        dir.then((directory) => {
          const filesFilter = `**${directory}/*.*`;
          let filesPromise = workspace.findFiles(filesFilter);
          filesPromise.then((files) => {
            for (const strPath of files.map((uri) => uri.fsPath)) {
              console.log(`parsing: ${strPath}`);
              NBS.parse_file(strPath);
            }
            treeDataProvider.refresh();
          });
        });
      }
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
  let files = workspace.findFiles(
    "**/*.rs",
    "{**/node_modules/**, **/target/debug/**, **/target/release/**}"
  );
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
