import * as vscode from 'vscode';
import { GitLabProvider } from './gitlabProvider';

export function activate(context: vscode.ExtensionContext) {
    const gitLabProvider = new GitLabProvider();

    // IMPORTANT: L'ID 'mrExplorer' doit matcher celui du package.json
    const treeView = vscode.window.registerTreeDataProvider('mrExplorer', gitLabProvider);

    // Enregistrement de la commande
    const refreshCommand = vscode.commands.registerCommand('gitlabTrailer.refreshEntry', () => {
        gitLabProvider.refresh();
    });

    // Écouteur de configuration pour le refresh auto
    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('gitlabTrailer')) {
            gitLabProvider.refresh();
        }
    });

    context.subscriptions.push(treeView, refreshCommand, configWatcher);
}

export function deactivate() {}