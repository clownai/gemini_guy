// main.js
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let mainWindow;
let pythonProcess;

function createWindow() {
     mainWindow = new BrowserWindow({
         width: 1200, // Wider to accommodate sidebar
         height: 800,
         webPreferences: {
             preload: path.join(__dirname, 'preload.js'),
             contextIsolation: true,
             nodeIntegration: false
         }
     });
     mainWindow.loadFile('index.html');
     // mainWindow.webContents.openDevTools(); // Uncomment for debugging

     mainWindow.on('closed', () => {
         mainWindow = null;
         if (pythonProcess) {
             console.log('Terminating Python process...');
             try { pythonProcess.kill(); } catch(e) { console.error("Error killing python:", e)}
             pythonProcess = null;
         }
     });
     startPythonBackend();

     // Request initial Git status after window loads
     mainWindow.webContents.once('did-finish-load', () => {
          if (mainWindow && mainWindow.webContents) { // Check if window still exists
              mainWindow.webContents.send('request-git-status-trigger'); // Tell renderer to ask main
          }
     });
 }

function startPythonBackend() {
     console.log('Starting Python backend: gemini_guy.py...');
     const scriptPath = path.join(__dirname, 'gemini_guy.py');
     // Use 'python3' if 'python' isn't linked correctly on the system
     pythonProcess = spawn('python', ['-u', scriptPath], {
         stdio: ['pipe', 'pipe', 'pipe'], // Ensure we can use stdin, stdout, stderr
         encoding: 'utf8', // Tell Node.js to decode streams as UTF-8
         env: {
             ...process.env, // Inherit existing environment variables
             PYTHONIOENCODING: 'utf-8' // Force Python's streams to UTF-8
         }
     });

     pythonProcess.stdout.on('data', (data) => {
         const message = data.toString('utf8');
         console.log(`Python stdout: ${message.trim()}`);
         if (mainWindow && mainWindow.webContents) {
             mainWindow.webContents.send('gemini-response', message);
         }
     });
     pythonProcess.stderr.on('data', (data) => {
         const errorMsg = data.toString('utf8');
         console.error(`Python stderr: ${errorMsg.trim()}`);
          if (mainWindow && mainWindow.webContents) {
             mainWindow.webContents.send('gemini-error', errorMsg);
         }
     });
     pythonProcess.on('close', (code) => {
         console.log(`Python process exited with code ${code}`);
         pythonProcess = null;
          if (mainWindow && mainWindow.webContents) {
             mainWindow.webContents.send('backend-stopped', `Python process exited with code ${code}`);
          }
     });
      pythonProcess.on('error', (err) => {
         console.error('Failed to start Python process:', err);
          if (mainWindow && mainWindow.webContents) {
             mainWindow.webContents.send('gemini-error', `Failed to start Python backend: ${err.message}`);
         }
     });
     // Log if stdin closes unexpectedly
     pythonProcess.stdin.on('error', (err) => {
          console.error('Python stdin error:', err);
     });
 }

// --- Application Menu Definition ---
const menuTemplate = [
    // { role: 'appMenu' } // On macOS, includes About, Services, Hide, Quit
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []), // Conditional macOS App menu
    {
        label: 'File',
        submenu: [
            process.platform === 'darwin' ? { role: 'close' } : { role: 'quit', label: 'Exit' } // Standard Quit/Close
        ]
    },
    {
        label: 'Edit', // Basic edit roles
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            ...(process.platform === 'darwin' ? [ // macOS specific edit items
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                    label: 'Speech',
                    submenu: [
                        { role: 'startSpeaking' },
                        { role: 'stopSpeaking' }
                    ]
                }
            ] : [ // Non-macOS edit items
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ])
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' }, // Important for debugging!
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        label: 'Window', // Basic window management
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' }, // macOS specific zoom, often fullscreen on Windows
            ...(process.platform === 'darwin' ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ] : [
                { role: 'close' } // Close on Windows/Linux
            ])
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More about Google AI',
                click: async () => {
                    await shell.openExternal('https://ai.google.dev/'); // Open external link
                }
            }
            // TODO: Add link to project repo later?
        ]
    }
];
// --------------------------------

app.whenReady().then(() => {
    createWindow(); // Create the window first

    // Build menu from template
    const menu = Menu.buildFromTemplate(menuTemplate);
    // Set it as the application menu
    Menu.setApplicationMenu(menu);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') {
         app.quit();
     }
 });

// --- IPC Communication ---
async function getGitStatus() { 
    let isRepo = true;
    let branch = 'N/A';
    let status = 'N/A';
    const repoPath = __dirname; // Execute git commands in the project root

    try {
        // Check if it's a repo first (more reliable than checking branch error)
        await exec('git rev-parse --is-inside-work-tree', { cwd: repoPath });
    } catch (e) {
        // If this command fails, it's likely not a git repo
        isRepo = false;
        console.log('Directory is not a Git repository.');
        return { isRepo: false, branch: '(No Repo)', status: '' };
    }

    // If it is a repo, proceed to get branch and status
    try {
        const { stdout: branchOut } = await exec('git branch --show-current', { cwd: repoPath });
        branch = branchOut.trim() || '(Detached HEAD)'; // Handle detached state
    } catch (e) {
        console.warn('Could not get Git branch:', e.message);
        branch = '(Error)';
    }
    try {
        const { stdout: statusOut } = await exec('git status --porcelain', { cwd: repoPath }); // --porcelain is better for scripting
        status = statusOut.trim() ? 'Modified' : 'Clean'; // Check if output is empty (clean) or not (modified)
    } catch (e) {
        console.warn('Could not get Git status:', e.message);
        status = '(Error)';
    }
    return { isRepo: true, branch, status };
}

