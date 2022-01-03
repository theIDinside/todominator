const { EventEmitter } = require("vscode");
/**
 * @returns { import("vscode").TreeDataProvider }
 */
class NotaBeneTreeDataProvider {
  _onDidChangeTreeData = new EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  /**
   * @param {import ("./todo").NotaBenes} notabenes
   * @param {string} workspaceRoot
   */
  constructor(notabenes, workspaceRoot = null) {
    this.notabenes = notabenes;
    this.workspace = workspaceRoot;
  }

  refresh() {
    try {
      this._onDidChangeTreeData.fire();
    } catch (err) {
      console.log(`event listener _onDidChangeTreeData not found: ${err}`);
    }
  }

  /**
   *
   * @param {import ("./todo").ParsedFile} parsedFile
   * @returns
   */
  async getChildren(parsedFile) {
    if (!parsedFile) {
      let result = await this.notabenes.getTreeViewRoots();
      return result;
    } else {
      let nbs = await parsedFile.nota_benes();
      return nbs;
    }
  }

  getTreeItem(key) {
    return key;
  }
  /**
   * @param {{key: string}} element
   * @returns {{ key: string }}
   */
  getParent({ key }) {
    this.notabenes.id_to_path.get(key);
  }
}

module.exports = {
  NotaBeneTreeDataProvider,
};
