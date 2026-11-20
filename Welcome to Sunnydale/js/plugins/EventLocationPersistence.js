/*:
 * @target MZ
 * @plugindesc v1.0.0 Persists map event positions between map transfers and save/load.
 * @author OpenAI
 *
 * @help
 * ============================================================================
 * Event Location Persistence
 * ============================================================================
 *
 * This plugin remembers the current position and facing direction of map
 * events. Their saved positions persist when:
 *   - Leaving and re-entering a map.
 *   - Saving and loading the game.
 *
 * By default, ALL map events are persistent.
 *
 * To exclude an event from persistence, put this in the event's Note box:
 *   <NoPersistLocation>
 *
 * To make ONLY tagged events persistent, set "Persistence Mode" to
 * "Tagged Events Only" in the Plugin Manager. Then use:
 *   <PersistLocation>
 *
 * The saved position belongs to the map ID + event ID, so different maps
 * and different event IDs do not interfere with one another.
 *
 * Plugin Commands
 * ----------------------------------------------------------------------------
 *
 * Save Current Event Location
 *   Saves the location and facing direction of the event running the command.
 *
 * Save All Event Locations
 *   Immediately records all persistent events on the current map.
 *
 * Reset Current Event Location
 *   Removes the saved location for the event running the command. The event
 *   will return to its normal editor position the next time the map is loaded.
 *
 * Reset All Event Locations
 *   Removes every saved event location from the game.
 *
 * ============================================================================
 *
 * @param Persistence Mode
 * @type select
 * @option All Events
 * @value all
 * @option Tagged Events Only
 * @value tagged
 * @default all
 * @desc Determines which events have their locations persisted.
 *
 * @param Excluded Note Tag
 * @type string
 * @default NoPersistLocation
 * @desc Events containing this note tag are never persisted.
 *
 * @param Included Note Tag
 * @type string
 * @default PersistLocation
 * @desc When using Tagged Events Only, this note tag marks an event for persistence.
 *
 * @command saveCurrent
 * @text Save Current Event Location
 * @desc Immediately saves the location of the event running this command.
 *
 * @command saveAll
 * @text Save All Event Locations
 * @desc Immediately saves the locations of all persistent events on the current map.
 *
 * @command resetCurrent
 * @text Reset Current Event Location
 * @desc Removes the saved location of the event running this command.
 *
 * @command resetAll
 * @text Reset All Event Locations
 * @desc Removes every saved event location from the current save data.
 */

(() => {
    "use strict";

    const pluginName = "EventLocationPersistence";
    const parameters = PluginManager.parameters(pluginName);

    const persistenceMode =
        String(parameters["Persistence Mode"] || "all");

    const excludedTag =
        String(parameters["Excluded Note Tag"] || "NoPersistLocation");

    const includedTag =
        String(parameters["Included Note Tag"] || "PersistLocation");

    // -------------------------------------------------------------------------
    // Game_System
    // -------------------------------------------------------------------------

    const _Game_System_initialize =
        Game_System.prototype.initialize;

    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._elpEventLocations = {};
    };

    Game_System.prototype.elpEventLocations = function() {
        if (!this._elpEventLocations) {
            this._elpEventLocations = {};
        }

        return this._elpEventLocations;
    };

    Game_System.prototype.elpKey = function(mapId, eventId) {
        return `${mapId}:${eventId}`;
    };

    Game_System.prototype.elpSaveEventLocation = function(event) {
        if (!event || !event.eventId || event.eventId() <= 0) {
            return;
        }

        const mapId = event._mapId;
        const eventId = event.eventId();

        this.elpEventLocations()[
            this.elpKey(mapId, eventId)
        ] = {
            x: event.x,
            y: event.y,
            direction: event.direction()
        };
    };

    Game_System.prototype.elpGetEventLocation = function(mapId, eventId) {
        return this.elpEventLocations()[
            this.elpKey(mapId, eventId)
        ];
    };

    Game_System.prototype.elpResetEventLocation = function(mapId, eventId) {
        delete this.elpEventLocations()[
            this.elpKey(mapId, eventId)
        ];
    };

    Game_System.prototype.elpResetAllLocations = function() {
        this._elpEventLocations = {};
    };

    // -------------------------------------------------------------------------
    // Event eligibility
    // -------------------------------------------------------------------------

    function eventNote(event) {
        return event && typeof event.note === "string"
            ? event.note
            : "";
    }

    function hasNoteTag(event, tag) {
        if (!tag) {
            return false;
        }

        const escaped = tag.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        return new RegExp(
            `<${escaped}(?:\\s*:\\s*[^>]+)?\\s*>`,
            "i"
        ).test(eventNote(event));
    }

    function shouldPersist(event) {
        if (!event || !event.eventId || event.eventId() <= 0) {
            return false;
        }

        const data = event.event();

        if (!data) {
            return false;
        }

        if (hasNoteTag(data, excludedTag)) {
            return false;
        }

        if (persistenceMode === "tagged") {
            return hasNoteTag(data, includedTag);
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Save all current event positions
    // -------------------------------------------------------------------------

    function saveCurrentMapEventLocations() {
        if (!$gameMap || !$gameSystem) {
            return;
        }

        $gameMap.events().forEach(event => {
            if (shouldPersist(event)) {
                $gameSystem.elpSaveEventLocation(event);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Restore event positions when a map is set up
    // -------------------------------------------------------------------------

    const _Game_Map_setup =
        Game_Map.prototype.setup;

    Game_Map.prototype.setup = function(mapId) {

        // Save the events on the current map before changing maps.
        if (this._mapId > 0 && $gameSystem) {
            saveCurrentMapEventLocations();
        }

        _Game_Map_setup.call(this, mapId);

        // Restore saved positions on the new map.
        this.events().forEach(event => {

            if (!shouldPersist(event)) {
                return;
            }

            const saved =
                $gameSystem.elpGetEventLocation(
                    mapId,
                    event.eventId()
                );

            if (saved) {
                event.locate(saved.x, saved.y);
                event.setDirection(saved.direction);
            }
        });
    };

    // -------------------------------------------------------------------------
    // Save-game support
    // -------------------------------------------------------------------------

    const _DataManager_makeSaveContents =
        DataManager.makeSaveContents;

    DataManager.makeSaveContents = function() {

        // Make sure the current event positions are captured immediately
        // before the save data is created.
        saveCurrentMapEventLocations();

        return _DataManager_makeSaveContents.call(this);
    };

    // -------------------------------------------------------------------------
    // Plugin Commands
    // -------------------------------------------------------------------------

    PluginManager.registerCommand(
        pluginName,
        "saveCurrent",
        function() {

            const event = this.character(0);

            if (event && shouldPersist(event)) {
                $gameSystem.elpSaveEventLocation(event);
            }
        }
    );

    PluginManager.registerCommand(
        pluginName,
        "saveAll",
        function() {
            saveCurrentMapEventLocations();
        }
    );

    PluginManager.registerCommand(
        pluginName,
        "resetCurrent",
        function() {

            const event = this.character(0);

            if (event && event.eventId) {
                $gameSystem.elpResetEventLocation(
                    event._mapId,
                    event.eventId()
                );
            }
        }
    );

    PluginManager.registerCommand(
        pluginName,
        "resetAll",
        function() {
            $gameSystem.elpResetAllLocations();
        }
    );

})();