from flask import Flask, render_template, request, jsonify
import shabakaty_api

app = Flask(__name__)
api = shabakaty_api.CinemanaAPI()

@app.route('/')
def index():
    # Fetch categories and some videos
    categories = api.get_categories()
    videos = api.get_home_videos()
    return render_template('index.html', categories=categories, videos=videos)

@app.route('/watch/<video_id>')
def watch(video_id):
    info = api.get_video_details(video_id)
    return render_template('cinemana_original.html', video=info)

@app.route('/search')
def search():
    query = request.args.get('q', '')
    results = api.search(query)
    return render_template('search.html', query=query, results=results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
