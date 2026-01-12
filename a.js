// Auto git add, commit and push script
const { execSync } = require('child_process');

function runCommand(command) {
    try {
        console.log(`Running: ${command}`);
        const output = execSync(command, { 
            encoding: 'utf-8',
            stdio: 'pipe'
        });
        if (output) {
            console.log(output);
        }
        return true;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        return false;
    }
}

console.log('=== Auto Git Push ===\n');

// Git add
if (!runCommand('git add .')) {
    console.error('Failed to add files');
    process.exit(1);
}

// Git commit
if (!runCommand('git commit -m "update"')) {
    console.error('Failed to commit (maybe no changes?)');
    process.exit(1);
}

// Git push
if (!runCommand('git push')) {
    console.error('Failed to push');
    process.exit(1);
}

console.log('\n✓ Successfully pushed to GitHub!');
