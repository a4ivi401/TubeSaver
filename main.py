import tkinter as tk
from tkinter import filedialog
from tkinter import ttk
from PIL import ImageTk, Image
import yt_dlp
import requests

def download_video():
    video_url = entry.get()
    save_path = filedialog.askdirectory()
    quality = quality_combobox.get()
    
    ydl_opts = {
        'outtmpl': save_path + '/%(title)s.%(ext)s',
        'progress_hooks': [progress_hook],
        'format': quality
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])


def progress_hook(d):
    if d['status'] == 'downloading':
        progress = float(d['_percent_str'].strip('\x1b[0;94m\x1b[0m').strip('%'))
        progress_bar['value'] = progress
        progress_label.config(text=f"Progress: {progress}%")
        root.update_idletasks()


root = tk.Tk()
root.title("YouTube Video Downloader")

label = tk.Label(root, text="Enter YouTube URL:")
label.pack(padx=20)

entry = tk.Entry(root, width=50)
entry.pack()

download_button = tk.Button(root, text="Download", command=download_video)
download_button.pack()

quality_combobox = ttk.Combobox(root, values=["best", "worst"])  # Добавьте нужные варианты качества
quality_combobox.pack()
quality_combobox.set("best")

save_path_label = tk.Label(root, text="Save Path: ")
save_path_label.pack()

progress_frame = ttk.Frame(root)
progress_frame.pack()

progress_bar = ttk.Progressbar(progress_frame, orient=tk.HORIZONTAL, length=450, mode='determinate')
progress_bar.pack()

progress_label = tk.Label(progress_frame, text="")
progress_label.pack()

preview_label = tk.Label(root)
preview_label.pack()

root.mainloop()
