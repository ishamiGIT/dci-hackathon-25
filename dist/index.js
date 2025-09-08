import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Logging } from '@google-cloud/logging';
import axios from 'axios';
import fs from 'fs';
// --- Debug Logging to File ---
const logFile = '/usr/local/google/home/ishamirulinda/dci-hackathon-25/debug.log';
const logToFile = (message) => {
    // Clear the log file on first write if it exists, otherwise append
    if (fs.existsSync(logFile) && !global.hasOwnProperty('logCleared')) {
        fs.unlinkSync(logFile);
        global['logCleared'] = true;
    }
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
};
logToFile("---" + " Server Process Started ---");
// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
    logToFile(`FATAL: Uncaught Exception at: ${origin}, error: ${err.stack || err}`);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logToFile(`FATAL: Unhandled Rejection at: ${promise}, reason: ${reason instanceof Error ? reason.stack : reason}`);
    process.exit(1);
});
// TODO: Replace with your actual GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// Function to get the git diff from GitHub
async function getGitDiff(repoUrl, base, head) {
    logToFile(`Fetching git diff for ${repoUrl} from ${base} to ${head}`);
    const url = `https://api.github.com/repos/${repoUrl}/compare/${base}...${head}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.diff'
            }
        });
        logToFile("Successfully fetched git diff from GitHub.");
        return response.data;
    }
    catch (error) {
        logToFile(`Error fetching git diff: ${error instanceof Error ? error.stack : String(error)}`);
        return null;
    }
}
// Function to get the git diff URI from the latest deployment log
async function getGitDiffUriFromLogs(projectId, deploymentName) {
    logToFile(`Fetching logs for project '${projectId}' and deployment '${deploymentName}'`);
    const logging = new Logging({ projectId });
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    const logName = "developerconnect.googleapis.com%2Fsdlc_deployment";
    const filter = `logName="projects/${projectId}/logs/${logName}" AND timestamp >= "${twelveHoursAgo.toISOString()}"`;
    try {
        const [entries] = await logging.getEntries({
            filter: filter,
            orderBy: 'timestamp desc',
            pageSize: 1
        });
        if (entries.length > 0) {
            logToFile("Found recent deployment logs.");
            const logEntry = entries[0];
            let gitDiffUri = null;
            const payload = logEntry.data;
            if (payload && typeof payload === 'object') {
                if ('fields' in payload) {
                    const artifactDetails = payload.fields.currentDeployment?.structValue?.fields?.artifactDetails?.listValue?.values;
                    if (artifactDetails && Array.isArray(artifactDetails)) {
                        for (const detail of artifactDetails) {
                            const uri = detail.structValue?.fields?.gitDiffUri?.stringValue;
                            if (uri) {
                                gitDiffUri = uri;
                                break;
                            }
                        }
                    }
                }
                else if ('currentDeployment' in payload) {
                    const artifactDetails = payload.currentDeployment.artifactDetails;
                    if (artifactDetails && Array.isArray(artifactDetails)) {
                        for (const detail of artifactDetails) {
                            if (detail.gitDiffUri) {
                                gitDiffUri = detail.gitDiffUri;
                                break;
                            }
                        }
                    }
                }
            }
            if (gitDiffUri) {
                logToFile(`Found gitDiffUri: ${gitDiffUri}`);
                return gitDiffUri;
            }
            else {
                logToFile("Could not find gitDiffUri in the log entry payload.");
                return null;
            }
        }
        else {
            logToFile("No recent deployment logs found.");
            return null;
        }
    }
    catch (error) {
        logToFile(`Error fetching or parsing logs: ${error instanceof Error ? error.stack : String(error)}`);
        return null;
    }
}
// Create an MCP server
const server = new McpServer({
    name: "git-diff-server",
    version: "1.0.0"
});
logToFile("MCP Server created.");
// Register the get-diff tool
server.registerTool("get-diff", {
    title: "Get Git Diff",
    description: "Fetches the git diff from the latest deployment for a given GCP project and deployment name.",
    inputSchema: { project: z.string(), deployment: z.string() }
}, async ({ project, deployment }) => {
    logToFile(`Tool 'get-diff' started with project: ${project}, deployment: ${deployment}`);
    if (!GITHUB_TOKEN) {
        const errorMsg = 'Error: GITHUB_TOKEN environment variable not set.';
        logToFile(errorMsg);
        return { content: [{ type: "text", text: errorMsg }] };
    }
    logToFile('GITHUB_TOKEN is set.');
    const gitDiffUri = await getGitDiffUriFromLogs(project, deployment);
    if (gitDiffUri) {
        const match = gitDiffUri.match(/github\.com\/(.*)\/compare\/(.*)\.\.(.*)/);
        if (match) {
            const repoUrl = match[1];
            const baseCommit = match[2];
            const headCommit = match[3];
            logToFile(`Parsed URI. Repo: ${repoUrl}, Base: ${baseCommit}, Head: ${headCommit}`);
            const diff = await getGitDiff(repoUrl, baseCommit, headCommit);
            if (diff) {
                logToFile("Diff successfully retrieved. Returning content.");
                return { content: [{ type: "text", text: diff }] };
            }
            else {
                const errorMsg = `Failed to fetch diff for ${repoUrl}`;
                logToFile(errorMsg);
                return { content: [{ type: "text", text: errorMsg }] };
            }
        }
        else {
            const errorMsg = `Could not parse the gitDiffUri: ${gitDiffUri}`;
            logToFile(errorMsg);
            return { content: [{ type: "text", text: errorMsg }] };
        }
    }
    else {
        const errorMsg = 'Could not find gitDiffUri from logs.';
        logToFile(errorMsg);
        return { content: [{ type: "text", text: errorMsg }] };
    }
});
logToFile("Tool 'get-diff' registered.");
async function startServer() {
    logToFile("Connecting server to transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logToFile("Server connection established. Waiting for messages.");
}
logToFile("Attempting to start server...");
try {
    startServer();
    logToFile("startServer() called successfully.");
}
catch (error) {
    const errorMessage = error instanceof Error ? error.stack : String(error);
    logToFile(`FATAL: Error during server startup: ${errorMessage}`);
    process.exit(1);
}
