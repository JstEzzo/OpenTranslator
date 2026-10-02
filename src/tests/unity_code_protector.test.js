const CodeProtector = require('../core/codeProtector');

function runUnityProtectionTests() {
  const protector = new CodeProtector("unity");
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: "Unity Color Tag",
      input: "<color=#00FF00>Level Up!</color> You reached <color=yellow>Rank 5</color>.",
      simulateTranslation: (prot) => prot.replace("Level Up!", "Subiu de Nível!").replace("You reached", "Você alcançou").replace("Rank 5", "Ranque 5")
    },
    {
      name: "Unity Format Strings {0} and {1}",
      input: "Player {0} collected {1} gold coins!",
      simulateTranslation: (prot) => prot.replace("Player", "Jogador").replace("collected", "coletou").replace("gold coins!", "moedas de ouro!")
    },
    {
      name: "Named Variables {player_name} and {amount}",
      input: "Welcome, {player_name}! You have received {amount} gems.",
      simulateTranslation: (prot) => prot.replace("Welcome,", "Bem-vindo,").replace("You have received", "Você recebeu").replace("gems.", "gemas.")
    },
    {
      name: "Standard C/Unity Format Strings %s and %d",
      input: "Found %d items in %s's chest.",
      simulateTranslation: (prot) => prot.replace("Found", "Encontrado").replace("items in", "itens no baú de").replace("'s chest.", ".")
    },
    {
      name: "TextMeshPro Sprite Tag and Size Tag",
      input: "<size=18>Press <sprite name=\"button_a\"> to interact</size>",
      simulateTranslation: (prot) => prot.replace("Press", "Pressione").replace("to interact", "para interagir")
    },
    {
      name: "Rich Text with Custom Tag <n> and Newline \\n",
      input: "Hello World!<n>First line.\\nSecond line.",
      simulateTranslation: (prot) => prot.replace("Hello World!", "Olá Mundo!").replace("First line.", "Primeira linha.").replace("Second line.", "Segunda linha.")
    },
    {
      name: "Complex Nested Markup and Escape Sequences",
      input: "<b><color=#FF5555>WARNING:</color></b> Path \"C:\\\\Game\\\\Data\" is invalid.\\tRetry?",
      simulateTranslation: (prot) => prot.replace("WARNING:", "AVISO:").replace("Path", "Caminho").replace("is invalid.", "é inválido.").replace("Retry?", "Tentar novamente?")
    }
  ];

  for (const tc of testCases) {
    const { protectedText, tokens } = protector.protect(tc.input, "unity");
    if (!tokens || tokens.length === 0) {
      console.error(`[FAIL] ${tc.name}: No tokens extracted`);
      failed++;
      continue;
    }

    const translatedMock = tc.simulateTranslation(protectedText);
    const { restoredText, valid } = protector.restore(translatedMock, tokens);

    // Validate that original placeholders exist untouched in restoredText
    const containsPlaceholders = tokens.every(tok => restoredText.includes(tok.raw));
    if (containsPlaceholders) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}: Missing token in restored text!`);
      console.error('  Original:', tc.input);
      console.error('  Protected:', protectedText);
      console.error('  Translated:', translatedMock);
      console.error('  Restored:', restoredText);
      failed++;
    }
  }

  console.log(`\nUnity CodeProtector Test Results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runUnityProtectionTests();
