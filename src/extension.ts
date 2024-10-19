import * as path from 'node:path';
import * as upath from 'upath';
import * as vscode from 'vscode';

import { GitExtension } from './git';
import { makeHttpsUrl } from './makeHttpsUrl';

const EXTENSION_NAME = 'githublinker-with-markdown';

type NormalizeGitUrl = (url: string) => {
  url: string;
  branch: string;
};
const normalizeGitUrl: NormalizeGitUrl = require('normalize-git-url');
const normalize = (url: string): string =>
  makeHttpsUrl(normalizeGitUrl(url).url);

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    `${EXTENSION_NAME}.copyLink`,
    () => {
      const _gitExtension =
        vscode.extensions.getExtension<GitExtension>('vscode.git');
      if (!_gitExtension) {
        vscode.window.showInformationMessage(
          `${EXTENSION_NAME} can't get git extension`
        );
        return;
      }
      const gitExtension = _gitExtension!.exports;
      const git = gitExtension.getAPI(1);

      // select main repo, not submodules
      // - collect submodules
      // - non-submodule repo should be main repo
      const submoduleUrls: { [key: string]: true } = {};
      git.repositories.forEach((repo) =>
        repo.state.submodules.forEach((subm) => {
          submoduleUrls[normalize(subm.url)] = true;
        })
      );

      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        vscode.window.showInformationMessage(
          `${EXTENSION_NAME} can't get active text editor`
        );
        return;
      }

      const absolutePath = activeTextEditor.document.fileName;
      const repository = git.repositories.find((repo) =>
        absolutePath.includes(repo.rootUri.fsPath)
      );
      if (!repository) {
        vscode.window.showInformationMessage(
          `${EXTENSION_NAME} can't get git repo`
        );
        return;
      }

      const remote = repository.state.remotes.find((r) => ['origin', 'upstream'].includes(r.name)) ||
          repository.state.remotes[0]
      const fetchUrl = remote.fetchUrl;
      const httpsUrl = normalize(fetchUrl!);

      const upperPath = repository.rootUri.fsPath;
      const relativePath = path.relative(upperPath, absolutePath);
      let filePath = upath.toUnix(relativePath);

      const selection = activeTextEditor.selection;
      if (selection) {
        const start = selection.start.line + 1;
        const end = selection.end.line + 1;
        filePath += `#L${start}`;

        if (start !== end) {
          filePath += `-L${end}`;
        }
      }

      repository.getCommit('HEAD').then((commit) => {
        const treeOrBlob = filePath.length === 0 ? 'tree' : 'blob';
        const url = `${httpsUrl}/${treeOrBlob}/${commit.hash}/${filePath}`;
        vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage('GitHub URL copied to the clipboard!');
      });
    }
  );

  context.subscriptions.push(disposable);

  let disposable1 = vscode.commands.registerCommand(
    `${EXTENSION_NAME}.copyMarkdown`,
    () => {
      const _gitExtension =
        vscode.extensions.getExtension<GitExtension>('vscode.git');
      if (!_gitExtension) {
        vscode.window.showInformationMessage(
          `${EXTENSION_NAME} can't get git extension`
        );
        return;
      }
      const gitExtension = _gitExtension!.exports;
      const git = gitExtension.getAPI(1);

      // select main repo, not submodules
      // - collect submodules
      // - non-submodule repo should be main repo
      const submoduleUrls: { [key: string]: true } = {};
      git.repositories.forEach((repo) =>
        repo.state.submodules.forEach((subm) => {
          submoduleUrls[normalize(subm.url)] = true;
        })
      );

      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        vscode.window.showInformationMessage(
          `${EXTENSION_NAME} can't get active text editor`
        );
        return;
      }

      const absolutePath = activeTextEditor.document.fileName;
      const repository = git.repositories.find((repo) =>
        absolutePath.includes(repo.rootUri.fsPath)
      );
      if (!repository) {
        vscode.window.showInformationMessage(
          `${EXTENSION_NAME} can't get git repo`
        );
        return;
      }

      const remote = repository.state.remotes.find((r) => ['origin', 'upstream'].includes(r.name)) ||
          repository.state.remotes[0]
      const fetchUrl = remote.fetchUrl;
      const httpsUrl = normalize(fetchUrl!);

      const upperPath = repository.rootUri.fsPath;
      const relativePath = path.relative(upperPath, absolutePath);
      let filePath = upath.toUnix(relativePath);

      const selection = activeTextEditor.selection;
      if (selection) {
        const start = selection.start.line + 1;
        const end = selection.end.line + 1;
        filePath += `#L${start}`;

        if (start !== end) {
          filePath += `-L${end}`;
        }
      }

      repository.getCommit('HEAD').then((commit) => {
        const treeOrBlob = filePath.length === 0 ? 'tree' : 'blob';
        const url = `${httpsUrl}/${treeOrBlob}/${commit.hash}/${filePath}`;
        const document = activeTextEditor.document;
        const selectedText = document.getText(selection);
        const markdown = url + '\n\n```' + document.languageId + '\n' + selectedText + '\n```';
        vscode.env.clipboard.writeText(markdown);
        vscode.window.showInformationMessage('GitHub URL and code copied to the clipboard!');
      });
    }
  );

  context.subscriptions.push(disposable1);
}

// this method is called when your extension is deactivated
export function deactivate() {
  // no-op
}
