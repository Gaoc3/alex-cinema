const str = `https://cndw6.shabakaty.com/vascin19-mp4/CDA20B52-ABAC-F9DC-B4E0-45F3B0C2B763_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22`;
const parsed = new URL(str);
console.log("Pathname:", parsed.pathname);
console.log("Ends with .mp4:", parsed.pathname.endsWith('.mp4'));
