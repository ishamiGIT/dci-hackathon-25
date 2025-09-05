# DCI Hackathon Project Plan: Gemini Extension

This document summarizes the goal, architecture, and file structure for the `/show-diff` Gemini CLI extension.

## Project Vision (Revised)

The goal is to create a Gemini CLI extension that allows a developer to instantly view the code changes (`git diff`) for a recent deployment. The user will ask Gemini in natural language, and Gemini will use this extension to perform the lookup and show the result.

This approach is simpler and more powerful than the original plan. It eliminates the need for any mock APIs by querying the user's live Google Cloud Developer Connect Insights (DCI) logs directly.

## Core Workflow

1.  **User Request:** The user asks Gemini for a deployment diff, e.g., *"Show me the diff for the latest deployment of `dci-test-app` in project `my-gcp-project-123`."*

2.  **Gemini Executes Extension:** Gemini parses the request and executes the `/show-diff` slash command, passing the application name and project ID as arguments.
    ```bash
    gemini /show-diff dci-test-app my-gcp-project-123
    ```

3.  **Extension Logic:** The `gemini-show-diff` script runs on the user's machine and performs the following actions:
    a. **Query Google Cloud Logging:** It uses `gcloud logging read` to find the single most recent DCI deployment log for the specified application and project.
    b. **Parse Log Data:** It parses the JSON output from `gcloud` to extract the commit SHAs for the `currentDeployment` and `previousDeployment`, as well as the GitHub repository URL.
    c. **Fetch Diff:** It uses the `gh` CLI tool to fetch the diff between the two commits from the correct GitHub repository.
    d. **Output:** The script prints the formatted diff to standard output.

4.  **Gemini Displays Result:** Gemini captures the script's output and displays the code diff directly to the user in the chat.

## Proposed Project Structure (Revised)

The project is now a standard Gemini CLI extension.

```
dci-hackathon-25/
├── .gitignore
├── HACKATHON_PLAN.md         # This file
├── README.md
└── gemini-show-diff/         # The extension directory
    ├── config.toml           # The manifest file that defines the /show-diff command
    └── gemini-show-diff      # The executable script
```

## Testing

To test the extension during development, create a symbolic link from this project directory to the Gemini CLI extensions directory. This makes your script instantly available as a slash command.

Run the following command from the project root (`dci-hackathon-25/`):

```bash
ln -s "$(pwd)/gemini-show-diff" ~/.config/gemini-cli/extensions/
```

You can then test the command by typing `/show-diff` in the Gemini CLI.
