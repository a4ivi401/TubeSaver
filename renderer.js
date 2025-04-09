// renderer.js - Скрипт для взаимодействия с UI

document.addEventListener('DOMContentLoaded', () => {
	// Элементы UI
	const urlInput = document.getElementById('url-input')
	const fetchBtn = document.getElementById('fetch-btn')
	const loadingEl = document.getElementById('loading')
	const errorMessageEl = document.getElementById('error-message')
	const videoInfoEl = document.getElementById('video-info')
	const thumbnailEl = document.getElementById('thumbnail')
	const videoTitleEl = document.getElementById('video-title')
	const videoDurationEl = document.getElementById('video-duration')
	const formatsListEl = document.getElementById('formats-list')
	const downloadProgressEl = document.getElementById('download-progress')
	const progressBarEl = document.getElementById('progress-bar')
	const progressPercentageEl = document.getElementById('progress-percentage')
	const progressSizeEl = document.getElementById('progress-size')
	const downloadCompleteEl = document.getElementById('download-complete')
	const downloadPathEl = document.getElementById('download-path')
	const newDownloadBtn = document.getElementById('new-download-btn')

	// Текущие данные
	let currentVideoInfo = null
	let selectedFormat = null

	// Событие нажатия кнопки "Найти"
	fetchBtn.addEventListener('click', async () => {
		const url = urlInput.value.trim()
		if (!isValidYoutubeUrl(url)) {
			showError('Пожалуйста, введите корректную ссылку на YouTube видео')
			return
		}

		resetUI()
		showLoading(true)

		try {
			currentVideoInfo = await window.tubeSaver.getVideoInfo(url)
			displayVideoInfo(currentVideoInfo)
			showLoading(false)
			showVideoInfo(true)
		} catch (error) {
			console.error('Error fetching video info:', error)
			showLoading(false)
			showError(
				'Не удалось получить информацию о видео. Проверьте ссылку и попробуйте снова.'
			)
		}
	})

	// Также можно искать видео по нажатию Enter
	urlInput.addEventListener('keypress', event => {
		if (event.key === 'Enter') {
			fetchBtn.click()
		}
	})

	// Событие нажатия на кнопку "Скачать другое видео"
	newDownloadBtn.addEventListener('click', () => {
		resetUI()
		urlInput.value = ''
		urlInput.focus()
	})

	// Отображение информации о видео
	function displayVideoInfo(info) {
		// Установка превью и заголовка
		thumbnailEl.src = info.thumbnail
		videoTitleEl.textContent = info.title

		// Форматирование длительности видео
		const minutes = Math.floor(info.duration / 60)
		const seconds = info.duration % 60
		videoDurationEl.textContent = `${minutes}:${seconds
			.toString()
			.padStart(2, '0')}`

		// Очистка и заполнение списка форматов
		formatsListEl.innerHTML = ''

		// Фильтрация и группировка форматов для лучшего отображения
		const videoFormats = info.formats.filter(
			format =>
				format.hasVideo &&
				format.hasAudio &&
				['mp4', 'webm'].includes(format.container)
		)

		// Если есть доступные форматы
		if (videoFormats.length > 0) {
			videoFormats.forEach(format => {
				const formatCard = document.createElement('div')
				formatCard.className = 'format-card'
				formatCard.dataset.itag = format.itag

				const size = format.contentLength
					? formatSize(parseInt(format.contentLength))
					: 'Размер неизвестен'

				formatCard.innerHTML = `
          <div class="format-quality">${
						format.quality || 'Стандартное качество'
					}</div>
          <div class="format-details">
            <div>Формат: ${format.container.toUpperCase()}</div>
            <div>Размер: ${size}</div>
          </div>
        `

				formatCard.addEventListener('click', () => {
					// Снять выделение с предыдущей карточки
					document.querySelectorAll('.format-card.selected').forEach(card => {
						card.classList.remove('selected')
					})

					// Выделить текущую карточку
					formatCard.classList.add('selected')
					selectedFormat = format

					// Если кнопки скачивания еще нет, добавить её
					if (!document.querySelector('.download-button')) {
						const downloadBtn = document.createElement('button')
						downloadBtn.className = 'download-button'
						downloadBtn.innerHTML =
							'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Скачать'
						downloadBtn.addEventListener('click', startDownload)
						formatsListEl.after(downloadBtn)
					}
				})

				formatsListEl.appendChild(formatCard)
			})
		} else {
			formatsListEl.innerHTML =
				'<p>Доступные форматы не найдены. Попробуйте другое видео.</p>'
		}
	}

	// Начать скачивание видео
	async function startDownload() {
		if (!selectedFormat) {
			alert('Пожалуйста, выберите формат для скачивания.')
			return
		}

		// Генерируем имя файла из заголовка видео
		const fileExtension = selectedFormat.container
		const suggestedFilename = `${sanitizeFilename(
			currentVideoInfo.title
		)}.${fileExtension}`

		// Показываем диалоговое окно выбора пути сохранения
		const savePath = await window.tubeSaver.selectDownloadPath(
			suggestedFilename
		)

		if (!savePath) {
			// Пользователь отменил выбор пути
			return
		}

		showVideoInfo(false)
		showDownloadProgress(true)

		// Настраиваем обработчик обновления прогресса
		window.tubeSaver.onProgressUpdate(progress => {
			const percent =
				Math.floor((progress.downloaded / progress.total) * 100) || 0
			progressBarEl.style.width = `${percent}%`
			progressPercentageEl.textContent = `${percent}%`
			progressSizeEl.textContent = `${formatSize(
				progress.downloaded
			)} / ${formatSize(progress.total)}`
		})

		try {
			// Запускаем скачивание
			const result = await window.tubeSaver.downloadVideo({
				url: urlInput.value.trim(),
				itag: selectedFormat.itag,
				outputPath: savePath,
			})

			showDownloadProgress(false)

			if (result.success) {
				downloadPathEl.textContent = result.path
				showDownloadComplete(true)
			}
		} catch (error) {
			showDownloadProgress(false)
			showError('Ошибка при скачивании видео. Пожалуйста, попробуйте еще раз.')
			console.error('Download error:', error)
		} finally {
			window.tubeSaver.removeProgressListener()
		}
	}

	// Вспомогательные функции
	function isValidYoutubeUrl(url) {
		const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/
		return regex.test(url)
	}

	function sanitizeFilename(name) {
		return name.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100)
	}

	function formatSize(bytes) {
		if (!bytes) return '0 Б'
		const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
		const i = Math.floor(Math.log(bytes) / Math.log(1024))
		return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
	}

	// Функции управления UI
	function resetUI() {
		showLoading(false)
		showError(false)
		showVideoInfo(false)
		showDownloadProgress(false)
		showDownloadComplete(false)
		selectedFormat = null
	}

	function showLoading(show) {
		loadingEl.classList.toggle('hidden', !show)
	}

	function showError(message) {
		if (typeof message === 'string') {
			errorMessageEl.querySelector('p').textContent = message
			errorMessageEl.classList.remove('hidden')
		} else {
			errorMessageEl.classList.toggle('hidden', !message)
		}
	}

	function showVideoInfo(show) {
		videoInfoEl.classList.toggle('hidden', !show)
	}

	function showDownloadProgress(show) {
		downloadProgressEl.classList.toggle('hidden', !show)
		if (show) {
			progressBarEl.style.width = '0%'
			progressPercentageEl.textContent = '0%'
			progressSizeEl.textContent = '0 Б / 0 Б'
		}
	}

	function showDownloadComplete(show) {
		downloadCompleteEl.classList.toggle('hidden', !show)
	}
})
