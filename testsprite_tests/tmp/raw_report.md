
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** web
- **Date:** 2026-06-11
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get stream with valid video url
- **Test Code:** [TC001_get_stream_with_valid_video_url.py](./TC001_get_stream_with_valid_video_url.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 12, in test_get_stream_with_valid_video_url
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 503 Server Error: Service Unavailable for url: http://localhost:3000/api/stream?url=https%3A%2F%2Fcdn.shabakaty.com%2Fvideo.mp4

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 20, in <module>
  File "<string>", line 18, in test_get_stream_with_valid_video_url
AssertionError: Request failed with exception: 503 Server Error: Service Unavailable for url: http://localhost:3000/api/stream?url=https%3A%2F%2Fcdn.shabakaty.com%2Fvideo.mp4

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/295322cf-05b8-4be4-9e11-e15407453a61/c42f732a-1672-4db2-8fcf-4509c239dff7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 get stream without url parameter
- **Test Code:** [TC002_get_stream_without_url_parameter.py](./TC002_get_stream_without_url_parameter.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 11, in <module>
  File "<string>", line 7, in test_get_stream_without_url_parameter
AssertionError: Expected status code 502, got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/295322cf-05b8-4be4-9e11-e15407453a61/84ad9667-4911-4e3f-a1ca-195d0607dfad
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 get stream with invalid video url
- **Test Code:** [TC003_get_stream_with_invalid_video_url.py](./TC003_get_stream_with_invalid_video_url.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/295322cf-05b8-4be4-9e11-e15407453a61/16147192-b8e2-4037-b657-db16df8e805a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 get proxy with valid image endpoint
- **Test Code:** [TC004_get_proxy_with_valid_image_endpoint.py](./TC004_get_proxy_with_valid_image_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 21, in <module>
  File "<string>", line 13, in test_get_proxy_with_valid_image_endpoint
AssertionError: Expected status code 200 but got 503

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/295322cf-05b8-4be4-9e11-e15407453a61/a7298940-c425-4403-8324-2f6c88e6edb8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 get proxy without endpoint parameter
- **Test Code:** [TC005_get_proxy_without_endpoint_parameter.py](./TC005_get_proxy_without_endpoint_parameter.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/295322cf-05b8-4be4-9e11-e15407453a61/8a44a535-0c25-4751-bc7f-feb22666aeea
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 get proxy with invalid image endpoint
- **Test Code:** [TC006_get_proxy_with_invalid_image_endpoint.py](./TC006_get_proxy_with_invalid_image_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 15, in <module>
  File "<string>", line 11, in test_get_proxy_with_invalid_image_endpoint
AssertionError: Expected status code 500, got 502

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/295322cf-05b8-4be4-9e11-e15407453a61/4d532d91-fa56-4b1c-8df6-3a401a545209
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **33.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---