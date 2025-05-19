const { spawn } = require('child_process');
const path = require('path');

function runPythonAlgorithm() {
    const scriptPath = path.resolve(__dirname, '../algorithm/schedule_with_db.py');
    const pyProg = spawn('python', [scriptPath]);

    pyProg.stdout.on('data', (data) => {
        console.log(`stdout: ${data.toString()}`);
    });

    pyProg.stderr.on('data', (stderr) => {
        console.log(`stderr: ${stderr}`);
    });

    pyProg.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

module.exports = { runpy: runPythonAlgorithm };