# GitLab Pulse ⚡️

**GitLab Pulse** is your smart, AI-powered companion for Visual Studio Code. Keep your finger on the pulse of your project by tracking Merge Requests and generating instant summaries without ever leaving your editor.

## ✨ Key Features

- 🤖 **AI-Powered Summaries**: Generate concise English summaries for your MRs using OpenAI or Google Gemini. Just click the ✨ icon!
- 📥 **Real-time Monitoring**: Instant view of MRs assigned to you. See at a glance if changes were requested (🔴) or approved (✅).
- 📤 **Author Workspace**: Track your own open MRs and monitor reviewer progress.
- ✅ **Archive View**: Access recently merged MRs to stay informed on codebase evolution.
- 🔔 **Smart Notifications**: Get pinged immediately when a new MR lands on your desk.
- 🏷️ **Labels & Details**: High-visibility labels and reviewer status integrated directly into the tree.
- 🔄 **Auto-sync**: Data stays fresh with a background refresh every 2 minutes.

## ⚙️ Setup Instructions

1. Open **Settings** (`Ctrl+,`).
2. Search for `GitLab Pulse`.
3. Configure your **GitLab Personal Access Token**:
   - **Scope required**: `api` (to allow AI to update descriptions) or `read_api` (for monitoring only).
4. Enter your **Project Path** (e.g., `my-org/my-subgroup/project-name`).
5. (Optional) Setup **AI Integration**:
   - Select your provider (OpenAI or Gemini).
   - Paste your API Key to enable the "✨ Generate AI Summary" action.

## 🌍 Language Support

Native UI translations for **English, French, Spanish, German, and Italian**. 

## 📄 License

MIT