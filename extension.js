const {
  commands,
  window,
  workspace,
  TextDocumentSaveReason,
  Selection,
} = require("vscode");
const { NotaBenes } = require("./src/todo");
const { NotaBeneTreeDataProvider } = require("./src/todoTreeDataProvider");
const { parseFolder, getFolders } = require("./src/utils");
// const { gitToJs } = require("git-parse");

let NBS = new NotaBenes();

/**
 * @param { import ("vscode").ExtensionContext } context
 */
async function activate(context) {
  const requestSettings = async () => {
    const configuration = workspace.getConfiguration("todominator");
    let folder_ignores = configuration.get("folder-ignores");
    let file_extensions = configuration.get("file-extensions-to-parse");
    if (!folder_ignores) {
      let tmp = await window.showInputBox({
        title: "Write space separated list of folders to ignore",
        prompt: "/path/ignore1 /other/path/ignore2",
      });
      folder_ignores = tmp.split(" ");
    }

    if (!file_extensions) {
      let tmp = await window.showInputBox({
        title: "Write space separated list of file extensions to parse",
        prompt: "rs cpp c hpp h",
      });
      file_extensions = tmp.split(" ");
    }
    return { folder_ignores, file_extensions };
  };

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

	const parse_workspace_nbs = async() => {
		const { folder_ignores, file_extensions } = await requestSettings();
		const path = workspace.workspaceFolders[0].uri.fsPath;
		let promises = []
		for await (const dir of getFolders(path, folder_ignores)) {
			console.log(`Parsing folder: ${dir}`);
			promises.push(NBS.insert_parsed(parseFolder(dir, file_extensions)));
		}
		await Promise.all(promises);
		treeDataProvider.refresh();
		console.log("Done parsing workspace");
	};

  let parse_ws_cmd = commands.registerCommand("todominator.parse_workspace", parse_workspace_nbs);

  let parse_workspace_folder = commands.registerCommand(
    "todominator.parse_workspace_folder",
    async (folder) => {
      let { folder_ignores, file_extensions } = await requestSettings();
			let promises = [];
      for await (const dir of getFolders(`${folder.path}`, folder_ignores)) {
        console.log(`parsing folder: ${dir}`);
        promises.push(NBS.insert_parsed(parseFolder(dir, file_extensions)));
      }
			await Promise.all(promises);
      treeDataProvider.refresh();
    }
  );

  context.subscriptions.push(
    parse_file_cmd,
    parse_ws_cmd,
    goto_nb_cmd,
    parse_workspace_folder
  );

  await window
    .showInformationMessage("Parse workspace for N.B.'s?", "yes", "no")
    .then(async (res) => {
      if (res == "yes") {
				await parse_workspace_nbs();
      } else {
        console.log(`Parsing workspace rejected`);
      }
    });
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
