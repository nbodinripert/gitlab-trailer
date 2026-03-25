import * as vscode from 'vscode';
import { GitLabProvider } from './gitlabProvider';

export function activate(context: vscode.ExtensionContext) {
    // Création du provider
    const gitLabProvider = new GitLabProvider();

    // Liaison avec la vue 'mrExplorer' définie dans le package.json
    vscode.window.registerTreeDataProvider('mrExplorer', gitLabProvider);

    // Enregistrement de la commande de refresh
    // ATTENTION : Le nom doit être EXACTEMENT le même que dans le package.json
    let refreshCmd = vscode.commands.registerCommand('gitlabTrailer.refreshEntry', () => {
        gitLabProvider.refresh();
    });

    // On écoute aussi les changements de configuration pour rafraîchir auto
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('gitlabTrailer')) {
            gitLabProvider.refresh();
        }
    });

    context.subscriptions.push(refreshCmd);
}

export function deactivate() {}