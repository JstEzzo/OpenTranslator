const fs = require("fs");
const d = "C:\\Users\\Teste\\Desktop\\Nova pasta\\[Kimochi] RJ01694710\\NTR~1";
const mapPath = d + "\\data\\Map004.json";

let content = fs.readFileSync(mapPath, "utf8");

const keyMap = {
  '\"Imagem\"' : '\"画像\"' ,
  '\"Nome da escolha\"' : '\"選択肢名\"' ,
  '\"Coordenada X\"' : '\"X座標\"' ,
  '\"Coordenada Y\"' : '\"Y座標\"' ,
  '\"Escala\"' : '\"Scale\"' ,
  '\"ExtraImageS configura��o\"' : '\"ExtraImageSetting\"' ,
  '\"ExtraImageSe tting\"' : '\"ExtraImageSetting\"' ,
};

let count = 0;
for (const [pt, jp] of Object.entries(keyMap)) {
  if (content.includes(pt)) {
    content = content.split(pt).join(jp);
    count++;
    console.log("Restored key: " + pt + " -> " + jp);
  }
}

if (count > 0) {
  try {
    JSON.parse(content);
    fs.writeFileSync(mapPath, content, "utf8");
    console.log("Saved Map004.json");
  } catch(e) {
    console.log("JSON parse error:", e.message);
  }
}
