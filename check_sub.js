async function check() {
  try {
    const url = 'https://alex-cinema.vercel.app/api/stream?ref=kyvwSN0yNBIKPsOfGx5bSidN3reYUYD7p6QNCS0XAU7Nb_YuXE81t6wK904E1gVNUqDnVV606VLA7PRd6zzfx0GfHHrIZCis1de-S5bdLhlpy7CSqIBv5BfTfH7WCfPGMX-ZbHvtHgV4iv95bEAO3zM6xPPmbmXjFN-nugxnE1lxy8Jol01-PyiBPxcPMONm_dLFRKZS-2HxVlKNTJKB8BrJ7E-KW8ynX028np19YTUrb8yHm73uUJuD3hv_KPGgxbWRo8uVucwZtMm4bqa750X4XZ-ara45zcncylAGjlowCWxE_PpChcx6v6S9Z3fH';
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Response text length:", text.length);
    console.log("Response snippet:", text.slice(0, 500));
  } catch (e) {
    console.error(e);
  }
}

check();
