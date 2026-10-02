/**
 * renpyRuntime.js — Controlador de Execução, Telemetria e Captura para Ren'Py
 * 
 * Comunica com o motor Ren'Py em tempo real através do hook periódico oficial
 * config.periodic_callbacks, garantindo execução no thread principal de renderização.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class RenpyRuntime {
  constructor(options = {}) {
    this.options = options;
    this.activeProcess = null;
  }

  resolveGameExe(gameDir) {
    let items = fs.readdirSync(gameDir);
    for (const item of items) {
      if (item.toLowerCase().endsWith('.exe') && !item.toLowerCase().includes('unins') && !item.toLowerCase().includes('crash')) {
        return path.join(gameDir, item);
      }
    }
    for (const item of items) {
      const sub = path.join(gameDir, item);
      if (fs.statSync(sub).isDirectory()) {
        try {
          const subItems = fs.readdirSync(sub);
          for (const s of subItems) {
            if (s.toLowerCase().endsWith('.exe') && !s.toLowerCase().includes('unins') && !s.toLowerCase().includes('crash')) {
              return path.join(sub, s);
            }
          }
        } catch(e) {}
      }
    }
    return null;
  }

  resolveGameSubDir(gameDir) {
    if (fs.existsSync(path.join(gameDir, 'game'))) {
      return path.join(gameDir, 'game');
    }
    try {
      const items = fs.readdirSync(gameDir);
      for (const item of items) {
        const sub = path.join(gameDir, item);
        if (fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'game'))) {
          return path.join(sub, 'game');
        }
      }
    } catch (e) {}
    return path.join(gameDir, 'game');
  }

  /**
   * Injeta o controlador de telemetria em game/000_opentranslator_controller.rpy
   */
  injectController(gameDir, options = {}) {
    const gameSubDir = this.resolveGameSubDir(gameDir);
    const controllerPath = path.join(gameSubDir, '000_opentranslator_controller.rpy');
    const controllerRpyc = path.join(gameSubDir, '000_opentranslator_controller.rpyc');
    if (fs.existsSync(controllerRpyc)) {
      try { fs.unlinkSync(controllerRpyc); } catch (e) {}
    }

    const targetLang = options.language || "pt_BR";
    const langCode = options.setLanguage !== false 
      ? `if getattr(_preferences, "language", None) is None:\n        config.language = "${targetLang}"`
      : `# Idioma original preservado`;

    const pythonCode = `init -999 python:
    import os, time, json

    ${langCode}
    if getattr(renpy, "translation", None) and hasattr(renpy.translation, "translate_string"):
        config.say_menu_text_filter = renpy.translation.translate_string

    def _ot_runtime_tick():
        gamedir = config.gamedir
        cmd_file = os.path.join(gamedir, "_ot_cmd.json")
        resp_file = os.path.join(gamedir, "_ot_resp.json")
        status_file = os.path.join(gamedir, "_ot_status.json")

        if not getattr(renpy.game, "interface", None):
            return

        try:
            if not os.path.exists(status_file):
                with open(status_file, "w") as sf:
                    json.dump({"online": True, "time": time.time(), "language": getattr(config, "language", None)}, sf)
        except Exception:
            pass

        if os.path.exists(cmd_file):
            cmd_data = None
            try:
                with open(cmd_file, "r") as cf:
                    cmd_data = json.load(cf)
            except Exception:
                return

            if not cmd_data:
                return

            action = cmd_data.get("action")
            resp = {"action": action, "success": False}

            try:
                if action == "ping":
                    resp["success"] = True
                    resp["language"] = getattr(config, "language", None)

                elif action == "screenshot":
                    target_path = cmd_data.get("path")
                    if target_path:
                        pdir = os.path.dirname(target_path)
                        if pdir and not os.path.exists(pdir):
                            os.makedirs(pdir)
                        ok = renpy.exports.screenshot(target_path)
                        resp["success"] = bool(ok)
                        resp["path"] = target_path

                elif action == "show_screen":
                    sname = cmd_data.get("screen", "preferences")
                    renpy.exports.show_screen(sname)
                    resp["success"] = True

                elif action == "hide_screen":
                    sname = cmd_data.get("screen", "preferences")
                    renpy.exports.hide_screen(sname)
                    resp["success"] = True

                elif action == "jump":
                    lbl = cmd_data.get("label", "start")
                    resp["success"] = True
                    try:
                        with open(resp_file, "w") as rf:
                            json.dump(resp, rf)
                        if os.path.exists(cmd_file):
                            os.remove(cmd_file)
                    except Exception:
                        pass
                    try:
                        renpy.exports.main_menu = False
                        if hasattr(renpy.store, "Start"):
                            renpy.store.Start(lbl)()
                        else:
                            renpy.exports.jump(lbl)
                    except Exception:
                        pass
                    return

                elif action == "save":
                    slot = cmd_data.get("slot", "1")
                    try:
                        if getattr(renpy.loadsave, "location", None) is None and hasattr(renpy, "savelocation"):
                            try:
                                renpy.savelocation.init()
                            except Exception:
                                pass

                        if getattr(renpy.game, "log", None) is None and hasattr(renpy.python, "RollbackLog"):
                            try:
                                renpy.game.log = renpy.python.RollbackLog()
                            except Exception:
                                pass

                        if getattr(renpy.game, "log", None) is not None:
                            try:
                                renpy.game.context().rollback = True
                            except Exception:
                                pass
                            if getattr(renpy.game.log, "current", None) is None:
                                try:
                                    renpy.game.log.begin(force=True)
                                except Exception:
                                    pass
                            if getattr(renpy.game.log, "current", None) is None and hasattr(renpy.rollback, "Rollback"):
                                try:
                                    rb = renpy.rollback.Rollback()
                                    renpy.game.log.current = rb
                                    renpy.game.log.log.append(rb)
                                except Exception:
                                    pass

                        if getattr(renpy.exports, "checkpoint", None):
                            try:
                                renpy.exports.checkpoint(hard=True)
                            except Exception:
                                pass
                        if getattr(renpy.exports, "take_screenshot", None):
                            try:
                                renpy.exports.take_screenshot()
                            except Exception:
                                pass

                        renpy.exports.save(str(slot))
                        resp["success"] = True
                        resp["slot"] = str(slot)
                    except Exception as ex_save:
                        resp["error"] = str(ex_save)
                        resp["success"] = False

                elif action == "load":
                    slot = cmd_data.get("slot", "1")
                    slot_arg = slot
                    try:
                        if str(slot).isdigit():
                            slot_arg = int(slot)
                    except Exception:
                        pass
                    resp["success"] = True
                    resp["slot"] = str(slot)
                    try:
                        with open(resp_file, "w") as rf:
                            json.dump(resp, rf)
                        if os.path.exists(cmd_file):
                            os.remove(cmd_file)
                    except Exception:
                        pass
                    try:
                        if hasattr(renpy.store, "FileLoad"):
                            renpy.store.FileLoad(slot_arg, confirm=False)()
                        elif hasattr(renpy.exports, "load"):
                            renpy.exports.load(str(slot))
                    except Exception:
                        pass
                    return

                elif action == "marker_check":
                    st = cmd_data.get("string", "")
                    tr = renpy.translation.translate_string(st) if hasattr(renpy.translation, "translate_string") else st
                    resp["success"] = True
                    resp["translated"] = tr

                elif action == "eval":
                    code = cmd_data.get("code")
                    res = eval(code)
                    resp["success"] = True
                    resp["result"] = str(res)

            except Exception as ex:
                resp["error"] = str(ex)

            try:
                with open(resp_file, "w") as rf:
                    json.dump(resp, rf)
                os.remove(cmd_file)
            except Exception:
                pass

    config.periodic_callbacks.append(_ot_runtime_tick)
`;

    fs.writeFileSync(controllerPath, pythonCode, 'utf8');
    return { success: true, controllerPath };
  }

  /**
   * Remove o controlador de telemetria e arquivos temporários de controle
   */
  removeController(gameDir) {
    const gameSubDir = this.resolveGameSubDir(gameDir);
    const controllerPath = path.join(gameSubDir, '000_opentranslator_controller.rpy');
    const controllerRpyc = path.join(gameSubDir, '000_opentranslator_controller.rpyc');

    [controllerPath, controllerRpyc].forEach(p => {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch(e) {}
      }
    });

    ['_ot_cmd.json', '_ot_resp.json', '_ot_status.json'].forEach(f => {
      const p = path.join(gameSubDir, f);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch(e) {}
      }
    });
    return { success: true };
  }

  killGame(gameDir) {
    if (this.activeProcess) {
      try {
        this.activeProcess.kill('SIGKILL');
      } catch (e) {}
      this.activeProcess = null;
    }
    if (gameDir) {
      try {
        const exePath = this.resolveGameExe(gameDir);
        if (exePath) {
          const exeName = path.basename(exePath);
          spawnSync('taskkill', ['/F', '/IM', exeName], { stdio: 'ignore' });
        }
      } catch (e) {}
    }
  }

  /**
   * Lança o processo executável do jogo
   */
  async launch(gameDir, waitMs = 5000) {
    const exePath = this.resolveGameExe(gameDir);
    if (!exePath) throw new Error(`Executável não encontrado em: ${gameDir}`);

    this.killGame(gameDir);
    await sleep(1000);

    const proc = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore'
    });

    this.activeProcess = proc;
    await sleep(waitMs);
    return proc;
  }

  /**
   * Envia comando para o runtime do Ren'Py e aguarda resposta
   */
  async sendCommand(gameDir, cmd, timeoutMs = 15000) {
    const gameSubDir = this.resolveGameSubDir(gameDir);
    const cmdFile = path.join(gameSubDir, '_ot_cmd.json');
    const respFile = path.join(gameSubDir, '_ot_resp.json');

    if (fs.existsSync(respFile)) {
      try { fs.unlinkSync(respFile); } catch(e) {}
    }

    fs.writeFileSync(cmdFile, JSON.stringify(cmd), 'utf8');

    let elapsed = 0;
    while (elapsed < timeoutMs) {
      await sleep(250);
      elapsed += 250;
      if (fs.existsSync(respFile)) {
        try {
          const resp = JSON.parse(fs.readFileSync(respFile, 'utf8'));
          try { fs.unlinkSync(respFile); } catch(e) {}
          return resp;
        } catch(e) {}
      }
    }
    return { success: false, error: 'Timeout aguardando resposta do runtime RenPy' };
  }

  /**
   * Captura screenshot de alta fidelidade via renpy.screenshot()
   */
  async captureScreenshot(gameDir, outPath, waitMs = 1200) {
    await sleep(waitMs);
    const normOut = path.resolve(outPath).replace(/\\/g, '/');
    const resp = await this.sendCommand(gameDir, {
      action: 'screenshot',
      path: normOut
    });

    let checkWait = 0;
    while (checkWait < 5000) {
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        return { success: true, size: fs.statSync(outPath).size, path: outPath };
      }
      await sleep(300);
      checkWait += 300;
    }
    return { success: false, size: 0, error: resp.error || 'Arquivo não gerado' };
  }
}

module.exports = RenpyRuntime;
