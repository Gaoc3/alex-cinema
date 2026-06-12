const text = '{"videoUrl":"https:\\/\\/cdn.shabakaty.com\\/vascin24-mp4\\/test.mp4"}';
const result = text.replace(/https?:\/\/(cdn|cnth[0-9]+|cndw[0-9]+|cinemana)\.shabakaty\.com([^"'\s]*)/g, 'REPLACED');
console.log(result);
