# GitLab Pulse ⚡️

**GitLab Pulse** is your smart, AI-powered companion for Visual Studio Code. Keep your finger on the pulse of your projects by tracking Merge Requests and generating instant summaries without ever leaving your editor.

![GitLab Pulse Icon](icon.jpg)

## ✨ Key Features

- 🤖 **AI-Powered Summaries**: Generate concise English summaries for your MRs using OpenAI or Google Gemini. Just click the `✨ Generate AI Summary` action inside your open MRs.
- 📥 **Real-time Monitoring**: Instant view of MRs assigned to you. See at a glance if changes were requested (🔴) or approved (✅).
- 📤 **Author Workspace**: Track your own open MRs and monitor reviewer progress in real-time.
- 🔁 **One-Click Re-request**: Corrected the feedback? Click directly on a reviewer with a 🔴 status to re-request their review instantly.
- ✅ **Archive View**: Access recently merged MRs to stay informed on codebase evolution.
- 🔔 **Smart Notifications**: Get pinged immediately when a new MR lands on your desk.
- 🏷️ **Labels & Details**: High-visibility labels and reviewer status integrated directly into the tree.
- 🔄 **Auto-sync**: Data stays fresh with a background refresh every 2 minutes.

## ⚙️ Setup Instructions

1. Open **Settings** (`Ctrl+,`).
2. Search for `GitLab Pulse`.
3. Configure your **GitLab Personal Access Token**:
   - **Scope required**: `api` (to allow AI to update descriptions and re-request reviews).
4. Enter your **Project Path** (e.g., `my-org/my-subgroup/project-name`).
5. (Optional) Setup **AI Integration**:
   - Select your provider (OpenAI or Gemini).
   - Paste your API Key to enable the AI summary action.

## 💡 Pro Tips

- **Focused UI**: Items like labels or approved reviewers are non-clickable to keep your workspace clean.
- **Smart Context**: The `AI Summary` button only appears if you have configured an AI API Key.
- **English First**: AI summaries are forced to English to maintain consistency in professional codebases, regardless of your VS Code language.

## 🌍 Language Support

Native UI translations for **English, French, Spanish, German, and Italian**.

## 📄 License

MIT