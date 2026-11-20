/*:
 * @plugindesc v2.1 Quest system with map HUD (stable).
 * @author YourName
 * @help
 * Simple Quest System + Map HUD
 * ==============================
 * Manage quests through Plugin Commands.
 * A small HUD on the map shows the tracked quest.
 *
 * Plugin Commands:
 *   Add Quest – Create a new quest.
 *   Track Quest – Show the quest on the map HUD.
 *   Untrack Quest – Hide the map HUD.
 *   Set Progress – Update quest step count.
 *   Complete Quest – Mark as done.
 *   Fail Quest – Mark as failed.
 *   Remove Quest – Delete a quest.
 *   Open Quest Log – Show the quest menu.
 *
 * @command add
 * @text Add Quest
 * @desc Creates a new quest.
 *
 * @arg id
 * @text Quest ID
 * @desc Unique identifier (e.g., quest1)
 * @type string
 * @default quest1
 *
 * @arg name
 * @text Quest Name
 * @desc Display name
 * @type string
 * @default New Quest
 *
 * @arg description
 * @text Description
 * @desc Quest description (first line = HUD objective)
 * @type multiline_string
 * @default Talk to the elder.
 *
 * @arg maxProgress
 * @text Max Progress
 * @desc Number of steps to complete (default: 1)
 * @type number
 * @min 1
 * @default 1
 *
 * @command track
 * @text Track Quest
 * @desc Shows a quest on the map HUD.
 *
 * @arg id
 * @text Quest ID
 * @desc The quest to track
 * @type string
 * @default quest1
 *
 * @command untrack
 * @text Untrack Quest
 * @desc Hides the map HUD (stops tracking).
 *
 * @command setProgress
 * @text Set Progress
 * @desc Updates quest progress. Auto-completes if value >= max.
 *
 * @arg id
 * @text Quest ID
 * @type string
 * @default quest1
 *
 * @arg value
 * @text Progress Value
 * @type number
 * @min 0
 * @default 0
 *
 * @command complete
 * @text Complete Quest
 * @desc Marks the quest as completed.
 *
 * @arg id
 * @text Quest ID
 * @type string
 * @default quest1
 *
 * @command fail
 * @text Fail Quest
 * @desc Marks the quest as failed.
 *
 * @arg id
 * @text Quest ID
 * @type string
 * @default quest1
 *
 * @command remove
 * @text Remove Quest
 * @desc Deletes the quest entirely.
 *
 * @arg id
 * @text Quest ID
 * @type string
 * @default quest1
 *
 * @command openLog
 * @text Open Quest Log
 * @desc Shows the quest log scene.
 */

