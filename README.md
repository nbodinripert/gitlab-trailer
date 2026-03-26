# GitLab MR Trailer 2.0 🪄

**GitLab MR Trailer** is a lightweight Visual Studio Code extension designed for developers who want to keep an eye on their Merge Requests without leaving their editor. 

With version 2.0, we introduced **AI Auto-Summarization**!

## ✨ Features

- 🤖 **AI MR Summary**: Click the magic wand inline button `✨` on your open MRs to automatically generate and append a concise English summary to your GitLab MR description. Supports **OpenAI** and **Google Gemini**.
- 📥 **To Review**: Instant view of MRs where you are a designated reviewer. See immediately if changes were requested (🔴) or approved (✅).
- 📤 **My Open MRs**: Track your own MRs and their approval status.
- ✅ **Recently Merged**: Keep track of what went into the codebase.
- 🔔 **Notifications**: Get notified immediately when a new MR is assigned to you.
- 🏷️ **Labels**: View GitLab labels directly in the tree.
- 🔄 **Auto-refresh**: Updates every 2 minutes.

## ⚙️ Configuration

1. Go to **Settings** (`Ctrl+,`).
2. Search for `GitLab Trailer`.
3. Set your **GitLab Personal Access Token**:
   - **Important**: Use the scope `api` (required to allow the AI to update your MR descriptions).
4. Set your **Project Path** (e.g., `group/subgroup/project-name`).
5. (Optional) Set your custom GitLab **Instance URL**.
6. **[NEW]** Select your **AI Provider** (OpenAI or Gemini) and enter your **AI API Key** to enable the auto-summary feature.

## 🌍 Internationalization

The UI supports English, French, Spanish, German, and Italian based on your VS Code display language. *(Note: AI Summaries are intentionally forced to English for codebase consistency).*

## 📄 License

MIT