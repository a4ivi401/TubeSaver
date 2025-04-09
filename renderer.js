// Обновите функцию addFormatOption в renderer.js
function addFormatOption(parent, format) {
	let label = ''

	if (format.vcodec !== 'none' && format.acodec !== 'none') {
		label = `${format.resolution || format.formatNote || 'Unknown'} (${
			format.ext
		})`
	} else if (format.vcodec !== 'none') {
		label = `${
			format.resolution || format.formatNote || 'Unknown'
		} - только видео (${format.ext})`
	} else {
		label = `${format.formatNote || 'Unknown'} - только аудио (${format.ext})`
	}

	const option = document.createElement('option')
	option.value = JSON.stringify({
		formatId: format.formatId,
		ext: format.ext,
		filesize: format.filesize,
		qualityLabel: format.resolution || format.formatNote,
		hasVideo: format.vcodec !== 'none',
		hasAudio: format.acodec !== 'none',
	})
	option.textContent =
		label + (format.filesize ? ` - ${formatFileSize(format.filesize)}` : '')
	parent.appendChild(option)
}

// И обновите обработчик кнопки загрузки
downloadButton.addEventListener('click', () => {
	const url = videoUrlInput.value.trim()
	const path = outputPath.value
	const filename = filenameInput.value.trim()

	if (!url || !path || !filename || !selectedFormat) {
		showStatusMessage('Заполните все поля перед загрузкой', 'error')
		return
	}

	videoInfo.classList.add('hidden')
	downloadProgressContainer.classList.remove('hidden')

	ipcRenderer.send('download-video', {
		url,
		formatId: selectedFormat.formatId,
		outputPath: path,
		filename,
	})
})
