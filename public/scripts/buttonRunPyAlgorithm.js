const { spawn } = require('child_process');
const path = require('path');

function runPythonAlgorithm(arg) {
    const scriptPath = path.resolve(__dirname, '../algorithm/schedule_with_db.py');
    const pyProg = spawn('/usr/bin/python3', [scriptPath, arg]);

    pyProg.stdout.on('data', (data) => {
        console.log(`stdout: ${data.toString()}`);
    });

    pyProg.stderr.on('data', (stderr) => {
        console.error(`stderr: ${stderr.toString()}`);
    });

    pyProg.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

module.exports = { runpy: runPythonAlgorithm };