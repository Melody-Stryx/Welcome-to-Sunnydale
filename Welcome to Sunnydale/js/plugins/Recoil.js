/*:
 * @target MZ
 * @plugindesc v1.0 - Redirects negative HP damage to the user as unavoidable self-damage.
 * @author ChatGPT
 *
 * @param EnableBackfire
 * @text Enable Negative Damage Backfire
 * @type boolean
 * @default true
 *
 * @help
 * ============================================================================
 * Negative Damage Backfire
 * ============================================================================
 *
 * If a damage formula produces a negative HP damage value before RPG Maker
 * clamps it to 0, the damage is redirected to the skill user.
 *
 * Examples:
 *   -0.01  -> 1 self damage
 *   -1     -> 1 self damage
 *   -3.5   -> 4 self damage
 *   -10.2  -> 11 self damage
 *
 * The self damage:
 *  - Cannot miss.
 *  - Ignores evasion.
 *  - Ignores guard.
 *  - Is not critical.
 *  - Uses no variance.
 *
 * The original target receives no HP damage.
 *
 * If the user targeted themselves, they will still receive the redirected
 * self damage, meaning they can take damage twice if another plugin or the
 * skill itself also damages them.
 */

(() => {

const pluginName = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
const params = PluginManager.parameters(pluginName);

const enabled = params.EnableBackfire === "true";

//-----------------------------------------------------------------------------
// Store raw damage before RPG Maker clamps it.
//-----------------------------------------------------------------------------

const _makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {

    const value = _makeDamageValue.call(this, target, critical);

    this._rawDamageValue = value;

    return value;
};

//-----------------------------------------------------------------------------
// Redirect negative damage / healing.
//-----------------------------------------------------------------------------

const _executeDamage = Game_Action.prototype.executeDamage;
Game_Action.prototype.executeDamage = function(target, value) {

    if (
        enabled &&
        this.isHpEffect() &&
        this._rawDamageValue < 0
    ) {
        const subject = this.subject();

        // Always round away from zero.
        const backfire = Math.ceil(Math.abs(this._rawDamageValue));

        // Prevent the original HP effect.
        value = 0;

        // Apply unavoidable self damage.
        subject.gainHp(-backfire);

        const result = subject.result();

        result.used = true;
        result.success = true;
        result.missed = false;
        result.evaded = false;
        result.critical = false;
        result.hpAffected = true;
        result.hpDamage = backfire;

        subject.refresh();

        return;
    }

    _executeDamage.call(this, target, value);
};