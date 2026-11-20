//=============================================================================
// FixWalkAnim.js
//=============================================================================
/*:
 * @plugindesc v1.0 Resets walking animation to idle after changing sprites.
 * @author YourNameHere
 *
 * @help
 * This plugin ensures that when you change a character's image (via
 * Change Graphic in a move route, or any setImage call), the walking
 * animation pattern is reset to the standing frame. This prevents
 * characters from appearing frozen mid-step.
 *
 * No plugin commands or parameters.
 */

(function() {
    'use strict';

    const _Game_CharacterBase_setImage = Game_CharacterBase.prototype.setImage;
    Game_CharacterBase.prototype.setImage = function(characterName, characterIndex) {
        _Game_CharacterBase_setImage.call(this, characterName, characterIndex);
        // Reset the animation frame to the idle/standing frame.
        this._pattern = 0;
        // Optionally reset the animation counter so the next walk starts fresh.
        this._animationCount = 0;
    };
})();