const { spawn } = require('child_process');
const path = require('path');

function runPythonAlgorithm(arg) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../algorithm/schedule_with_db.py');
        const pyProg = spawn('/usr/bin/python3', [scriptPath, arg]);

        let stdoutData = '';
        let stderrData = '';

        pyProg.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pyProg.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pyProg.on('close', (code) => {
            if (code === 0) {
                resolve({ code, stdout: stdoutData });
            } else {
                reject({ code, stderr: stderrData });
            }
        });
    });
}

module.exports = { runpy: runPythonAlgorithm };
