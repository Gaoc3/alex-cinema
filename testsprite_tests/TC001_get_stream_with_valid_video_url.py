import requests

def test_get_stream_with_valid_video_url():
    base_url = "http://localhost:3000"
    video_url = "https://cdn.shabakaty.com/video.mp4"
    endpoint = f"{base_url}/api/stream"
    params = {"url": video_url}
    timeout = 30

    try:
        response = requests.get(endpoint, params=params, timeout=timeout)
        response.raise_for_status()
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        assert "video" in content_type, f"Expected 'video' in Content-Type header, got '{content_type}'"
        assert response.content, "Response content is empty, expected video stream content"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_get_stream_with_valid_video_url()