# DCI Hackathon 2025 Project

This project contains a Gemini CLI extension that allows you to retrieve the git diff for a recently deployed image on a GKE (Google Kubernetes Engine) deployment.

## Gemini CLI Extension

The extension adds a `get-diff` command to the Gemini CLI.

### Prerequisites

1.  **Install Dependencies:** Before using the extension, you need to install its dependencies. Run the following command from the root of the project:
    ```bash
    npm install --prefix .gemini/extensions/dci
    ```

2.  **Set GitHub Token:** You must have a `GITHUB_TOKEN` environment variable set with a valid GitHub personal access token with `repo` scope.
    ```bash
    export GITHUB_TOKEN="your_github_personal_access_token"
    ```

### Usage

After restarting the Gemini CLI, you can use the new command. You can either use the direct command or a natural language prompt.

**Direct Command:**
```
/get-diff --project <your-gcp-project> --deployment <your-gke-deployment>
```

**Natural Language Prompt:**

You can ask Gemini in plain English, and it will automatically detect the intent and run the command.

**Example Prompts:**
> "Hey Gemini, help me view the changes for the image(s) that is recently deployed to my GKE Deployment named rec-app-deployment in my gcp project ishamirulinda-sdlc"

> "Show me the recent changes for my deployment rec-app-deployment in project ishamirulinda-sdlc"

> "Get the git diff for the GKE deployment rec-app-deployment in ishamirulinda-sdlc"

The CLI will automatically extract the `project` and `deployment` names from your sentence and execute the command.