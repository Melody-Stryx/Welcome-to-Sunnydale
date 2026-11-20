/*:
 * @plugindesc v1.0 Disable specific switches when a master switch is turned on.
 * @author YourName
 * @help
 * ============================================================================
 * Switch Disable Group Plugin
 * ============================================================================
 * Define rules in the plugin parameter below. Each rule has this format:
 *
 *   triggerSwitchId : targetSwitchId1, targetSwitchId2, ...
 *
 * Example (using the Plugin Manager):
 *   2 : 3, 4, 5
 *   5 : 2, 3, 4
 *
 * When switch 2 is turned ON, switches 3, 4, and 5 will be turned OFF.
 * When switch 5 is turned ON, switches 2, 3, and 4 will be turned OFF.
 *
 * Lines starting with // are ignored. You can add as many rules as you like.
 *
 * @param rules
 * @text Rule List
 * @desc Define your switch groups here. One rule per line.
 * Format: triggerId : targetId1, targetId2, ...
 * @type multiline_string
 * @default 2 : 3,4,5
 * 5 : 2,3,4
 */

(() => {
    const pluginName = "SwitchDisableGroup";
    const parameters = PluginManager.parameters(pluginName);
    const rulesText = parameters["rules"] || "";

    // ------------------------------------------------------------
    // Parse the rules into an array of { trigger, targets }
    // ------------------------------------------------------------
    const rules = [];
    const lines = rulesText.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        // skip empty lines and comments
        if (trimmed === "" || trimmed.startsWith("//")) continue;

        // expect format:  triggerId : id1,id2,id3 ...
        const colonIndex = trimmed.indexOf(":");
        if (colonIndex === -1) continue; // invalid line, skip

        const triggerStr = trimmed.substring(0, colonIndex).trim();
        const targetsStr = trimmed.substring(colonIndex + 1).trim();
        const triggerId = Number(triggerStr);
        if (isNaN(triggerId)) continue;

        const targets = targetsStr.split(",").map(s => Number(s.trim())).filter(id => !isNaN(id));
        if (targets.length === 0) continue;

        rules.push({ trigger: triggerId, targets: targets });
    }

    // ------------------------------------------------------------
    // Guard to prevent infinite loops when turning off switches
    // might trigger other rules.
    // ------------------------------------------------------------
    let processing = false;

    // ------------------------------------------------------------
    // Alias the original setValue method on Game_Switches
    // ------------------------------------------------------------
    const _Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        // Call the original method first
        _Game_Switches_setValue.call(this, switchId, value);

        // Only react when a switch is turned ON and we are not already
        // processing a chain of rule firings.
        if (value === true && !processing) {
            const rule = rules.find(r => r.trigger === switchId);
            if (rule) {
                processing = true;
                // Turn off all target switches
                for (const targetId of rule.targets) {
                    $gameSwitches.setValue(targetId, false);
                }
                processing = false;
            }
        }
    };

})();