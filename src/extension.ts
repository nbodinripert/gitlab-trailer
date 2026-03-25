import * as vscode from 'vscode';
import { GitLabProvider } from './gitlabProvider';

// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
    const gitLabProvider = new GitLabProvider();
    
    // Must match the id declared in package.json > views
    vscode.window.registerTreeDataProvider('mrExplorer', gitLabProvider);

    // Register the toolbar button command
    context.subscriptions.push(
        vscode.commands.registerCommand('gitlabTrailer.refreshEntry', () => {
            gitLabProvider.refresh();
        })
    );
}