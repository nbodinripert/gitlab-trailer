import axios from 'axios';
import * as vscode from 'vscode';

// Gestionnaire de traduction Pro
const l10n = {
    t: (key: string, ...args: any[]) => {
        const lang = vscode.env.language;
        const translations: any = {
            'fr': { 'toReview': 'À Revoir', 'myOpen': 'Mes MRs Ouvertes', 'merged': 'Récemment Mergées', 'newMr': 'Nouvelle MR à revoir : {0}', 'open': 'Ouvrir', 'error': 'Erreur API GitLab' },
            'es': { 'toReview': 'Para Revisar', 'myOpen': 'Mis MRs Abiertas', 'merged': 'Fusionadas Recientemente', 'newMr': 'Nueva MR para revisar : {0}', 'open': 'Abrir', 'error': 'Error de API GitLab' },
            'de': { 'toReview': 'Zu Prüfen', 'myOpen': 'Meine Offenen MRs', 'merged': 'Kürzlich Zusammengeführt', 'newMr': 'Neue MR zum Prüfen : {0}', 'open': 'Öffnen', 'error': 'GitLab-API-Fehler' },
            'it': { 'toReview': 'Da Revisionare', 'myOpen': 'Le Mie MR Aperte', 'merged': 'Unite Recentemente', 'newMr': 'Nuova MR da revisionare : {0}', 'open': 'Apri', 'error': 'Errore API GitLab' }
        };
        const set = translations[lang] || { 
            'toReview': 'To Review', 'myOpen': 'My Open MRs', 'merged': 'Recently Merged', 
            'newMr': 'New MR to review: {0}', 'open': 'Open', 'error': 'GitLab API Error' 
        };
        let text = set[key] || key;
        args.forEach((val, i) => text = text.replace(`{${i}}`, val));
        return text;
    }
};

export class GitLabProvider implements vscode.TreeDataProvider<MRItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<MRItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private myUserId: number | null = null;
    private autoRefreshInterval: NodeJS.Timeout | null = null;
    private knownMRIds: Set<number> = new Set();
    private isInitialLoad = true;

    constructor() {
        // Refresh toutes les 2 minutes
        this.autoRefreshInterval = setInterval(() => this.refresh(), 2 * 60 * 1000);
    }

    private toBold(text: string): string {
        const boldChars: any = { 
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
        };
        return text.split('').map(c => boldChars[c] || c).join('');
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MRItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MRItem): Promise<MRItem[]> {
        const config = vscode.workspace.getConfiguration('gitlabTrailer');
        const token = config.get<string>('apiToken');
        const baseUrl = (config.get<string>('instanceUrl') || 'https://gitlab.com').replace(/\/$/, "");
        const rawPath = config.get<string>('projectPath');

        if (!token || !rawPath) return [];

        const projectPath = encodeURIComponent(rawPath.trim());

        // --- NIVEAU 1 : SECTIONS ---
        if (!element) {
            return [
                new MRItem(this.toBold(l10n.t('toReview')), "reviewer", vscode.TreeItemCollapsibleState.Expanded, new vscode.ThemeIcon("eye", new vscode.ThemeColor("charts.blue"))),
                new MRItem(this.toBold(l10n.t('myOpen')), "opened", vscode.TreeItemCollapsibleState.Collapsed, new vscode.ThemeIcon("git-pull-request", new vscode.ThemeColor("charts.orange"))),
                // FIX: On s'assure que l'icône est bien instanciée
                new MRItem(this.toBold(l10n.t('merged')), "merged", vscode.TreeItemCollapsibleState.Collapsed, new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green")))
            ];
        }

        if (element.contextValue === "mr-item") {
            return this.getMRDetails(element.mrData, baseUrl, token, projectPath);
        }

        // --- NIVEAU 2 : MERGE REQUESTS ---
        try {
            if (!this.myUserId) {
                const { data: user } = await axios.get(`${baseUrl}/api/v4/user`, { headers: { 'PRIVATE-TOKEN': token } });
                this.myUserId = user.id;
            }

            const url = `${baseUrl}/api/v4/projects/${projectPath}/merge_requests`;
            let params: any = { 
                per_page: 20, 
                order_by: 'updated_at',
                state: element.contextValue === 'merged' ? 'merged' : 'opened'
            };

            if (element.contextValue === "reviewer") {
                params.reviewer_id = this.myUserId;
            } else if (element.contextValue === "opened" || element.contextValue === "merged") {
                params.author_id = this.myUserId;
            }

            const { data } = await axios.get(url, { params, headers: { 'PRIVATE-TOKEN': token } });

            if (element.contextValue === "reviewer") {
                this.checkNewMRs(data);
            }

            return data.map((mr: any) => {
                const initialState = element.contextValue === 'merged' 
                    ? vscode.TreeItemCollapsibleState.Collapsed 
                    : vscode.TreeItemCollapsibleState.Expanded;

                const item = new MRItem(
                    mr.title, 
                    "mr-item", 
                    initialState, 
                    new vscode.ThemeIcon("git-merge", new vscode.ThemeColor("descriptionForeground"))
                );
                
                item.description = `!${mr.iid}`;
                item.mrData = mr;
                item.command = { 
                    command: 'vscode.open', 
                    title: "Open", 
                    arguments: [vscode.Uri.parse(mr.web_url)] 
                };
                return item;
            });
        } catch (e) {
            return [new MRItem(l10n.t('error'), "error", vscode.TreeItemCollapsibleState.None)];
        }
    }

    private checkNewMRs(mrs: any[]) {
        const newIds = mrs.map(mr => mr.id);
        if (!this.isInitialLoad) {
            mrs.forEach(mr => {
                if (!this.knownMRIds.has(mr.id)) {
                    vscode.window.showInformationMessage(l10n.t('newMr', mr.title), l10n.t('open'))
                        .then(sel => { if (sel === l10n.t('open')) vscode.env.openExternal(vscode.Uri.parse(mr.web_url)); });
                }
            });
        }
        this.knownMRIds = new Set(newIds);
        this.isInitialLoad = false;
    }

    private async getMRDetails(mr: any, baseUrl: string, token: string, projectPath: string): Promise<MRItem[]> {
        const items: MRItem[] = [];
        
        // Labels
        if (mr.labels?.length > 0) {
            mr.labels.forEach((l: string) => {
                items.push(new MRItem(l, "label", vscode.TreeItemCollapsibleState.None, new vscode.ThemeIcon("tag", new vscode.ThemeColor("charts.purple"))));
            });
        }

        // Reviewers & Approvals
        try {
            const { data: app } = await axios.get(`${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${mr.iid}/approvals`, { headers: { 'PRIVATE-TOKEN': token } });
            (mr.reviewers || []).forEach((rev: any) => {
                const ok = app.approved_by?.some((a: any) => a.user.id === rev.id);
                const icon = ok 
                    ? new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green")) 
                    : new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("descriptionForeground"));
                items.push(new MRItem(rev.name || rev.username, "rev", vscode.TreeItemCollapsibleState.None, icon));
            });
        } catch (e) {}

        return items;
    }

    dispose() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    }
}

class MRItem extends vscode.TreeItem {
    public mrData?: any;
    constructor(label: string, contextValue: string, collapsibleState: vscode.TreeItemCollapsibleState, iconPath?: vscode.ThemeIcon) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.iconPath = iconPath;
    }
}