# DCI Hackathon 2025 Project

This project contains a Gemini CLI extension that allows you to retrieve the git diff for a recently deployed image on a GKE (Google Kubernetes Engine) deployment.

## How the MCP Server Works

The MCP (Model Context Protocol) server is a Node.js application written in TypeScript. It uses the `@modelcontextprotocol/sdk` to create a server that exposes a `get-diff` tool. This tool can be called by the Gemini CLI.

The server is defined in `src/index.ts`. It initializes an `McpServer` and registers the `get-diff` tool. This tool takes a GCP `project` and `deployment` name as input. It then fetches the latest deployment logs from Google Cloud Logging, extracts the `gitDiffUri`, and uses the GitHub API to retrieve the git diff between the base and head commits.

The server also includes debug logging to a file (`debug.log`) to help with development and troubleshooting.

## How the Extension Works

The Gemini CLI extension is defined by the files in the `.gemini/extensions/dci` directory.

*   `gemini-extension.json`: This file defines the extension's name, version, and the MCP server it communicates with. It specifies that the `devops` server is started by running the compiled `dist/index.js` file.
*   `commands/get-diff.toml`: This file defines the `get-diff` command. It includes a `prompt` that helps Gemini understand natural language requests. It also defines the parameters (`project` and `deployment`) that are passed to the `get-diff` tool on the MCP server.

When you run a command like `/get-diff --project "my-project" --deployment "my-deployment"` or a natural language prompt like "show me the latest changes for my deployment", Gemini uses the information in these files to call the `get-diff` tool on the MCP server with the correct parameters.

### Prerequisites

1.  **Install Dependencies:** Before using the extension, you need to install its dependencies. Run the following command from the root of the project:
    ```bash
    npm install
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

## How to Make Changes to the Code

1.  **Modify the source code:** The server-side code is located in `src/index.ts`. You can make changes to this file to modify the behavior of the `get-diff` tool.
2.  **Compile the TypeScript:** After making changes, you need to compile the TypeScript code to JavaScript.
    ```bash
    npm run build
    ```
    This will create the `dist/index.js` file that is used by the MCP server.

## How to Update the Extension

After making changes to the extension's definition (the files in `.gemini/extensions/dci`), you may need to force the Gemini CLI to recognize the changes.

1.  **Remove the extension:**
    ```bash
    gemini extension remove dci
    ```
2.  **Add the extension back:**
    ```bash
    gemini extension add .gemini/extensions/dci
    ```
3.  **Restart the Gemini CLI:** For the changes to fully take effect, it's best to restart the CLI.
