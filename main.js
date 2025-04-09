const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const youtubeDl = require('youtube-dl-exec')
const os = require('os')

let mainWindow
const binPath = path.join(os.tmpdir(), 'yt-dlp')

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 900,
		height: 700,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
		},
		icon: path.join(__dirname, 'assets/icon.png'),
		titleBarStyle: 'hiddenInset',
		frame: false,
	})

	mainWindow.loadFile('index.html')
	mainWindow.on('closed', () => {
		mainWindow = null
	})
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
	if (mainWindow === null) createWindow()
})

// Обработка запросов на получение информации о видео
ipcMain.on('get-video-info', async (event, url) => {
	try {
		// Используем youtube-dl-exec для получения информации о видео
		const info = await youtubeDl(url, {
			dumpSingleJson: true,
			noCheckCertificates: true,
			noWarnings: true,
			preferFreeFormats: true,
			addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
			binPath,
		})

		// Форматируем данные для фронтенда
		const formats = info.formats.map(format => ({
			formatId: format.format_id,
			formatNote: format.format_note,
			ext: format.ext,
			resolution: format.resolution,
			fps: format.fps,
			filesize: format.filesize,
			tbr: format.tbr,
			vcodec: format.vcodec,
			acodec: format.acodec,
			width: format.width,
			height: format.height,
		}))

		const videoDetails = {
			title: info.title,
			author: info.uploader,
			thumbnailUrl: info.thumbnail,
			lengthSeconds: info.duration,
			formats: formats.filter(format => format.filesize),
		}

		event.reply('video-info-result', { success: true, videoDetails })
	} catch (error) {
		console.error('Error getting video info:', error)
		event.reply('video-info-result', { success: false, error: error.message })
	}
})

// Обработка запросов на выбор директории
ipcMain.on('select-directory', async event => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openDirectory'],
	})

	if (!result.canceled) {
		event.reply('directory-selected', result.filePaths[0])
	}
})

// Обработка запросов на скачивание видео
ipcMain.on(
	'download-video',
	async (event, { url, formatId, outputPath, filename }) => {
		try {
			if (!fs.existsSync(outputPath)) {
				fs.mkdirSync(outputPath, { recursive: true })
			}

			const sanitizedFilename = filename.replace(/[/\\?%*:|"<>]/g, '-')
			const fullPath = path.join(outputPath, sanitizedFilename)

			// Создаем процесс для скачивания
			const process = youtubeDl.exec(url, {
				format: formatId,
				output: `${fullPath}.%(ext)s`,
				noCheckCertificates: true,
				noWarnings: true,
				preferFreeFormats: true,
				addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
				progress: true,
				binPath,
			})

			// Отслеживаем прогресс скачивания
			if (process.stdout) {
				let lastPercent = 0
				let downloadedBytes = 0
				let totalBytes = 0

				process.stdout.on('data', data => {
					const progressMatch = data.toString().match(/(\d+\.\d+)%/)
					const sizeMatch = data
						.toString()
						.match(/(\d+\.\d+)(Ki|Mi|Gi)B\s+of\s+(\d+\.\d+)(Ki|Mi|Gi)B/)

					if (progressMatch) {
						const percentage = parseFloat(progressMatch[1])
						if (percentage > lastPercent) {
							lastPercent = percentage
							event.reply('download-progress', {
								percentage,
								downloadedBytes,
								totalBytes,
							})
						}
					}

					if (sizeMatch) {
						const currentSize = parseFloat(sizeMatch[1])
						const currentUnit = sizeMatch[2].toLowerCase()
						const totalSize = parseFloat(sizeMatch[3])
						const totalUnit = sizeMatch[4].toLowerCase()

						// Конвертируем в байты
						const units = { ki: 1024, mi: 1024 * 1024, gi: 1024 * 1024 * 1024 }
						downloadedBytes = currentSize * units[currentUnit]
						totalBytes = totalSize * units[totalUnit]
					}
				})
			}

			// Ждем завершения скачивания
			const output = await process

			// Находим скачанный файл
			const finalPath = output.stdout.match(
				/\[download\] (.+) has already been downloaded/
			)
			const downloadedPath = finalPath
				? finalPath[1]
				: `${fullPath}.${formatId.split('+')[0]}`

			event.reply('download-complete', {
				success: true,
				filePath: downloadedPath,
			})
		} catch (error) {
			console.error('Error downloading video:', error)
			event.reply('download-complete', { success: false, error: error.message })
		}
	}
)

// Обработка запросов на закрытие, минимизацию и максимизацию окна
ipcMain.on('window-control', (event, action) => {
	switch (action) {
		case 'minimize':
			mainWindow.minimize()
			break
		case 'maximize':
			if (mainWindow.isMaximized()) {
				mainWindow.unmaximize()
			} else {
				mainWindow.maximize()
			}
			break
		case 'close':
			mainWindow.close()
			break
	}
})

// Загрузка youtube-dl при старте приложения
app.whenReady().then(async () => {
	try {
		await youtubeDl.downloadFromGithub(binPath)
		console.log('yt-dlp downloaded successfully')
	} catch (error) {
		console.error('Failed to download yt-dlp:', error)
		dialog.showErrorBox(
			'Error',
			'Failed to download yt-dlp. Please check your internet connection and try again.'
		)
		app.quit()
	}
})
