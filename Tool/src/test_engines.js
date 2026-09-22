const https = require("https");

const tests = [
  {
    name: "Google GTX",
    url: "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=" + encodeURIComponent("test"),
  },
  {
    name: "Google Mobile",
    url: "https://translate.google.com/m?sl=en&tl=pt&q=" + encodeURIComponent("test"),
  },
  {
    name: "MyMemory",
    url: "https://api.mymemory.translated.net/get?q=test&langpair=en%7Cpt",
  },
];

async function testEngine(name, url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (r) => {
      let d = "";
      r.setEncoding("utf8");
      r.on("data", (c) => (d += c));
      r.on("end", () => {
        console.log(`${name}: HTTP ${r.statusCode} | Redirect: ${r.headers.location ? r.headers.location.slice(0, 80) : "n/a"}`);
        if (d.length < 200) console.log("  Body:", d);
        resolve();
      });
    }).on("error", (e) => {
      console.log(`${name}: ERROR ${e.message}`);
      resolve();
    });
  });
}

(async () => {
  for (const t of tests) {
    await testEngine(t.name, t.url);
    await new Promise(r => setTimeout(r, 1000));
  }
})();