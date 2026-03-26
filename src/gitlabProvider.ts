import axios from 'axios';
import * as vscode from 'vscode';

const l10n = {
    t: (key: string, ...args: any[]) => {
        const lang = vscode.env.language;
        const translations: any = {
            'fr': { 'toReview': 'À Revoir', 'myOpen': 'Mes MRs Ouvertes', 'merged': 'Récemment Mergées', 'newMr': 'Nouvelle MR : {0}', 'open': 'Ouvrir', 'error': 'Erreur API GitLab', 'aiGenerating': '🤖 Génération du résumé...', 'aiSuccess': 'Résumé ajouté !', 'aiError': 'Erreur IA. Vérifiez votre clé.', 'aiNoChanges': 'Aucun changement.', 'aiAction': '✨ Générer Résumé IA' },
            'es': { 'toReview': 'Para Revisar', 'myOpen': 'Mis MRs Abiertas', 'merged': 'Fusionadas', 'newMr': 'Nueva MR : {0}', 'open': 'Abrir', 'error': 'Error API GitLab', 'aiGenerating': '🤖 Generando...', 'aiSuccess': '¡Resumen añadido!', 'aiError': 'Error de IA.', 'aiNoChanges': 'Sin cambios.', 'aiAction': '✨ Generar Resumen IA' },
            'de': { 'toReview': 'Zu Prüfen', 'myOpen': 'Meine Offenen MRs', 'merged': 'Zusammengeführt', 'newMr': 'Neue MR : {0}', 'open': 'Öffnen', 'error': 'GitLab-API-Fehler', 'aiGenerating': '🤖 Zusammenfassung...', 'aiSuccess': 'Hinzugefügt!', 'aiError': 'KI-Fehler.', 'aiNoChanges': 'Keine Änderungen.', 'aiAction': '✨ KI-Zusammenfassung' },
            'it': { 'toReview': 'Da Revisionare', 'myOpen': 'Le Mie MR Aperte', 'merged': 'Unite', 'newMr': 'Nuova MR : {0}', 'open': 'Apri', 'error': 'Errore API GitLab', 'aiGenerating': '🤖 Generazione...', 'aiSuccess': 'Aggiunto!', 'aiError': 'Errore IA.', 'aiNoChanges': 'Nessuna modifica.', 'aiAction': '✨ Genera Riassunto IA' }
        };
        const set = translations[lang] || { 
            'toReview': 'To Review', 'myOpen': 'My Open MRs', 'merged': 'Recently Merged', 
            'newMr': 'New MR: {0}', 'open': 'Open', 'error': 'GitLab API Error',
            'aiGenerating': '🤖 Generating summary...', 'aiSuccess': 'Summary added!', 'aiError': 'AI Error.', 'aiNoChanges': 'No changes.', 'aiAction': '✨ Generate AI Summary'
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
        this.autoRefreshInterval = setInterval(() => this.refresh(), 2 * 60 * 1000);
    }

    private toBold(text: string): string {
        const boldChars: any = { 
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
        };
        return text.split('').map(c => boldChars[c] || c).join('');
    }

    refresh(): void { this._onDidChangeTreeData.fire(); }
    getTreeItem(element: MRItem): vscode.TreeItem { return element; }

    async getChildren(element?: MRItem): Promise<MRItem[]> {
        const config = vscode.workspace.getConfiguration('gitlabTrailer');
        const token = config.get<string>('apiToken');
        const baseUrl = (config.get<string>('instanceUrl') || 'https://gitlab.com').replace(/\/$/, "");
        const rawPath = config.get<string>('projectPath');

        if (!token || !rawPath) return [];
        const projectPath = encodeURIComponent(rawPath.trim());

        if (!element) {
            return [
                new MRItem(this.toBold(l10n.t('toReview')), "reviewer", vscode.TreeItemCollapsibleState.Expanded, new vscode.ThemeIcon("eye", new vscode.ThemeColor("charts.blue"))),
                new MRItem(this.toBold(l10n.t('myOpen')), "opened", vscode.TreeItemCollapsibleState.Expanded, new vscode.ThemeIcon("git-pull-request", new vscode.ThemeColor("charts.orange"))),
                new MRItem(this.toBold(l10n.t('merged')), "merged", vscode.TreeItemCollapsibleState.Collapsed, new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green")))
            ];
        }

        if (element.contextValue === "mr-item" || element.contextValue === "mr-item-owned") {
            return this.getMRDetails(element.mrData, baseUrl, token, projectPath, element.contextValue === "mr-item-owned");
        }

        try {
            if (!this.myUserId) {
                const { data: user } = await axios.get(`${baseUrl}/api/v4/user`, { headers: { 'PRIVATE-TOKEN': token } });
                this.myUserId = user.id;
            }
            const url = `${baseUrl}/api/v4/projects/${projectPath}/merge_requests`;
            let params: any = { per_page: 20, order_by: 'updated_at', state: element.contextValue === 'merged' ? 'merged' : 'opened' };

            if (element.contextValue === "reviewer") params.reviewer_id = this.myUserId;
            else if (element.contextValue === "opened" || element.contextValue === "merged") params.author_id = this.myUserId;

            const { data } = await axios.get(url, { params, headers: { 'PRIVATE-TOKEN': token } });
            if (element.contextValue === "reviewer") this.checkNewMRs(data);

            return data.map((mr: any) => {
                const initialState = element.contextValue === 'merged' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded;
                const itemContext = element.contextValue === 'opened' ? "mr-item-owned" : "mr-item";
                const item = new MRItem(mr.title, itemContext, initialState, new vscode.ThemeIcon("git-merge", new vscode.ThemeColor("descriptionForeground")));
                item.description = `!${mr.iid}`;
                item.mrData = mr;
                item.command = { command: 'vscode.open', title: "Open", arguments: [vscode.Uri.parse(mr.web_url)] };
                return item;
            });
        } catch (e) { return [new MRItem(l10n.t('error'), "error", vscode.TreeItemCollapsibleState.None)]; }
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

    private async getMRDetails(mr: any, baseUrl: string, token: string, projectPath: string, isOwned: boolean): Promise<MRItem[]> {
        const items: MRItem[] = [];
        
        // --- LOGIQUE BOUTON IA ---
        if (isOwned) {
            const config = vscode.workspace.getConfiguration('gitlabTrailer');
            const aiApiKey = config.get<string>('aiApiKey');
            
            // On ne l'affiche que si une clé est renseignée
            if (aiApiKey && aiApiKey.trim() !== "") {
                const aiBtn = new MRItem(`${l10n.t('aiAction')}`, "mr-action-ai", vscode.TreeItemCollapsibleState.None, new vscode.ThemeIcon("sparkle", new vscode.ThemeColor("charts.yellow")));
                aiBtn.mrData = mr;
                aiBtn.command = { command: 'gitlabTrailer.summarizeMR', title: "Summarize", arguments: [aiBtn] };
                items.push(aiBtn);
            }
        }

        if (mr.labels?.length > 0) {
            mr.labels.forEach((l: string) => items.push(new MRItem(l, "label", vscode.TreeItemCollapsibleState.None, new vscode.ThemeIcon("tag", new vscode.ThemeColor("charts.purple")))));
        }

        try {
            const [appRes, revRes] = await Promise.all([
                axios.get(`${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${mr.iid}/approvals`, { headers: { 'PRIVATE-TOKEN': token } }),
                axios.get(`${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${mr.iid}/reviewers`, { headers: { 'PRIVATE-TOKEN': token } }).catch(() => ({ data: [] }))
            ]);
            const approvedIds = new Set(appRes.data.approved_by?.map((a: any) => a.user.id) || []);
            const reviewerStates = new Map(revRes.data.map((r: any) => [r.user.id, r.state]));

            (mr.reviewers || []).forEach((rev: any) => {
                const isApproved = approvedIds.has(rev.id);
                const realState = reviewerStates.get(rev.id);
                const requestedChanges = realState === 'request_changes' || realState === 'requested_changes';
                let icon = requestedChanges ? new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red")) : (isApproved ? new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green")) : new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("descriptionForeground")));
                items.push(new MRItem(rev.name || rev.username, "rev", vscode.TreeItemCollapsibleState.None, icon));
            });
        } catch (e) {}
        return items;
    }

    public async generateSummary(item: MRItem) {
        console.log("🚀 Starting AI Summary process...");
        const config = vscode.workspace.getConfiguration('gitlabTrailer');
        const token = config.get<string>('apiToken');
        const baseUrl = (config.get<string>('instanceUrl') || 'https://gitlab.com').replace(/\/$/, "");
        const rawPath = config.get<string>('projectPath');
        const aiProvider = config.get<string>('aiProvider');
        const aiApiKey = config.get<string>('aiApiKey');

        if (!aiApiKey) {
            vscode.window.showErrorMessage(l10n.t('aiError'));
            return;
        }

        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: l10n.t('aiGenerating') }, async () => {
            try {
                const projectPath = encodeURIComponent(rawPath!.trim());
                const { data: changesData } = await axios.get(`${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${item.mrData.iid}/changes`, { headers: { 'PRIVATE-TOKEN': token } });
                let diffText = changesData.changes.map((c: any) => `File: ${c.new_path}\n${c.diff}`).join('\n\n').substring(0, 15000);
                
                if (!diffText.trim()) {
                    vscode.window.showInformationMessage(l10n.t('aiNoChanges'));
                    return;
                }

                const prompt = `Summarize these GitLab MR changes in English (max 10 sentences). Rules: Concise, no intro/outro.\n\n${diffText}`;
                let aiSummary = "";

                if (aiProvider === "OpenAI") {
                    const res = await axios.post('https://api.openai.com/v1/chat/completions', { model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }, { headers: { Authorization: `Bearer ${aiApiKey}` } });
                    aiSummary = res.data.choices[0].message.content.trim();
                } else if (aiProvider === "Gemini") {
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${aiApiKey}`;
                    const res = await axios.post(geminiUrl, { contents: [{ parts: [{ text: prompt }] }] });
                    if (res.data.candidates && res.data.candidates[0].content) {
                        aiSummary = res.data.candidates[0].content.parts[0].text.trim();
                    } else { throw new Error("Gemini response empty"); }
                }

                const currentDesc = item.mrData.description || "";
                const summaryRegex = /## 🤖 Summary[\s\S]*/;
                const formattedSummary = `## 🤖 Summary\n\n${aiSummary}`;
                const newDesc = summaryRegex.test(currentDesc) ? currentDesc.replace(summaryRegex, formattedSummary) : (currentDesc ? `${currentDesc}\n\n${formattedSummary}` : formattedSummary);

                await axios.put(`${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${item.mrData.iid}`, { description: newDesc }, { headers: { 'PRIVATE-TOKEN': token } });
                vscode.window.showInformationMessage(l10n.t('aiSuccess'));
            } catch (e) { vscode.window.showErrorMessage(l10n.t('aiError')); }
        });
    }

    dispose() { if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval); }
}

class MRItem extends vscode.TreeItem {
    public mrData?: any;
    constructor(label: string, contextValue: string, collapsibleState: vscode.TreeItemCollapsibleState, iconPath?: vscode.ThemeIcon) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.iconPath = iconPath;
    }
}