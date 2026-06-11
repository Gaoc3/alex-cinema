import requests

def test_get_proxy_with_valid_image_endpoint():
    base_url = "http://localhost:3000"
    valid_image_url = "https://cdn.shabakaty.com/poster.jpg"
    params = {"endpoint": valid_image_url}
    timeout = 30

    response = None
    try:
        response = requests.get(f"{base_url}/api/proxy", params=params, timeout=timeout)
        # Assert status code 200 OK
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        # Assert response content is bytes and not empty
        content = response.content
        assert isinstance(content, bytes), "Response content is not bytes"
        assert len(content) > 0, "Response content is empty"
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_get_proxy_with_valid_image_endpoint()