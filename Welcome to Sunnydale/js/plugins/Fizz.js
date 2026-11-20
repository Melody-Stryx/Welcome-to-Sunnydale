/*:
 * @target MZ
 * @plugindesc v1.1 - Treat 0 HP damage as a miss. Prevents all on-hit effects and supports custom miss messages by Skill Type.
 * @author ChatGPT
 *
 * @param ZeroDamageIsMiss
 * @text Enable
 * @type boolean
 * @default true
 *
 * @param SkillTypeMessages
 * @text Skill Type Messages
 * @type struct<SkillTypeMessage>[]
 * @default []
 *
 * @help
 * ============================================================================
 * Zero Damage Miss
 * ============================================================================
 *
 * If an HP damage skill would deal exactly 0 damage:
 *
 * • Miss popup is shown.
 * • Damage popup of 0 is suppressed.
 * • States are NOT applied.
 * • Buffs/Debuffs are NOT applied.
 * • Common Events are NOT applied.
 * • User Effects (TP gain, etc.) are NOT applied.
 * • Drain effects do not occur.
 * • Custom battle log message can be shown based on Skill Type.
 *
 * %1 = Target name
 */

/*~struct~SkillTypeMessage:
 * @param SkillType
 * @type skillType
 *
 * @param Message
 * @type string
 * @default It has no effect on %1.
 */

(() => {

const pluginName = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
const params = PluginManager.parameters(pluginName);

const enabled = params.ZeroDamageIsMiss === "true";

const messages = {};

try {
    const list = JSON.parse(params.SkillTypeMessages || "[]");
    for (const e of list) {
        const obj = JSON.parse(e);
        messages[Number(obj.SkillType)] = obj.Message;
    }
} catch(e){
    console.error(e);
}

//-----------------------------------------------------------------------------
// Zero Damage Detection
//-----------------------------------------------------------------------------

const _Game_Action_apply = Game_Action.prototype.apply;

Game_Action.prototype.apply = function(target) {

    if (!enabled) {
        _Game_Action_apply.call(this, target);
        return;
    }

    const result = target.result();
    this.subject().clearResult();
    result.clear();

    result.used = this.testApply(target);

    if (!result.used) return;

    result.missed = (Math.random() >= this.itemHit(target));
    result.evaded = (!result.missed && Math.random() < this.itemEva(target));
    result.physical = this.isPhysical();
    result.drain = this.isDrain();

    if (result.isHit()) {

        if (this.item().damage.type > 0) {

            result.critical = (Math.random() < this.itemCri(target));

            const value = this.makeDamageValue(target, result.critical);

            if (
                this.isHpEffect() &&
                !this.isRecover() &&
                value === 0
            ) {
                result.clear();

                result.used = true;
                result.missed = true;
                result.zeroDamageMiss = true;

                return;
            }

            this.executeDamage(target, value);
        }

        this.item().effects.forEach(effect => {
            this.applyItemEffect(target, effect);
        });

        this.applyItemUserEffect(target);
    }

    this.updateLastTarget(target);
};

//-----------------------------------------------------------------------------
// Custom Battle Log
//-----------------------------------------------------------------------------

const _displayMiss = Window_BattleLog.prototype.displayMiss;

Window_BattleLog.prototype.displayMiss = function(target) {

    const result = target.result();

    if (result.zeroDamageMiss) {

        const action = BattleManager._action;

        if (action && action.isSkill()) {

            const msg = messages[action.item().stypeId];

            if (msg) {
                this.push("addText", msg.replace("%1", target.name()));
                return;
            }
        }
    }

    _displayMiss.call(this, target);

};

})();