const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')
const fetch = require('node-fetch')

// Устанавливаем путь к ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath)

let mainWindow

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		backgroundColor: '#2e2c29',
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js'),
		},
		icon: path.join(__dirname, 'assets/icon.png'),
	})

	mainWindow.loadFile('index.html')
	// Раскомментируйте следующую строку для открытия DevTools
	// mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
	createWindow()

	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit()
})

// Обработка IPC сообщений от рендерера
ipcMain.handle('get-video-info', async (event, url) => {
	try {
		const info = await ytdl.getInfo(url)
		return {
			title: info.videoDetails.title,
			thumbnail:
				info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]
					.url,
			duration: info.videoDetails.lengthSeconds,
			formats: info.formats
				.filter(format => format.container)
				.map(format => ({
					itag: format.itag,
					quality: format.qualityLabel || format.quality,
					container: format.container,
					hasAudio: format.hasAudio,
					hasVideo: format.hasVideo,
					contentLength: format.contentLength,
				})),
		}
	} catch (error) {
		console.error('Error getting video info:', error)
		throw error
	}
})

ipcMain.handle('select-download-path', async (event, filename) => {
	const result = await dialog.showSaveDialog({
		title: 'Сохранить видео',
		defaultPath: path.join(
			app.getPath('downloads'),
			sanitizeFilename(filename)
		),
		filters: [
			{ name: 'Видео', extensions: ['mp4', 'webm'] },
			{ name: 'Все файлы', extensions: ['*'] },
		],
	})

	return result.canceled ? null : result.filePath
})

ipcMain.handle('download-video', async (event, { url, itag, outputPath }) => {
	try {
		return new Promise((resolve, reject) => {
			const video = ytdl(url, { quality: itag })
			let downloadedBytes = 0
			let totalBytes = 0

			video.on('progress', (_, downloaded, total) => {
				downloadedBytes = downloaded
				totalBytes = total
				mainWindow.webContents.send('download-progress', { downloaded, total })
			})

			video
				.pipe(fs.createWriteStream(outputPath))
				.on('finish', () => {
					resolve({ success: true, path: outputPath })
				})
				.on('error', err => {
					reject(err)
				})
		})
	} catch (error) {
		console.error('Error downloading video:', error)
		throw error
	}
})

// Вспомогательная функция для очистки имени файла от недопустимых символов
function sanitizeFilename(filename) {
	return filename.replace(/[/\\?%*:|"<>]/g, '-')
}