ipcMain.on('save-context-snippet', (event, content) => {
    const memoryFilePath = path.join(__dirname, 'memory.md');
    console.log('Main: Saving context snippet...');
    // Append content with a separator
    const contentToAppend = `\n\n---\nContext saved at ${new Date().toISOString()}:\n${content}\n---\n`;
    fs.appendFile(memoryFilePath, contentToAppend, (err) => {
        let statusMsg;
        if (err) {
            console.error('Error saving context snippet:', err);
            statusMsg = `Error saving to memory.md: ${err.message}`;
        } else {
            console.log('Context snippet saved to memory.md');
            statusMsg = 'Context snippet saved!';
        }
         if (mainWindow && mainWindow.webContents) { // Send status back
             mainWindow.webContents.send('save-context-status', statusMsg);
         }
    });
});

ipcMain.on('request-git-status', async (event) => {
    console.log('Main: Requesting Git status...');
    const gitInfo = await getGitStatus(); // Call updated helper
    console.log('Main: Git Status Result:', gitInfo);
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('git-status-result', gitInfo); // Send full object
    }
});

ipcMain.on('initialize-git-repo', async (event) => {
    console.log('Main: Initializing Git repository...');
    const repoPath = __dirname;
    let success = false;
    let message = '';
    try {
        await exec('git init', { cwd: repoPath });
        success = true;
        message = 'Git repository initialized successfully!';
        console.log(message);
    } catch (e) {
        console.error('Error initializing Git repository:', e);
        message = `Error initializing Git: ${e.message}`;
    }
    // Send status back and trigger a refresh
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('git-init-status', { success, message });
        // Request a status update after attempting init
        const gitInfo = await getGitStatus();
        mainWindow.webContents.send('git-status-result', gitInfo);
    }
});

