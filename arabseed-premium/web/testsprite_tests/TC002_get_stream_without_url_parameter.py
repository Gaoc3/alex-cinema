import requests

def test_get_stream_without_url_parameter():
    base_url = "http://localhost:3000/api/stream"
    try:
        response = requests.get(base_url, timeout=30)
        assert response.status_code == 502, f"Expected status code 502, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_get_stream_without_url_parameter()