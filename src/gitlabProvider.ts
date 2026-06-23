import axios from "axios";
import * as vscode from "vscode";

export class GitLabProvider implements vscode.TreeDataProvider<MRItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    MRItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private myUserId: number | null = null;
  private autoRefreshInterval: NodeJS.Timeout | null = null;
  private knownMRIds: Set<number> = new Set();
  private isInitialLoad = true;

  constructor() {
    this.autoRefreshInterval = setInterval(() => this.refresh(), 2 * 60 * 1000);

    vscode.commands.registerCommand(
      "gitlabPulse.reRequestReview",
      async (
        projectPath: string,
        mrIid: number,
        userId: number,
        userName: string,
      ) => {
        await this.reRequestReview(projectPath, mrIid, userId, userName);
      },
    );
  }

  private toBold(text: string): string {
    const boldChars: Record<string, string> = {
      A: "𝗔",
      B: "𝗕",
      C: "𝗖",
      D: "𝗗",
      E: "𝗘",
      F: "𝗙",
      G: "𝗚",
      H: "𝗛",
      I: "𝗜",
      J: "𝗝",
      K: "𝗞",
      L: "𝗟",
      M: "𝗠",
      N: "𝗡",
      O: "𝗢",
      P: "𝗣",
      Q: "𝗤",
      R: "𝗥",
      S: "𝗦",
      T: "𝗧",
      U: "𝗨",
      V: "𝗩",
      W: "𝗪",
      X: "𝗫",
      Y: "𝗬",
      Z: "𝗭",
      a: "𝗮",
      b: "𝗯",
      c: "𝗰",
      d: "𝗱",
      e: "𝗲",
      f: "𝗳",
      g: "𝗴",
      h: "𝗵",
      i: "𝗶",
      j: "𝗷",
      k: "𝗸",
      l: "𝗹",
      m: "𝗺",
      n: "𝗻",
      o: "𝗼",
      p: "𝗽",
      q: "𝗾",
      r: "𝗿",
      s: "𝘀",
      t: "𝘁",
      u: "𝘂",
      v: "𝘃",
      w: "𝘄",
      x: "𝗅",
      y: "𝘆",
      z: "𝘇",
    };
    return text
      .split("")
      .map((c) => boldChars[c] || c)
      .join("");
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element: MRItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MRItem): Promise<MRItem[]> {
    const config = vscode.workspace.getConfiguration("gitlabTrailer");
    const token = config.get<string>("apiToken");
    const baseUrl = (
      config.get<string>("instanceUrl") || "https://gitlab.com"
    ).replace(/\/$/, "");
    const rawPath = config.get<string>("projectPath");

    if (!token || !rawPath) return [];
    const projectPath = encodeURIComponent(rawPath.trim());

    if (!element) {
      return [
        new MRItem(
          this.toBold(vscode.l10n.t("view.toReview")),
          "section",
          vscode.TreeItemCollapsibleState.Expanded,
          new vscode.ThemeIcon("eye", new vscode.ThemeColor("charts.blue")),
        ),
        new MRItem(
          this.toBold(vscode.l10n.t("view.myOpenMrs")),
          "section",
          vscode.TreeItemCollapsibleState.Expanded,
          new vscode.ThemeIcon(
            "git-pull-request",
            new vscode.ThemeColor("charts.orange"),
          ),
        ),
        new MRItem(
          this.toBold(vscode.l10n.t("view.recentlyMerged")),
          "section",
          vscode.TreeItemCollapsibleState.Collapsed,
          new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green")),
        ),
      ];
    }

    if (
      element.contextValue === "mr-item" ||
      element.contextValue === "mr-item-owned"
    ) {
      return this.getMRDetails(
        element.mrData,
        baseUrl,
        token,
        projectPath,
        element.contextValue === "mr-item-owned",
      );
    }

    try {
      if (!this.myUserId) {
        const { data: user } = await axios.get(`${baseUrl}/api/v4/user`, {
          headers: { "PRIVATE-TOKEN": token },
        });
        this.myUserId = user.id;
      }
      let stateFilter = "opened";
      let authorId = undefined;
      let reviewerId = undefined;

      if (element.label === this.toBold(vscode.l10n.t("view.recentlyMerged")))
        stateFilter = "merged";
      if (element.label === this.toBold(vscode.l10n.t("view.toReview")))
        reviewerId = this.myUserId;
      else authorId = this.myUserId;

      const url = `${baseUrl}/api/v4/projects/${projectPath}/merge_requests`;
      const { data } = await axios.get(url, {
        params: {
          per_page: 20,
          order_by: "updated_at",
          state: stateFilter,
          author_id: authorId,
          reviewer_id: reviewerId,
        },
        headers: { "PRIVATE-TOKEN": token },
      });

      if (reviewerId) this.checkNewMRs(data);

      return data.map((mr: any) => {
        const isOwned = mr.author.id === this.myUserId;
        const item = new MRItem(
          mr.title,
          isOwned ? "mr-item-owned" : "mr-item",
          vscode.TreeItemCollapsibleState.Expanded,
          new vscode.ThemeIcon(
            "git-merge",
            new vscode.ThemeColor("descriptionForeground"),
          ),
        );
        item.description = `!${mr.iid}`;
        item.mrData = mr;
        item.command = {
          command: "vscode.open",
          title: "Open",
          arguments: [vscode.Uri.parse(mr.web_url)],
        };
        return item;
      });
    } catch (e) {
      return [
        new MRItem(
          vscode.l10n.t("error.gitlab"),
          "error",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }
  }

  private checkNewMRs(mrs: any[]) {
    const newIds = mrs.map((mr) => mr.id);
    if (!this.isInitialLoad) {
      mrs.forEach((mr) => {
        if (!this.knownMRIds.has(mr.id)) {
          vscode.window
            .showInformationMessage(
              vscode.l10n.t("msg.newToken", mr.title),
              vscode.l10n.t("msg.open"),
            )
            .then((sel) => {
              if (sel === vscode.l10n.t("msg.open"))
                vscode.env.openExternal(vscode.Uri.parse(mr.web_url));
            });
        }
      });
    }
    this.knownMRIds = new Set(newIds);
    this.isInitialLoad = false;
  }

  private async getMRDetails(
    mr: any,
    baseUrl: string,
    token: string,
    projectPath: string,
    isOwned: boolean,
  ): Promise<MRItem[]> {
    const items: MRItem[] = [];

    if (isOwned) {
      const config = vscode.workspace.getConfiguration("gitlabTrailer");
      const aiApiKey = config.get<string>("aiApiKey");
      if (aiApiKey && aiApiKey.trim() !== "") {
        const aiBtn = new MRItem(
          vscode.l10n.t("ai.action"),
          "mr-action-ai",
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon(
            "sparkle",
            new vscode.ThemeColor("charts.yellow"),
          ),
        );
        aiBtn.mrData = mr;
        aiBtn.command = {
          command: "gitlabTrailer.summarizeMR",
          title: "Summarize",
          arguments: [aiBtn],
        };
        items.push(aiBtn);
      }
    }

    if (mr.labels?.length > 0) {
      mr.labels.forEach((l: string) => {
        const labelItem = new MRItem(
          l,
          "label",
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon("tag", new vscode.ThemeColor("charts.purple")),
        );
        items.push(labelItem);
      });
    }

    try {
      const [appRes, revRes] = await Promise.all([
        axios.get(
          `${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${mr.iid}/approvals`,
          { headers: { "PRIVATE-TOKEN": token } },
        ),
        axios
          .get(
            `${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${mr.iid}/reviewers`,
            { headers: { "PRIVATE-TOKEN": token } },
          )
          .catch(() => ({ data: [] })),
      ]);
      const approvedIds = new Set(
        appRes.data.approved_by?.map((a: any) => a.user.id) || [],
      );
      const reviewerStates = new Map(
        revRes.data.map((r: any) => [r.user.id, r.state]),
      );

      (mr.reviewers || []).forEach((rev: any) => {
        const isApproved = approvedIds.has(rev.id);
        const realState = reviewerStates.get(rev.id);
        const requestedChanges =
          realState === "request_changes" || realState === "requested_changes";

        let icon;
        let context = "rev";
        let command = undefined;

        if (requestedChanges) {
          icon = new vscode.ThemeIcon(
            "error",
            new vscode.ThemeColor("charts.red"),
          );
          if (isOwned) {
            context = "rev-action-needed";
            command = {
              command: "gitlabPulse.reRequestReview",
              title: vscode.l10n.t("review.reRequest", rev.name),
              arguments: [projectPath, mr.iid, rev.id, rev.name],
            };
          }
        } else if (isApproved) {
          icon = new vscode.ThemeIcon(
            "check",
            new vscode.ThemeColor("charts.green"),
          );
        } else {
          icon = new vscode.ThemeIcon(
            "circle-outline",
            new vscode.ThemeColor("descriptionForeground"),
          );
        }

        const revItem = new MRItem(
          rev.name || rev.username,
          context,
          vscode.TreeItemCollapsibleState.None,
          icon,
        );
        revItem.command = command;
        items.push(revItem);
      });
    } catch (e) {}
    return items;
  }

  private async reRequestReview(
    projectPath: string,
    mrIid: number,
    userId: number,
    userName: string,
  ) {
    const config = vscode.workspace.getConfiguration("gitlabTrailer");
    const token = config.get<string>("apiToken");
    const baseUrl = (
      config.get<string>("instanceUrl") || "https://gitlab.com"
    ).replace(/\/$/, "");

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t("review.reRequesting", userName),
      },
      async () => {
        try {
          const decodedProjectPath = decodeURIComponent(projectPath);
          const query = `
                    mutation reRequestReview($projectPath: ID!, $iid: String!, $userId: UserID!) {
                        mergeRequestReviewerRereview(input: { projectPath: $projectPath, iid: $iid, userId: $userId }) {
                            errors
                        }
                    }
                `;
          const variables = {
            projectPath: decodedProjectPath,
            iid: mrIid.toString(),
            userId: `gid://gitlab/User/${userId}`,
          };

          const res = await axios.post(
            `${baseUrl}/api/graphql`,
            { query, variables },
            { headers: { "PRIVATE-TOKEN": token } },
          );

          if (
            res.data?.errors ||
            res.data?.data?.mergeRequestReviewerRereview?.errors?.length > 0
          ) {
            throw new Error("GraphQL execution error");
          }

          vscode.window.showInformationMessage(
            vscode.l10n.t("review.reRequestSuccess", userName),
          );
          this.refresh();
        } catch (e) {
          console.error("Erreur GraphQL Re-request:", e);
          vscode.window.showErrorMessage(vscode.l10n.t("error.gitlab"));
        }
      },
    );
  }

  public async generateSummary(item: MRItem) {
    const config = vscode.workspace.getConfiguration("gitlabTrailer");
    const token = config.get<string>("apiToken");
    const baseUrl = (
      config.get<string>("instanceUrl") || "https://gitlab.com"
    ).replace(/\/$/, "");
    const rawPath = config.get<string>("projectPath");
    const aiProvider = config.get<string>("aiProvider");
    const aiApiKey = config.get<string>("aiApiKey");

    if (!aiApiKey) return;

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t("ai.generating"),
      },
      async () => {
        try {
          const projectPath = encodeURIComponent(rawPath!.trim());
          const { data: changesData } = await axios.get(
            `${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${item.mrData.iid}/changes`,
            { headers: { "PRIVATE-TOKEN": token } },
          );
          let diffText = changesData.changes
            .map((c: any) => `File: ${c.new_path}\n${c.diff}`)
            .join("\n\n")
            .substring(0, 15000);

          const prompt = `You are a senior software engineer reviewing a GitLab merge request. Analyze the following diff and produce a concise technical summary.

                Rules:
                - Use a bullet point list (markdown)
                - Focus on: what changed, why it matters, any architectural or code quality observations
                - Be direct and technical, no intro or outro
                - Max 10 bullet points

                ${diffText}`;

          let aiSummary = "";

          if (aiProvider === "OpenAI") {
            const res = await axios.post(
              "https://api.openai.com/v1/chat/completions",
              {
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
              },
              { headers: { Authorization: `Bearer ${aiApiKey}` } },
            );
            aiSummary = res.data.choices[0].message.content.trim();
          } else if (aiProvider === "Gemini") {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${aiApiKey}`;
            const res = await axios.post(geminiUrl, {
              contents: [{ parts: [{ text: prompt }] }],
            });
            aiSummary = res.data.candidates[0].content.parts[0].text.trim();
          }

          const currentDesc = item.mrData.description || "";
          const summaryRegex = /## 🤖 Summary[\s\S]*/;
          const formattedSummary = `## 🤖 Summary\n\n${aiSummary}`;
          const newDesc = summaryRegex.test(currentDesc)
            ? currentDesc.replace(summaryRegex, formattedSummary)
            : currentDesc
              ? `${currentDesc}\n\n${formattedSummary}`
              : formattedSummary;

          await axios.put(
            `${baseUrl}/api/v4/projects/${projectPath}/merge_requests/${item.mrData.iid}`,
            { description: newDesc },
            { headers: { "PRIVATE-TOKEN": token } },
          );
          vscode.window.showInformationMessage(vscode.l10n.t("ai.success"));
        } catch (e: any) {
          let errorDetail = "Unknown Error";

          if (axios.isAxiosError(e) && e.response?.data) {
            const data: any = e.response.data;
            // Format d'erreur OpenAI (data.error.message) ou fallback (message direct ou JSON brut)
            errorDetail =
              data.error?.message ||
              data.error ||
              data.message ||
              JSON.stringify(data);
          } else if (e.message) {
            errorDetail = e.message;
          } else {
            errorDetail = String(e);
          }

          console.error("Détail complet de l'erreur IA :", e);

          // Utilisation de l'API de localisation officielle avec paramètre dynamique
          vscode.window.showErrorMessage(
            vscode.l10n.t("ai.error", errorDetail),
          );
        }
      },
    );
  }

  dispose() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
  }
}

class MRItem extends vscode.TreeItem {
  public mrData?: any;
  constructor(
    label: string,
    contextValue: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    this.iconPath = iconPath;
  }
}
