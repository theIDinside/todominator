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
    this._onDidChangeTreeData.fire();
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
  getParent({ key }) {
    console.log("get parent? we have no use of get parent");
  }
}

module.exports = {
  NotaBeneTreeDataProvider,
};
