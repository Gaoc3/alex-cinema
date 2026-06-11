import requests

def test_get_stream_with_invalid_video_url():
    base_url = "http://localhost:3000"
    invalid_url = "invalid-url"

    try:
        response = requests.get(f"{base_url}/api/stream", params={"url": invalid_url}, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"
    else:
        assert response.status_code == 502, f"Expected status code 502, got {response.status_code}"

test_get_stream_with_invalid_video_url()