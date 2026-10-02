const fs = require("fs");
const path = require("path");

(async function() {
const d = "C:\\Users\\Teste\\Desktop\\Nova pasta\\[Kimochi] RJ01694710\\NTR~1";
const dataDir = d + "\\data";

// Build JP->PT lookup from a simple translation file
// We'll use the translations.json if it exists, otherwise just skip
const transPath = path.join(d, "data", "translations.json");
// translations.json was deleted, so let's rebuild the map manually

// Actually, let's undo the bad patch first. The problem was the double-serialization.
// Let me restore from backup... but there's no backup.
// Let me check what the original Map004.json looked like vs now

const map004 = JSON.parse(fs.readFileSync(dataDir + "\\Map004.json", "utf8"));
const ev = map004.events[1];
ev.pages[0].list.forEach((cmd, i) => {
  if (cmd.code === 357 && cmd.parameters[0] === "OnevASSISTANT" && cmd.parameters[1] === "setImageChoices") {
    const choicesParam = cmd.parameters[3].choices;
    if (choicesParam && typeof choicesParam === "string") {
      if (choicesParam.length > 200) {
        // Check if it's double-serialized
        console.log("choices[0] first 200 chars:", choicesParam.slice(0, 200));
        try {
          const parsed1 = JSON.parse(choicesParam);
          if (Array.isArray(parsed1) && parsed1.length > 0 && typeof parsed1[0] === "object") {
            console.log("Parsed level 1 - first entry keys:", Object.keys(parsed1[0]));
          }
        } catch(e) {
          console.log("Parse error:", e.message);
        }
      }
    }
  }
});
})();
