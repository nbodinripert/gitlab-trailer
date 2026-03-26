import * as vscode from 'vscode';
import { GitLabProvider } from './gitlabProvider';

export function activate(context: vscode.ExtensionContext) {
    const gitLabProvider = new GitLabProvider();

    const treeView = vscode.window.registerTreeDataProvider('mrExplorer', gitLabProvider);

    const refreshCommand = vscode.commands.registerCommand('gitlabTrailer.refreshEntry', () => {
        gitLabProvider.refresh();
    });

    const summarizeCommand = vscode.commands.registerCommand('gitlabTrailer.summarizeMR', async (item) => {
        if (item) {
            await gitLabProvider.generateSummary(item);
        }
    });

    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('gitlabTrailer')) {
            gitLabProvider.refresh();
        }
    });

    context.subscriptions.push(treeView, refreshCommand, summarizeCommand, configWatcher);
}

export function deactivate() {}