(() => {
    // -------------------------------------------------------------------------
    // Game_Quests
    // -------------------------------------------------------------------------
    class Game_Quests {
        constructor() {
            this._data = {};
            this._trackedId = null;
            this._hudDirty = true;
        }

        add(id, name, description, maxProgress) {
            this._data[id] = {
                name: name,
                description: description,
                maxProgress: Number(maxProgress) || 1,
                progress: 0,
                status: 'In Progress'
            };
            this._hudDirty = true;
        }

        remove(id) {
            delete this._data[id];
            if (this._trackedId === id) this._trackedId = null;
            this._hudDirty = true;
        }

        setProgress(id, value) {
            const q = this._data[id];
            if (!q) return;
            q.progress = Math.min(Number(value), q.maxProgress);
            if (q.progress >= q.maxProgress) {
                q.status = 'Completed';
            } else if (q.status === 'Completed' && q.progress < q.maxProgress) {
                q.status = 'In Progress';
            }
            this._hudDirty = true;
        }

        complete(id) {
            const q = this._data[id];
            if (!q) return;
            q.progress = q.maxProgress;
            q.status = 'Completed';
            this._hudDirty = true;
        }

        fail(id) {
            const q = this._data[id];
            if (!q) return;
            q.status = 'Failed';
            this._hudDirty = true;
        }

        track(id) { this._trackedId = id; this._hudDirty = true; }
        untrack() { this._trackedId = null; this._hudDirty = true; }

        trackedId() { return this._trackedId; }
        exists(id) { return !!this._data[id]; }
        status(id) { return this._data[id] ? this._data[id].status : 'Not Started'; }
        progress(id) { return this._data[id] ? this._data[id].progress : 0; }
        maxProgress(id) { return this._data[id] ? this._data[id].maxProgress : 0; }
        isCompleted(id) { return this.status(id) === 'Completed'; }
        isInProgress(id) { return this.status(id) === 'In Progress'; }
        isFailed(id) { return this.status(id) === 'Failed'; }

        activeQuests() {
            return Object.keys(this._data).filter(id => {
                const s = this._data[id].status;
                return s === 'In Progress' || s === 'Not Started';
            });
        }
        allQuests() { return Object.keys(this._data).sort(); }
        questData(id) { return this._data[id] || null; }
    }

    // -------------------------------------------------------------------------
    // Save / Load
    // -------------------------------------------------------------------------
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        $gameQuests = new Game_Quests();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.quests = $gameQuests._data;
        contents.trackedQuestId = $gameQuests._trackedId;
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        $gameQuests._data = contents.quests || {};
        $gameQuests._trackedId = contents.trackedQuestId || null;
    };

    // -------------------------------------------------------------------------
    // Register structured plugin commands
    // -------------------------------------------------------------------------
    PluginManager.registerCommand('SimpleQuestSystem', 'add', args => {
        $gameQuests.add(args.id, args.name, args.description, args.maxProgress);
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'track', args => {
        $gameQuests.track(args.id);
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'untrack', () => {
        $gameQuests.untrack();
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'setProgress', args => {
        $gameQuests.setProgress(args.id, args.value);
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'complete', args => {
        $gameQuests.complete(args.id);
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'fail', args => {
        $gameQuests.fail(args.id);
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'remove', args => {
        $gameQuests.remove(args.id);
    });

    PluginManager.registerCommand('SimpleQuestSystem', 'openLog', () => {
        SceneManager.push(Scene_QuestLog);
    });

    // -------------------------------------------------------------------------
    // Quest Log Scene
    // -------------------------------------------------------------------------
    class Window_QuestList extends Window_Command {
        constructor(rect) { super(rect); }
        maxCols() { return 1; }
        makeCommandList() {
            const ids = $gameQuests.allQuests();
            for (const id of ids) {
                const q = $gameQuests.questData(id);
                if (q) {
                    const statusChar = q.status[0];
                    this.addCommand(`${statusChar}: ${q.name}`, id);
                }
            }
        }
    }

    class Window_QuestDetail extends Window_Base {
        constructor(rect) { super(rect); }
        refresh(questId) {
            this.contents.clear();
            if (!questId || !$gameQuests.exists(questId)) return;
            const q = $gameQuests.questData(questId);
            this.drawText(`Status: ${q.status}`, 0, 0, this.contentsWidth(), 'left');
            this.drawText(`Progress: ${q.progress}/${q.maxProgress}`, 0, this.lineHeight(), this.contentsWidth(), 'left');
            this.drawTextEx(q.description, 0, this.lineHeight() * 2);
        }
    }

    class Scene_QuestLog extends Scene_MenuBase {
        constructor() { super(); }
        create() {
            super.create();
            this.createListWindow();
            this.createDetailWindow();
            this._listWindow.setHandler('ok', this.onQuestOk.bind(this));
            this._listWindow.setHandler('cancel', this.popScene.bind(this));
        }
        createListWindow() {
            const rect = new Rectangle(0, this.buttonAreaTop(), Graphics.boxWidth / 2, this.mainAreaHeight());
            this._listWindow = new Window_QuestList(rect);
            this._listWindow.activate();
            this._listWindow.select(0);
            this.addWindow(this._listWindow);
        }
        createDetailWindow() {
            const rect = new Rectangle(Graphics.boxWidth / 2, this.buttonAreaTop(), Graphics.boxWidth / 2, this.mainAreaHeight());
            this._detailWindow = new Window_QuestDetail(rect);
            this.addWindow(this._detailWindow);
            this.onQuestOk();
        }
        onQuestOk() {
            const id = this._listWindow.currentExt();
            this._detailWindow.refresh(id);
        }
    }

    // -------------------------------------------------------------------------
    // Map HUD (added directly to scene to avoid addWindow compatibility issues)
    // -------------------------------------------------------------------------
    class Window_QuestHUD extends Window_Base {
        constructor() {
            const width = 280;
            const height = 72;
            super(new Rectangle(4, 4, width, height));
            this.opacity = 160;
            this.contentsOpacity = 255;
            this.z = 100; // ensure it's on top
        }
        refresh() {
            this.contents.clear();
            const id = $gameQuests.trackedId();
            if (!id || !$gameQuests.isInProgress(id)) {
                this.visible = false;
                return;
            }
            this.visible = true;
            const q = $gameQuests.questData(id);
            const descLines = q.description.split('\n');
            const objectiveLine = descLines[0].trim();

            // Use drawTextEx to support color codes like \C[2]
            this.drawTextEx(`\\C[2]${q.name}`, 0, 0);
            this.drawTextEx(`\\C[0]${objectiveLine}`, 0, this.lineHeight());
            if (q.maxProgress > 1) {
                const progressText = `(${q.progress}/${q.maxProgress})`;
                this.drawText(progressText, 0, this.lineHeight() * 2, this.contentsWidth(), 'right');
            }
        }
    }

    // -------------------------------------------------------------------------
    // Hook into Scene_Map (safe method)
    // -------------------------------------------------------------------------
    const _Scene_Map_create = Scene_Map.prototype.create;
    Scene_Map.prototype.create = function() {
        _Scene_Map_create.call(this);
        // Create the HUD and add it directly to the scene
        this._questHud = new Window_QuestHUD();
        this.addChild(this._questHud);   // works even if addWindow is broken by other plugins
        this._questHud.refresh();
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if ($gameQuests._hudDirty) {
            this._questHud.refresh();
            $gameQuests._hudDirty = false;
        }
    };

})();