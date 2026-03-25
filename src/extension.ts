import * as vscode from 'vscode';
import { GitLabProvider } from './gitlabProvider';

export function activate(context: vscode.ExtensionContext) {
    const gitLabProvider = new GitLabProvider();

    // 1. Enregistre le Provider
    const view = vscode.window.registerTreeDataProvider('mrExplorer', gitLabProvider);

    // 2. Enregistre la commande de rafraîchissement
    const refreshCommand = vscode.commands.registerCommand('gitlabTrailer.refreshEntry', () => {
        gitLabProvider.refresh();
    });

    // Ajoute aux abonnements pour un nettoyage propre à la fermeture
    context.subscriptions.push(view, refreshCommand);

    // 3. FORCE un premier refresh immédiat à l'activation
    gitLabProvider.refresh();
}

export function deactivate() {}