ipcMain.on('send-to-gemini', async (event, message) => {
    console.error(`[CRITICAL] Received from GUI: "${message}"`);
    const commandText = message.trim().toLowerCase();
    console.error(`[CRITICAL] Lowercase command text: "${commandText}"`);
    let handledLocally = false; // Flag to track if we handled the command here

    // Explicit logging for command detection
    console.error(`[CRITICAL] Checking for /write or /append: 
    Starts with /write: ${commandText.startsWith('/write ')}
    Starts with /append: ${commandText.startsWith('/append ')}`);

    // --- Check for /write or /append FIRST ---
    if (commandText.startsWith('/write ') || commandText.startsWith('/append ')) {
        console.error(`[CRITICAL] ENTERED /write or /append block`);
        console.error(`[CRITICAL] Original message: "${message}"`);
        
        handledLocally = true;
        const isAppend = commandText.startsWith('/append ');
        const command = isAppend ? '/append ' : '/write ';
        console.error(`[CRITICAL] Command determined: "${command}"`);

        // --- Corrected Parsing Logic ---
        const contentAfterCommand = message.trim().substring(command.length);
        console.error(`[CRITICAL] Content after command: "${contentAfterCommand}"`);
        const firstSpaceIndex = contentAfterCommand.indexOf(' ');
        console.error(`[CRITICAL] First space index: ${firstSpaceIndex}`);
        let requestedFilename = null;
        let promptForGeneration = null;

        if (firstSpaceIndex > 0) { // Ensure there is a space AND something before it
            requestedFilename = contentAfterCommand.substring(0, firstSpaceIndex).trim();
            promptForGeneration = contentAfterCommand.substring(firstSpaceIndex + 1).trim();
        } else {
            // If no space found after command, treat the whole thing as filename (and prompt will be null)
            // This will correctly trigger the usage error below if the prompt is missing
            requestedFilename = contentAfterCommand.trim(); // Or null if contentAfterCommand is empty
        }

        console.error(`[CRITICAL] Extracted filename: "${requestedFilename}"`);
        console.error(`[CRITICAL] Extracted prompt: "${promptForGeneration}"`);

        if (!requestedFilename || !promptForGeneration) {
            console.error(`[CRITICAL] Invalid command usage`);
            mainWindow?.webContents.send('gemini-error', `Error: Usage: ${command}<filename> <prompt to generate content>`);
            return;
        }

        // --- Security Check ---
        const safeFilename = path.normalize(requestedFilename).replace(/^(\.\.(\/|\\|$))+/, '');
        if (safeFilename !== requestedFilename || path.isAbsolute(safeFilename)) {
            console.error(`Security Warning: Attempted write to potentially unsafe path: ${requestedFilename}`);
            mainWindow?.webContents.send('gemini-error', `Error: Invalid or potentially unsafe file path: ${safeFilename}. Only relative paths within the project are allowed.`);
            return;
        }

        const fullPath = path.join(__dirname, safeFilename);
        console.error(`Processing ${command} for file: ${fullPath}`);
        mainWindow?.webContents.send('file-write-status', `⏳ Generating content for ${safeFilename}...`); // Inform user

        // --- Spawn generate_once.py ---
        let generatedContent = '';
        let generationError = '';
        const generateProcess = spawn('python', ['-u', path.join(__dirname, 'generate_once.py')], {
            encoding: 'utf8',
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        // Send prompt to the helper script's stdin
        try {
            generateProcess.stdin.write(promptForGeneration + '\n');
            generateProcess.stdin.end(); // Close stdin to signal end of input
        } catch (writeErr) {
            console.error("Error writing prompt to generate_once.py stdin:", writeErr);
            mainWindow?.webContents.send('file-write-status', `❌ Error starting generation for ${safeFilename}.`);
            return;
        }

        generateProcess.stdout.on('data', (data) => {
            generatedContent += data.toString();
        });
        generateProcess.stderr.on('data', (data) => {
            console.error(`generate_once.py stderr: ${data}`);
            generationError += data.toString(); // Capture errors from helper script
        });

        generateProcess.on('close', (code) => {
            console.error(`generate_once.py process exited with code ${code}`);
            if (code === 0 && !generationError) {
                // --- Write/Append File ---
                const fileAction = isAppend ? fs.promises.appendFile : fs.promises.writeFile;
                fileAction(fullPath, generatedContent, 'utf8')
                    .then(() => {
                        const actionVerb = isAppend ? 'appended to' : 'written to';
                        console.error(`Content successfully ${actionVerb} ${safeFilename}`);
                        mainWindow?.webContents.send('file-write-status', `✅ Content successfully ${actionVerb} ${safeFilename}`);
                        mainWindow?.webContents.send('request-git-status-trigger'); // Trigger Git status update in renderer
                    })
                    .catch(writeErr => {
                        console.error(`Error ${isAppend ? 'appending to' : 'writing to'} file ${safeFilename}:`, writeErr);
                        mainWindow?.webContents.send('file-write-status', `❌ Error saving to ${safeFilename}: ${writeErr.message}`);
                    });
            } else {
                console.error(`Generation failed for ${safeFilename}. Code: ${code}, Error Output: ${generationError}`);
                mainWindow?.webContents.send('file-write-status', `❌ Error generating content for ${safeFilename}. ${generationError || `Process exited with code ${code}`}`);
            }
        });
        generateProcess.on('error', (err) => {
            console.error('Failed to start generate_once.py process:', err);
            mainWindow?.webContents.send('file-write-status', `❌ Failed to start generation process for ${safeFilename}.`);
        });
        // --- End spawn generate_once.py ---
    } // End if startsWith /write or /append

    // --- Handle other commands or normal chat (Pass to gemini_guy.py) ---
    else if (!handledLocally) {
        if (pythonProcess && pythonProcess.stdin && !pythonProcess.stdin.destroyed) {
            try {
                pythonProcess.stdin.write(message + '\n');
                console.error('Sent message to main Python backend.');
            } catch (error) {
                console.error('Error writing message to Python stdin:', error);
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('gemini-error', `Error sending message: ${error.message}`);
                }
            }
        } else {
            console.error('Main Python process not running or stdin closed.');
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('gemini-error', 'Backend process is not running or input is closed.');
            }
        }
    } // End else (normal message)
}); // End of ipcMain.on('send-to-gemini', ...)

ipcMain.on('request-github-data', (event, repo) => {
     console.log(`Main: Received request for GitHub data for repo: ${repo}`);
     event.sender.send('gemini-error', `GitHub feature for '${repo}' not implemented yet.`);
 });

ipcMain.on('trigger-huggingface-task', (event, task) => {
    console.log(`Main: Received request for Hugging Face task:`, task);
    if (task?.type === 'search' && task?.query) {
        if (pythonProcess && pythonProcess.stdin && !pythonProcess.stdin.destroyed) {
            try {
                // Send the special command prefix + query to the Python backend
                const commandForPython = `HF_SEARCH:::${task.query}\n`;
                pythonProcess.stdin.write(commandForPython);
                console.log(`Sent HF search command for "${task.query}" to Python stdin.`);
                // Python will now print results directly to stdout,
                // which are already captured by the existing stdout listener
                // and sent back to renderer via 'gemini-response' channel.
            } catch (error) {
                console.error('Error writing HF search command to Python stdin:', error);
                mainWindow?.webContents.send('gemini-error', `Error triggering HF search: ${error.message}`);
            }
        } else {
             console.warn('Python process not running or stdin closed for HF search.');
             mainWindow?.webContents.send('gemini-error', 'Backend process is not running or input is closed.');
        }
    } else {
        console.warn('Invalid or unsupported Hugging Face task received:', task);
        mainWindow?.webContents.send('gemini-error', `Unsupported HF task: ${task?.type}`);
    }
});
