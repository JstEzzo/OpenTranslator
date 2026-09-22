const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const BaseEngineHandler = require('../baseEngineHandler');

class RpgMakerRubyHandler extends BaseEngineHandler {
  constructor() {
    super('RpgMakerRubyHandler');
  }

  /**
   * Sidecar Bridge Execution: Ruby Marshal <-> JSON conversion.
   * Invokes sidecar script to deserialize binary .rxdata / .rvdata / .rvdata2 safely.
   */
  async _runSidecarMarshalBridge({ gameDir, mode, payloadFile }) {
    return new Promise((resolve, reject) => {
      const sidecarScript = path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'rpgmaker', 'marshal_bridge.py');
      
      // Fallback if dedicated sidecar script is not present
      if (!fs.existsSync(sidecarScript)) {
        return resolve({
          success: false,
          error: `Marshal bridge script not found at ${sidecarScript}`
        });
      }

      const pythonBin = 'python';
      const args = [sidecarScript, '--game-dir', gameDir, '--mode', mode];
      if (payloadFile) args.push('--payload', payloadFile);

      execFile(pythonBin, args, { cwd: gameDir }, (error, stdout, stderr) => {
        if (error) {
          return resolve({
            success: false,
            error: stderr || error.message
          });
        }
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          resolve({ success: true, rawOutput: stdout });
        }
      });
    });
  }

  /**
   * Extract RPG Maker XP/VX/VXAce text via Sidecar Marshal Bridge.
   */
  async extract({ gameDir, gameExe, title, options = {} }) {
    try {
      const dataDir = path.join(gameDir, 'Data');
      if (!fs.existsSync(dataDir)) {
        return {
          success: false,
          engine: 'RPG_MAKER_RUBY',
          extractedFiles: [],
          totalEntries: 0,
          error: `Data directory not found at ${dataDir}`
        };
      }

      const rubyFiles = fs.readdirSync(dataDir).filter(f => 
        f.endsWith('.rxdata') || f.endsWith('.rvdata') || f.endsWith('.rvdata2')
      );

      const bridgeResult = await this._runSidecarMarshalBridge({ gameDir, mode: 'extract' });

      return {
        success: rubyFiles.length > 0,
        engine: 'RPG_MAKER_RUBY',
        extractedFiles: rubyFiles.map(f => path.join(dataDir, f)),
        totalEntries: rubyFiles.length,
        bridgeResult
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RPG_MAKER_RUBY',
        extractedFiles: [],
        totalEntries: 0,
        error: err.message
      };
    }
  }

  /**
   * Inject translations into Ruby Marshal binary files via Sidecar.
   */
  async injectTranslation({ gameDir, translationMap, options = {} }) {
    try {
      const payloadFile = path.join(gameDir, 'opentranslator_ruby_payload.json');
      fs.writeFileSync(payloadFile, JSON.stringify(translationMap, null, 2), 'utf-8');

      const bridgeResult = await this._runSidecarMarshalBridge({ 
        gameDir, 
        mode: 'inject', 
        payloadFile 
      });

      if (fs.existsSync(payloadFile)) {
        fs.unlinkSync(payloadFile);
      }

      return {
        success: bridgeResult.success !== false,
        engine: 'RPG_MAKER_RUBY',
        injectedFiles: [path.join(gameDir, 'Data')],
        count: Object.keys(translationMap || {}).length,
        bridgeResult
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RPG_MAKER_RUBY',
        injectedFiles: [],
        count: 0,
        error: err.message
      };
    }
  }

  /**
   * Apply PT-BR font patch and RGSS Runtime Look-Ahead Word-Wrap for XP/VX/VXAce.
   */
  async applyFontPatch({ gameDir, fontFile, options = {} }) {
    try {
      const fontsDir = path.join(gameDir, 'Fonts');
      if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
      }

      let patchedFiles = [];
      if (fontFile && fs.existsSync(fontFile)) {
        const destFont = path.join(fontsDir, path.basename(fontFile));
        fs.copyFileSync(fontFile, destFont);
        patchedFiles.push(destFont);
      }

      const fontName = fontFile ? path.basename(fontFile, path.extname(fontFile)) : 'Arial';
      const rgssRuntimeScript = `# OpenTranslator RGSS Runtime & Safe Look-Ahead Word-Wrap
if defined?(Font)
  begin
    Font.default_name = ["${fontName}", "Arial"]
    Font.default_size = 22
  rescue => e
  end
end

if defined?(Window_Message)
  class Window_Message < Window_Base
    if method_defined?(:process_normal_character) && !method_defined?(:opent_orig_process_normal_character)
      alias opent_orig_process_normal_character process_normal_character
      def process_normal_character(a, b = nil)
        c, text_state = nil, nil
        if a.is_a?(String)
          c = a
          text_state = b
        else
          text_state = a
          c = (text_state && text_state[:text]) ? text_state[:text][text_state[:index] || 0] : ''
        end

        if c == ' ' && text_state && text_state[:text]
          idx = text_state[:index] || 0
          text_rem = text_state[:text][idx..-1] || ""
          if text_rem =~ /^([^\\s\\x1b\\n\\f]+)/
            next_word = $1
            clean_word = next_word.gsub(/\\\\+[A-Za-z0-9_]+(\\[[^\\]]*\\])?|\\\\+[{{}}!.\\|^$><\\\\%]/, '')
            if respond_to?(:contents) && contents && respond_to?(:process_new_line)
              word_w = (contents.text_size(clean_word).width rescue (clean_word.length * 14))
              max_w = (respond_to?(:contentsWidth) ? contentsWidth : (width ? width - 36 : 600))
              limit_x = max_w - 12
              if (text_state[:x] || 0) + word_w + 8 > limit_x
                process_new_line(text_state)
                if !a.is_a?(String) && text_state[:text][text_state[:index]] == ' '
                  text_state[:index] += 1
                end
                return
              end
            end
          end
        end

        opent_orig_process_normal_character(a, b)
      end
    end
  end
end
`;
      const runtimePath = path.join(gameDir, 'opentranslator_rgss_runtime.rb');
      fs.writeFileSync(runtimePath, rgssRuntimeScript, 'utf-8');
      patchedFiles.push(runtimePath);

      return {
        success: true,
        engine: 'RPG_MAKER_RUBY',
        patchedFiles
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RPG_MAKER_RUBY',
        patchedFiles: [],
        error: err.message
      };
    }
  }

  /**
   * Cleanup temporary bridge payload files.
   */
  async cleanup({ gameDir, options = {} }) {
    const payloadFile = path.join(gameDir, 'opentranslator_ruby_payload.json');
    if (fs.existsSync(payloadFile)) {
      fs.unlinkSync(payloadFile);
    }
    return { success: true, engine: 'RPG_MAKER_RUBY' };
  }
}

module.exports = RpgMakerRubyHandler;
