from flask import Flask, render_template, request, send_file
import yt_dlp
import os

app = Flask(__name__)

@app.route('/')
def index():
  return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
  url = request.form['url']
  quality = request.form['quality']

  ydl_opts = {
    'format': quality,
    'outtmpl': 'download/%(title)s.%(ext)s',
    'postprocessors': [{
      'key': 'FFmpegVideoConvertor',
      'preferedformat': 'mp4'
    }],
  }

  with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info_dict = ydl.extract_info(url, download=True)
    filename = ydl.prepare_filename(info_dict)

  return send_file(filename, as_attachment=True)

if __name__ == '__main__':
  app.run(debug=True)