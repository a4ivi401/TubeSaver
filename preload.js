const { contextBridge, ipcRenderer } = require('electron')

// Экспортируем API безопасно в глобальный window объект
contextBridge.exposeInMainWorld('tubeSaver', {
	getVideoInfo: url => ipcRenderer.invoke('get-video-info', url),
	selectDownloadPath: filename =>
		ipcRenderer.invoke('select-download-path', filename),
	downloadVideo: data => ipcRenderer.invoke('download-video', data),
	onProgressUpdate: callback => {
		ipcRenderer.on('download-progress', (event, progress) => callback(progress))
	},
	removeProgressListener: () => {
		ipcRenderer.removeAllListeners('download-progress')
	},
})
