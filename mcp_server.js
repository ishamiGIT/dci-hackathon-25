const { Logging } = require('@google-cloud/logging');
const axios = require('axios');
const yargs = require('yargs');

// TODO: Replace with your actual GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Function to get the git diff from GitHub
async function getGitDiff(repoUrl, base, head) {
    const url = `https://api.github.com/repos/${repoUrl}/compare/${base}...${head}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.diff'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching git diff:', error);
        return null;
    }
}

// Function to get the git diff URI from the latest deployment log
async function getGitDiffUriFromLogs(projectId, deploymentName) {
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
            const logEntry = entries[0];
            let gitDiffUri = null;
            const payload = logEntry.data; // JSON payload is in the 'data' property

            if (payload && typeof payload === 'object') {
                // Handle the structure with a top-level "fields" property
                if (payload.fields) {
                    const artifactDetails = payload.fields.currentDeployment?.structValue?.fields?.artifactDetails?.listValue?.values;
                    if (artifactDetails && Array.isArray(artifactDetails)) {
                        for (const detail of artifactDetails) {
                            // Safely access gitDiffUri using optional chaining
                            const uri = detail.structValue?.fields?.gitDiffUri?.stringValue;
                            if (uri) {
                                gitDiffUri = uri;
                                break; // Found it
                            }
                        }
                    }
                } else if (payload.currentDeployment) {
                    // Handle the structure like the example provided (no top-level "fields")
                    const artifactDetails = payload.currentDeployment.artifactDetails;
                    if (artifactDetails && Array.isArray(artifactDetails)) {
                        for (const detail of artifactDetails) {
                            if (detail.gitDiffUri) {
                                gitDiffUri = detail.gitDiffUri;
                                break; // Found it
                            }
                        }
                    }
                }
            } else {
                console.error('Log entry payload (entry.data) is not a valid object.');
            }

            if (gitDiffUri) {
                return gitDiffUri;
            }

            console.error('Could not find gitDiffUri in the log entry.');
            // Optional: Log the entry for debugging if gitDiffUri is not found
            // console.log('Received log entry:', JSON.stringify(logEntry, null, 2));
            return null;

        } else {
            console.log('No recent deployment logs found.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching or parsing logs:', error);
        return null;
    }

}


async function main() {
    const argv = yargs
        .option('project', {
            alias: 'p',
            description: 'GCP Project ID',
            demandOption: true,
            type: 'string'
        })
        .option('deployment', {
            alias: 'd',
            description: 'GKE Deployment Name',
            demandOption: true,
            type: 'string'
        })
        .help()
        .alias('help', 'h')
        .argv;

    const gitDiffUri = await getGitDiffUriFromLogs(argv.project, argv.deployment);

    if (gitDiffUri) {
        // Example URI: https://github.com/sdlc-graph/sdlc-test-project/compare/9e0f99dd6a59...64abb9d3f18c
        const match = gitDiffUri.match(/github\.com\/(.*)\/compare\/(.*)\.\.(.*)/);

        if (match) {
            const repoUrl = match[1];
            const baseCommit = match[2];
            const headCommit = match[3];

            console.log(`Fetching diff for ${repoUrl} from ${baseCommit} to ${headCommit}`);
            const diff = await getGitDiff(repoUrl, baseCommit, headCommit);

            if (diff) {
                console.log(diff);
            }
        } else {
            console.error('Could not parse the gitDiffUri:', gitDiffUri);
        }
    }
}

main();
