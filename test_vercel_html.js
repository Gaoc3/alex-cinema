async function test() {
  try {
    const res = await fetch('https://alex-cinema.vercel.app/api/video/3087929');
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text.slice(0, 1000));
  } catch (e) {
    console.error(e);
  }
}
test();
