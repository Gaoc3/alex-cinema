import requests

def test_get_proxy_with_invalid_image_endpoint():
    base_url = "http://localhost:3000"
    endpoint_url = "/api/proxy"
    invalid_image_url = "http://invalid-url-for-testing-image-proxy"

    params = {"endpoint": invalid_image_url}
    try:
        response = requests.get(base_url + endpoint_url, params=params, timeout=30)
        assert response.status_code == 500, f"Expected status code 500, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed with an exception: {e}"

test_get_proxy_with_invalid_image_endpoint()