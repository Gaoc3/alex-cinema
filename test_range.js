const url = "http://localhost:3000/api/stream?ref=ZtfXgC6Uyx2KkqvNW-JkVnt1Pr5TGKGhofZ6ZrddPUJWpdA1CXeAjghnpD4jyQFRNTq6xHfJiV1Eezo6Bui9trVSTYXgSvyZVXFM60HkHKu9Syb3sdpKWBfYXfPEBqz3XM_eCc8ZpUG9SqzQy_bQIP4l58OlvKOc49lZOZ4qA422hUIBP636OET9NnHQnfCpKRaVyFZBU5h2IyxKloxLtvwSOLy7lb7godfFRAuferrMvkiqPiD3wlW1gSa3g1G7iit6XyEz1M-sqedUOb2ebHMM8SE7XIWs2vHwjJU3248Yioj1bqxptQnkHfyrmD23rHOTkwfLYZnFtj2OLuM1sQ";

fetch(url, { headers: { 'Range': 'bytes=0-1000' } })
  .then(async res => {
    console.log("Status:", res.status);
    console.log("Headers:");
    res.headers.forEach((v, k) => console.log(k, ":", v));
    console.log("Body length:", (await res.arrayBuffer()).byteLength);
  })
  .catch(console.error);
