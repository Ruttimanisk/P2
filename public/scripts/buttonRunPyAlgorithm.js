const { spawn } = require('child_process');

function runPythonAlgorithm() {
    const pyProg = spawn('python', ['../algorithm/schedule.py']);

    // errors
    pyProg.stderr.on('data', (stderr) => {
        console.log(`stderr: ${stderr}`);
    });

    pyProg.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

module.exports = { runpy: runPythonAlgorithm };