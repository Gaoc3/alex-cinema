import requests

def test_get_proxy_without_endpoint_parameter():
    base_url = "http://localhost:3000/api/proxy"
    headers = {
        "Accept": "*/*"
    }
    try:
        response = requests.get(base_url, headers=headers, timeout=30)
        assert response.status_code == 400, f"Expected status code 400, got {response.status_code}"
        # The response content could be error message or fallback image, ensure not empty
        assert response.content, "Response content is empty"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_proxy_without_endpoint_parameter()