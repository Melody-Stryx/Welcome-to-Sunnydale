//=============================================================================
// CustomGameOver.js
//=============================================================================
/*:
 * @plugindesc v1.0 - Uses a variable to select a custom Game Over image.
 * @author YourName
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * This plugin allows you to display different Game Over screens based on a
 * specific game variable. The images should be placed in the usual system
 * folder (img/system/) and named GameOver_<number>.png, where <number> is
 * the variable value at which that image should be used.
 *
 * Example:
 *   Variable ID = 1
 *   Suffix List = 0, 50, 100, 150
 *
 * If the variable is 122, the plugin will use GameOver_100.png because 100 is
 * the highest suffix that is <= 122.
 * If the variable is less than the smallest suffix (e.g., -5), it will fall
 * back to the default GameOver.png.
 *
 * ============================================================================
 * Plugin Parameters
 * ============================================================================
 * @param variableId
 * @text Variable ID
 * @desc The ID of the variable to check for the Game Over screen.
 * @type variable
 * @default 1
 *
 * @param suffixList
 * @text Suffix List
 * @desc Comma-separated list of numbers that correspond to available GameOver images.
 * Example: 0,50,100,150
 * @type text
 * @default 
 */
/*:ja
 * @plugindesc v1.0 - 変数によってカスタムゲームオーバー画像を選択します。
 * @author YourName
 *
 * @help
 * ============================================================================
 * はじめに
 * ============================================================================
 * このプラグインは、特定のゲーム変数に応じて異なるゲームオーバー画面を表示します。
 * 画像は通常のシステムフォルダ（img/system/）に配置し、GameOver_<番号>.png
 * という名前を付けてください。番号はその画像を使用する変数の値です。
 *
 * 例:
 *   変数ID = 1
 *   サフィックスリスト = 0, 50, 100, 150
 *
 * 変数が122の場合、100が<=122の最大値なので、GameOver_100.pngが使用されます。
 * 変数が最小のサフィックスよりも小さい場合（例：-5）、デフォルトの
 * GameOver.pngにフォールバックします。
 *
 * ============================================================================
 * プラグインパラメータ
 * ============================================================================
 * @param variableId
 * @text 変数ID
 * @desc ゲームオーバー画面をチェックする変数のID。
 * @type variable
 * @default 1
 *
 * @param suffixList
 * @text サフィックスリスト
 * @desc 利用可能なGameOver画像に対応する番号をカンマ区切りで指定します。
 * 例: 0,50,100,150
 * @type text
 * @default 
 */

(() => {
    'use strict';

    // Retrieve plugin parameters
    const pluginName = 'CustomGameOver';
    const parameters = PluginManager.parameters(pluginName);

    // Parse variable ID
    const variableId = Number(parameters.variableId || 1);

    // Parse and sort suffix list
    const suffixList = String(parameters.suffixList || '')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    //=========================================================================
    // Override Scene_Gameover.createBackground
    //=========================================================================
    const _Scene_Gameover_createBackground = Scene_Gameover.prototype.createBackground;
    Scene_Gameover.prototype.createBackground = function() {
        const value = $gameVariables.value(variableId);
        let chosenSuffix = null;

        // Find the highest suffix that is <= current variable value
        for (let i = suffixList.length - 1; i >= 0; i--) {
            if (suffixList[i] <= value) {
                chosenSuffix = suffixList[i];
                break;
            }
        }

        // Build image name
        const imageName = chosenSuffix !== null ? `GameOver_${chosenSuffix}` : 'GameOver';

        // Create the background sprite with the selected image
        this._backSprite = new Sprite(ImageManager.loadSystem(imageName));
        this.addChild(this._backSprite);
    };

})();