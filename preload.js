// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded.');

contextBridge.exposeInMainWorld('electronAPI', {
    // Gemini Chat
    sendToGemini: (message) => ipcRenderer.send('send-to-gemini', message),
    onGeminiResponse: (callback) => {
        ipcRenderer.removeAllListeners('gemini-response');
        ipcRenderer.on('gemini-response', (_event, value) => callback(value));
    },
    onGeminiError: (callback) => {
        ipcRenderer.removeAllListeners('gemini-error');
        ipcRenderer.on('gemini-error', (_event, value) => callback(value));
    },
    onBackendStopped: (callback) => {
        ipcRenderer.removeAllListeners('backend-stopped');
        ipcRenderer.on('backend-stopped', (_event, value) => callback(value));
    },
    // Git status methods
    requestGitStatus: () => ipcRenderer.send('request-git-status'),
    onGitStatusResult: (callback) => {
        ipcRenderer.removeAllListeners('git-status-result');
        ipcRenderer.on('git-status-result', (_event, value) => callback(value));
    },
    // Git initialization methods
    initializeGitRepo: () => ipcRenderer.send('initialize-git-repo'),
    onGitInitStatus: (callback) => {
        ipcRenderer.removeAllListeners('git-init-status');
        ipcRenderer.on('git-init-status', (_event, value) => callback(value));
    },
    // File Write Status Listener
    onFileWriteStatus: (callback) => {
        ipcRenderer.removeAllListeners('file-write-status');
        ipcRenderer.on('file-write-status', (_event, value) => callback(value));
    },
});
