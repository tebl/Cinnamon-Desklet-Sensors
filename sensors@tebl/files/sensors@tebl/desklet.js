const ByteArray = imports.byteArray;
const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Pango = imports.gi.Pango;
const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const FileUtils = imports.misc.fileUtils;
const ModalDialog = imports.ui.modalDialog;

const FORCE_DEBUG = false;

function SensorsDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

SensorsDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
        this.desklet_id = desklet_id;
        this.log_debug("Initializing");
        this.setHeader(metadata.name);
        this._menu.addAction(_("Customize current theme..."), Lang.bind(this, this.on_copy_theme));
        this._menu.addAction(_("Set theme to 'Custom'"), Lang.bind(this, this.on_theme_custom));
        this._menu.addAction(_("Set theme to 'Dark'"), Lang.bind(this, this.on_theme_dark));
        this._menu.addAction(_("Set theme to 'Light'"), Lang.bind(this, this.on_theme_light));

        this.facts = new FactStore();
        this.facts_reset();

        this.load_settings();
        this.on_theme_changed();
        this.on_data_changed();
    },

    load_settings: function() {
        this.settings = new Settings.DeskletSettings(this, this.metadata.uuid, this.desklet_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "enable_debug", "enable_debug", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "delay", "setting_delay", this.on_settings_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "configuration_delay", "configuration_delay", this.on_settings_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "show_updated", "setting_show_updated", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "show_actual_updated", "setting_show_actual_updated", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "reserve_status", "setting_reserve_status", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'hide_decorations', 'hide_decorations', this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "set_width", "setting_set_width", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "setting_width", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "set_height", "setting_set_height", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "setting_height", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "transparency", "setting_transparency", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "icon_size", "setting_icon_size", this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "theme", "setting_theme", this.on_theme_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "icons", "theme_icons", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font", "theme_font", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font_color", "theme_font_color", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font_color_header", "theme_font_color_header", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font_color_key", "theme_font_color_key", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font_color_normal", "theme_font_color_normal", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font_color_active", "theme_font_color_active", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "background_color", "theme_background_color", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "border_radius", "theme_border_radius", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "border_width", "theme_border_width", this.on_themeable_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "border_color", "theme_border_color", this.on_themeable_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "filter_enabled", "setting_filter_enabled", this.on_filter_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "filter_rules", "setting_filter_rules", this.on_filter_changed);
    
        this.settings.bindProperty(Settings.BindingDirection.IN, "suppress_header", "suppress_header", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "sensors_per_row", "sensors_per_row", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "sensor_type_per_row", "sensor_type_per_row", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "sensor_changed_duration", "sensor_changed_duration", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "threshold_changed_fans", "threshold_changed_fans", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "threshold_changed_temps", "threshold_changed_temps", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "threshold_changed_volts", "threshold_changed_volts", this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "include_fans", "include_fans", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "include_zero_fans", "include_zero_fans", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "include_temps", "include_temps", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "include_zero_temps", "include_zero_temps", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "include_volts", "include_volts", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "include_zero_volts", "include_zero_volts", this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "read_sensors_expiration", "read_sensors_expiration", this.on_settings_changed);

        this.load_filter_settings();
        this.toggle_decorations();
    },

    load_filter_settings: function() {
    },
    
    /* More or less copied straight from "commandResult@ZimiZones" as it works
     * as expected.
     */
    get_css_font(selected_font) {
        let names = [];
        let names_tmp;
        let font_parts = selected_font.split(" ");
        let size = font_parts.pop();
        let style = "";
        let weight = "";
        let default_font = "";

        names.push(font_parts.join(" ").replace(/,/g, " "));

        names_tmp = [];
        ["italic", "oblique"].forEach(function(item, i) {
            names.forEach(function(item2, i2) {
                if (item2.toLowerCase().includes(item)) {
                    if (style === "") {
                        style = item;
                    }
                    names_tmp.push(item2.replace(new RegExp(item, "ig"), "").trim());
                }
            });
        });

        names_tmp.forEach(function(item, i) {
            names.push(item);
        });

        names_tmp = [];
        [
            { weight: "100", names: ["ultra-light", "extra-light"] }, 
            { weight: "200", names: ["light", "thin"] }, 
            { weight: "300", names: ["book", "demi"] },
            { weight: "400", names: ["normal", "regular"] },
            { weight: "500", names: ["medium"] },
            { weight: "600", names: ["semibold", "demibold"] },
            { weight: "900", names: ["extra-black", "fat", "poster", "ultra-black"] },
            { weight: "800", names: ["black", "extra-bold", "heavy"] },
            { weight: "700", names: ["bold"] }
        ].forEach(function(item, i) {
            item.names.forEach(function(item2, i2) {
                names.forEach(function(item3, i3) {        
                    if (item3.toLowerCase().includes(item2)) {
                        if (weight === "") {
                            weight = item.weight;
                        }
                        names_tmp.push(item3.replace(new RegExp(item2, "ig"), "").trim());
                    }
                });
            });
        });

        names_tmp.forEach(function(item, i) {
            names.push(item);
        });

        [            
            { generic: "monospace", names: ["mono", "console"] }, 
            { generic: "cursive", names: ["brush", "script", "calligraphy", "handwriting"] }, 
            { generic: "sans-serif", names: ["sans"] },
            { generic: "serif", names: ["lucida"] }
        ].forEach(function(item, i) {
            item.names.forEach(function(item2, i2) {
                names.forEach(function(item3, i3) {        
                    if (item3.toLowerCase().includes(item2)) {
                        if (default_font === "") {
                            default_font = item.generic;
                        }
                    }
                });
            });
        });

        if (default_font === "") {
            default_font = "monospace";
        }

        names_tmp = [];
        names.forEach(function(item, i) {        
            names_tmp.push("\"" + item + "\"");
        });
        names = names_tmp;
        names.push(default_font);
        
        return { names, size, style, weight };
    },

    get_css_color(color, transparency) {
        return color.replace(")", "," + (1.0 - transparency) + ")").replace("rgb", "rgba");
    },

    on_filter_changed: function() {
        this.on_display_changed();
    },

    on_display_changed: function() {
        this.set_display();
        this.toggle_decorations();
        this.render();
    },

    set_display: function() {
        try {
            let font_properties = this.get_css_font(this.get_themeable("theme_font"));
            if (this.main_box) {
                this.main_box.style = 
                    (font_properties.names.length === 0 ? "" : ("font-family: " + font_properties.names.join(", ") + ";\n")) + 
                    (font_properties.size === "" ? "" : ("font-size: " + font_properties.size + "px;\n")) +
                    (font_properties.style === "" ? "" : ("font-style: " + font_properties.style + ";\n")) +
                    (font_properties.weight === "" ? "" : ("font-weight: " + font_properties.weight + ";\n")) +
                    "color: " + this.get_themeable("theme_font_color") + ";\n" +
                    "background-color: " + this.get_css_color(this.get_themeable("theme_background_color"), this.setting_transparency) + ";\n" +
                    "border-width: " + this.get_themeable("theme_border_width") + "px;\n" +
                    "border-color: " + this.get_css_color(this.get_themeable("theme_border_color"), this.setting_transparency) + ";\n" +
                    "border-radius: " + this.get_themeable("theme_border_radius") + "px;\n" +
                    'box-shadow:0 0 15px 10px rgba(0,0,0,' + this.setting_transparency +');' + "\n" +
                    "padding: 5px 10px;";

                let x = -1;
                let y = -1;
                if (this.setting_set_width) x = this.setting_width;
                if (this.setting_set_height) y = this.setting_height;
                this.main_box.set_size(x, y);
            }
            this.toggle_decorations();
        } catch (error) {
            this.log_error(error);
        }
    },

    get_themeable: function(key) {
        if (this.setting_theme != "_custom") {
            if (this.theme_details && this.theme_details[key] != undefined ) {
                return this.theme_details[key];
            }
        }

        return this[key];
    },

    on_theme_print: function() {
        let current = {
            "theme_icons": this.theme_icons,
            "theme_font": this.theme_font,
            "theme_font_color": this.theme_font_color,
            "theme_font_color_header": this.theme_font_color_header,
            "theme_font_color_key": this.theme_font_color_key,
            "theme_font_color_normal": this.theme_font_color_normal,
            "theme_font_color_active": this.theme_font_color_active,
            "theme_background_color": this.theme_background_color,
            "theme_border_radius": this.theme_border_radius,
            "theme_border_width": this.theme_border_width,
            "theme_border_color": this.theme_border_color
        };
        this.log_debug_object(current);
    },

    on_themeable_changed: function() {
        if (this.setting_theme == "_custom") return;
        this.on_display_changed();
    },

    on_theme_changed: function() {
        this.theme_details = {};
        if (this.setting_theme != "_custom") {
            this.set_theme(this.setting_theme);
        }
        this.on_display_changed();
    },

    on_theme_dark: function() {
        this.setting_theme = "dark";
        this.on_theme_changed();
    },

    on_theme_light: function() {
        this.setting_theme = "light";
        this.on_theme_changed();
    },

    on_theme_custom: function() {
        this.setting_theme = "_custom";
        this.on_theme_changed();
    },

    on_copy_theme: function() {
        if (this.setting_theme != "_custom") {
            this.create_dialog(
                "Customize theme by copying it to 'Custom'?\n\n - Note that this will overwrite any previous customization.", 
                this.do_copy_theme
            );
        } else {
            this.create_message_box("Please select a theme first!");

        }
    },

    do_copy_theme: function() {
        let details = this.theme_details;
        if (!details) return;

        for (const key of Object.keys(details)) {
            if (!key.startsWith("theme_")) continue;
            this[key] = details[key];
        }
        this.setting_theme = "_custom";
    },

    create_dialog: function(message, callback) {
        let dialog = new ModalDialog.ModalDialog();
        let label = new St.Label({text: message});
        dialog.contentLayout.add(label);
        dialog.setButtons([
            {
                label: "OK",
                action: () => {
                    callback.call(this);
                    dialog.close();
                }
            },
            {
                label: "Cancel",
                action: () => {
                    dialog.close();
                }
            }
        ]);
        dialog.open();
    },

    create_message_box: function(message) {
        let dialog = new ModalDialog.ModalDialog();
        let label = new St.Label({text: message});
        dialog.contentLayout.add(label);
        dialog.setButtons([
            {
                label: "OK",
                action: () => {
                    dialog.close();
                }
            }
        ]);
        dialog.open();
    },

    set_theme: function(theme_name) {
        try {
            let theme = this.load_theme(theme_name);
            this.theme_details = {};
            for (const key of Object.keys(theme)) {
                if (!key.startsWith("theme_")) continue;
                this.theme_details[key] = theme[key];
            }

            if (!this.theme_details["theme_icons"]) this.theme_details["theme_icons"] = theme_name;
        } catch (error) {
            this.log_error("Load theme (" + theme_name + ") error:" + error);
        }
    },

    load_theme: function(theme_name) {
        return JSON.parse(
            this.get_file_contents(
                GLib.build_filenamev([
                    this.metadata.path, 
                    "themes", 
                    theme_name + ".json"
                ])
            )
        );
    },

    get_file_contents: function(path) {
        let result;

        const file = Gio.file_new_for_path(path);
        let [success, contents, tag] = file.load_contents(null);
        if (success) {
            let data = ByteArray.toString(contents);
            result = data.trim();
        }
        GLib.free(contents);

        return result;
    },

    toggle_decorations() {
        this.metadata['prevent-decorations'] = this.hide_decorations;
        this._updateDecoration();
    },

    on_settings_changed: function() {
        this.log_debug("on_settings_changed");
        this.facts_reset(this.configuration_delay);
        this.load_filter_settings();
        this.render();
    },

    on_data_changed: function() {
        if (this.facts.is_pending_update("delay_loading")) {
            try {
                // Start asynchronous tasks
                this.read_sensors();
            } catch (e) {
                this.log_error("Uncaught error in on_data_changed: " + e); 
                this.set_error("Uncaught error", { set_failing: "sensors.devices" });
            }
        }

        // Probably won't have data, but render what we do have
        this.render();

        // Set timer for next update
        this.set_timer();
    },

    read_sensors: function() {
        if (!this.facts.is_pending_update("sensors.devices")) return;
        this.log_debug("running read_sensors");

        try {
            let [success, child_pid, std_in, std_out, std_err] = GLib.spawn_async_with_pipes(
                null,
                ["/usr/bin/sensors", "-j"],
                null,
                GLib.SpawnFlags.DO_NOT_REAP_CHILD | GLib.SpawnFlags.LEAVE_DESCRIPTORS_OPEN,
                null
            );
            GLib.close(std_in);
            GLib.close(std_err);
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, child_pid, function(pid, wait_status, user_data) {
                GLib.spawn_close_pid(child_pid);
            });

            if (success) {
                let desklet_instance = this;
                let io_channel_std_out = GLib.IOChannel.unix_new(std_out);
                let tag_watch_std_out = GLib.io_add_watch(
                    io_channel_std_out, GLib.PRIORITY_DEFAULT,
                    GLib.IOCondition.IN | GLib.IOCondition.HUP,
                    function(channel, condition, data) {
                        if (condition != GLib.IOCondition.HUP) {
                            let [status, out] = channel.read_to_end();
                            let data = out.toString()

                            desklet_instance.parse_sensors(data);
                            desklet_instance.facts.set("last_updated", new Date(), desklet_instance.read_sensors_expiration);
                        }
                        GLib.source_remove(tag_watch_std_out);
                        channel.shutdown(true);
                    }
                );
            } else {
                this.set_error("Failed read_sensors", { set_failing: "sensors.devices" }, this.read_sensors_expiration);
            }
        } catch (error) {
            this.log_error("Failed read_sensors: " + error);
            this.set_error("Error processing sensors", { set_failing: "sensors.devices" }, this.read_sensors_expiration);
        }
    },

    parse_sensors: function(data) {
        try {
            let sensors = JSON.parse(data);
            let filtered_data = {};

            for (const chip_name of Object.keys(sensors)) {
                filtered_data[chip_name] = { fans: {}, temps: {}, volts: {} };

                for (const sensor_name of Object.keys(sensors[chip_name])) {
                    if (sensor_name == "Adapter") continue;

                    this.map_sensor(chip_name, sensor_name, sensors[chip_name][sensor_name], filtered_data);
                }
            }

            this.facts.set("sensors.devices", filtered_data, this.read_sensors_expiration);
        } catch (error) {
            this.log_error("Error parsing sensor data: " + error);
            this.facts.set_error("sensors.devices", error, this.read_sensors_expiration);
        }
    },

    map_sensor: function(chip_name, sensor_name, data, filtered_data) {
        let sensor_type = this.get_sensor_type(data);
        if (sensor_type) {
            let mapped = {};

            for (const input_key of Object.keys(data)) {
                let index = input_key.indexOf("_");
                let found_key = input_key.slice(index + 1);
                switch (found_key) {
                    case "input":
                    case "min":
                    case "max":
                    case "crit":
                    case "alarm":
                        mapped[found_key] = data[input_key];
                        break;

                    default:
                        this.log_debug("Unknown sensor key: " + found_key);
                        break;
                }
            }

            filtered_data[chip_name][sensor_type][sensor_name] = mapped;
        }
    },

    get_sensor_type: function(data) {
        for (const key of Object.keys(data)) {
            if (key.match(/^temp\d+_/)) {
                return "temps";
            }

            if (key.match(/^in\d+_/)) {
                return "volts";
            }

            if (key.match(/^fan\d+_/)) {
                return "fans";
            }
        }

        return undefined;
    },

    set_timer: function() {
        this.timeout = Mainloop.timeout_add_seconds(this.setting_delay, Lang.bind(this, this.on_data_changed));
    },

    stop_timer: function() {
		Mainloop.source_remove(this.timeout);
    },

    render: function() {
        this.unrender();

        this.main_box = new St.BoxLayout({
            vertical: true,
            style_class: "sensors",
            y_expand: true
        });
        this.set_display();

        const list = new DataView(this.desklet_id, this);
        this.main_box.add(list.render());

        this.add_status_label(this.main_box);
        this.setContent(this.main_box);
    },

    on_desklet_removed: function() {
        this.log_debug("on_desklet_removed");
		Mainloop.source_remove(this.timeout);
        this.unrender();
    },

    unrender: function() {
        if (this.main_box) {
            this.main_box.destroy_all_children()
            this.main_box.destroy();
        }
    },

    add_status_label: function(parent) {
        const label = new St.Label({
            text: "",
            style_class: "label-status"
        });

        let fact = this.get_status();
        if (fact) {
            label.text = fact.message;
            if (fact.level < this.status_level_info) {
                label.style_class = "label-error";
            }

            parent.add(label);
            return;
        }

        if (this.setting_show_updated) {
            fact = this.facts.get_any("last_updated");
            if (fact && this.setting_show_actual_updated) {
                label.text = "Updated " + fact.toLocaleTimeString();
                parent.add(label);
                return;
            }

            label.text = "Updated " + new Date().toLocaleTimeString();
            parent.add(label);
            return;
        }

        if (this.setting_reserve_status) {
            parent.add(label);
        }
    },

    log_debug: function(msg) {
        if (FORCE_DEBUG || this.enable_debug) {
            global.log(this.metadata.uuid + " [" + this.desklet_id + "] DEBUG " + msg);
        }
    },

    log_debug_object: function(object) {
        this.log_debug(JSON.stringify(object));
    },

    log_info: function(msg) {
        global.log(this.metadata.uuid + " [" + this.desklet_id + "] " + msg);
    },

    log_error: function(msg) {
        global.logError(this.metadata.uuid + " [" + this.desklet_id + "] " + msg);
    },

    get_status: function() {
        let fact = this.facts.get("status", true);

        if (fact && fact.clear_on) {
            if (this.facts.get(fact.clear_on, true)) {
                this.facts.unset("status");
                fact = undefined;
            }
        }

        return fact;
    },

    status_default_expiration: 10,
    status_level_error: 0,
    set_error: function(message, options = {}, expiration = this.status_default_expiration) {
        if (options["set_failing"]) {
            this.facts.set_error(options["set_failing"], true, expiration);
            options["clear_on"] = options["set_failing"];
            delete options["set_failing"];
        }

        this._set_status(message, 0, expiration, options);
    },

    status_level_info: 10,
    set_message: function(message, options = {}, expiration = this.status_default_expiration) {
        this._set_status(message, 10, expiration, options);
    },

    _set_status: function(message, level, expiration, options = {}) {
        options.message = message;
        options.level = level;

        let fact = this.facts.get("status", true);
        if (!fact || fact.level < level) {
            this.facts.set("status", options, expiration);
        }
    },

    facts_reset: function(delay_seconds = 0) {
        this.facts.reset();
        if (delay_seconds) {
            this.facts.set("delay_loading", delay_seconds, delay_seconds);
        }
        this.set_message("loading...", { clear_on: "sensors.devices" }, 5);
    }
}


function FactStore(grace_period = 10) {
    this.init(grace_period);
}

FactStore.prototype = {
    init: function(grace_period) {
        this.reset();
        this.grace_period = grace_period;
    },

    reset: function() {
        this.facts = {};
        this.errors = {};
    },

    debug: function() {
        var keys = Object.keys(this.facts);
        keys.sort();

        global.log("FactStore debug:");
        for (const key of keys) {
            global.log(key + ': ' + this.get(key));
        }
    },

    set: function(key, value, retention = -1) {
        this.set_data(this.facts, key, value, retention);
    },

    set_error: function(key, value = true, retention = -1) {
        this.set_data(this.errors, key, value, retention);
    },

    set_data: function(dictionary, key, value, retention = -1) {
        let expiration = Date.now();
        if (retention > 0) expiration = expiration + (retention * 1000);

        dictionary[key] = {
            value: value,
            valid: expiration
        }
    },

    /* Retrieves a named fact value, but aims to return values that's within
     * a window of validity. The FactStore itself allows a certain grace period
     * to avoid elements popping in and out, when such a period is not suitable
     * we can set direct = true to avoid this behavior.
     */
    get: function(key, direct = false) {
        if (this.is_valid(key, direct)) {
            return this.facts[key].value;
        }
        return undefined;
    },

    /* Get any data available, completely ignoring the question of validity. */
    get_any: function(key) {
        if (!this.facts) return undefined;
        return this.facts[key].value;
    },

    unset: function(key) {
        this.facts[key] = undefined;
    },

    is_valid: function(key, direct) {
        let grace_period = (direct ? 0 : this.grace_period);
        if (this.facts[key]) {
            if (this.before_time(this.facts[key].valid, grace_period)) {
                return true;
            }
        }

        return false;
    },

    /* We can apply a grace period to any facts stored, this was implemented
     * to allow rendering to work with slightly older values while silently
     * updating in the background.
     */
    before_time: function(timestamp, offset_seconds = 0) {
        return ((timestamp + (offset_seconds * 1000)) - Date.now()) > 0;
    },

    is_pending_update: function(key) {
        // Check if we should avoid update due to previous error
        if (this.errors[key] != undefined) {
            if (this.before_time(this.errors[key].valid)) {
                return false;
            }
        }

        // Check if we have data that can be considered valid
        if (this.facts[key]) {
            if (this.before_time(this.facts[key].valid)) {
                return false;
            }
        }

        return true;
    },
};


function DataView(desklet_id, parent) {
    this.init(desklet_id, parent);
}

DataView.prototype = {
    init: function(desklet_id, parent) {
        this.parent = parent;
    },

    render: function() {
        let container = new St.BoxLayout({
            vertical: true
        });

        let devices = this.parent.facts.get("sensors.devices");
        let should_render = this.filter_sensors(devices);

        if (devices && Object.keys(should_render).length == 0) {
            return this.render_text("No sensors to display...", container);
        }
        let chip_keys = Object.keys(should_render).sort();
        for (const chip_name of chip_keys) {
            let chip = should_render[chip_name];
            this.render_header(chip_name, container);

            let table_row = 0;
            let table_col = 0;
            let table = new St.Table( { homogeneous: true } );

            // Fans
            for (const sensor_name of Object.keys(chip.sensors.fans).sort()) {
                let sensor = chip.sensors.fans[sensor_name];
                table.add(this.render_fan(chip_name, sensor_name, sensor), { row: table_row, col: table_col });
                table_col++;
                if (table_col == this.parent.sensors_per_row) {
                    table_col = 0;
                    table_row++;
                }
            }
            if (this.parent.sensor_type_per_row) {
                if (table_col > 0 && table_col < this.parent.sensors_per_row) {
                    for (; table_col < this.parent.sensors_per_row; table_col++) {
                        table.add(this.render_blank(), { row: table_row, col: table_col });
                    }
                    table_row++;
                }
                table_col = 0;
            }

            // Temperature
            for (const sensor_name of Object.keys(chip.sensors.temps).sort()) {
                let sensor = chip.sensors.temps[sensor_name];
                table.add(this.render_temperature(chip_name, sensor_name, sensor), { row: table_row, col: table_col });
                table_col++;
                if (table_col == this.parent.sensors_per_row) {
                    table_col = 0;
                    table_row++;
                }
            }
            if (this.parent.sensor_type_per_row) {
                if (table_col > 0 && table_col < this.parent.sensors_per_row) {
                    for (; table_col < this.parent.sensors_per_row; table_col++) {
                        table.add(this.render_blank(), { row: table_row, col: table_col });
                    }
                    table_row++;
                }
                table_col = 0;
            }

            // Voltages
            for (const sensor_name of Object.keys(chip.sensors.volts).sort()) {
                let sensor = chip.sensors.volts[sensor_name];
                table.add(this.render_voltage(chip_name, sensor_name, sensor), { row: table_row, col: table_col });

                table_col++;
                if (table_col == this.parent.sensors_per_row) {
                    table_col = 0;
                    table_row++;
                }
            }

            // Fill out the rest of the table
            if (table_col > 0 && table_col < this.parent.sensors_per_row) {
                for (; table_col < this.parent.sensors_per_row; table_col++) {
                    table.add(this.render_blank(), { row: table_row, col: table_col });
                }
            }

            container.add(table);
        }

        return container;
    },

    filter_sensors: function(devices) {
        if (!devices) return {};

        let result = {};
        for (const chip_name of Object.keys(devices)) {
            if (!this.is_chip_enabled(chip_name)) continue;

            let chip = devices[chip_name];
            let sensors = { fans: {}, temps: {}, volts: {} };
            let sensor_count = 0;

            if (this.parent.include_fans) {
                for (const sensor_name of Object.keys(chip.fans)) {
                    if (!this.is_sensor_enabled(chip_name, sensor_name)) continue;
                    let sensor_display = this.get_sensor_displayname(chip_name, sensor_name);
                    let sensor = chip.fans[sensor_name];

                    if ((sensor.input == 0 && this.parent.include_zero_fans) || sensor.input > 0) {
                        sensor_count++;
                        sensors.fans[sensor_display] = Object.assign(
                            {}, 
                            sensor, 
                            {
                                display_name: sensor_display,
                                sensor_name: sensor_name
                            }
                        );
                    }
                }
            }

            if (this.parent.include_temps) {
                for (const sensor_name of Object.keys(chip.temps)) {
                    if (!this.is_sensor_enabled(chip_name, sensor_name)) continue;
                    let sensor_display = this.get_sensor_displayname(chip_name, sensor_name);
                    let sensor = chip.temps[sensor_name];

                    if ((sensor.input == 0 && this.parent.include_zero_temps) || sensor.input > 0) {
                        sensor_count++;
                        sensors.temps[sensor_display] = Object.assign(
                            {}, 
                            sensor, 
                            {
                                display_name: sensor_display,
                                sensor_name: sensor_name
                            }
                        );
                    }
                }
            }

            if (this.parent.include_volts) {
                for (const sensor_name of Object.keys(chip.volts)) {
                    if (!this.is_sensor_enabled(chip_name, sensor_name)) continue;
                    let sensor_display = this.get_sensor_displayname(chip_name, sensor_name);
                    let sensor = chip.volts[sensor_name];

                    if ((sensor.input == 0 && this.parent.include_zero_volts) || sensor.input > 0) {
                        sensor_count++;
                        sensors.volts[sensor_display] = Object.assign(
                            {}, 
                            sensor, 
                            {
                                display_name: sensor_display,
                                sensor_name: sensor_name
                            }
                        );
                    }
                }
            }

            if (sensor_count == 0) continue;
            this.filter_sensors_merge(chip_name, result, sensors);
        }

        return result;
    },

    /* Mainly in case the user reassigns the name of several chips so that they
     * share a common name, just need to ensure that we don't have overlapping
     * sensor name - this is accomplished by assuming that the user knows what
     * they're doing :-D
     */
    filter_sensors_merge: function(chip_name, result, sensors) {
        let chip_display = this.get_chip_displayname(chip_name);
        if (result[chip_display] == undefined) {
            result[chip_display] = {
                chip_name: [chip_name],
                display_name: chip_display,
                sensors: sensors
            };
        } else {
            result[chip_display].sensors = {
                chip_name: result[chip_display].chip_name.concat([chip_name]),
                fans: Object.assign({}, result[chip_display].sensors.fans, sensors.fans),
                temps: Object.assign({}, result[chip_display].sensors.temps, sensors.temps),
                volts: Object.assign({}, result[chip_display].sensors.volts, sensors.volts)
            }
        }
    },

    get_chip_displayname: function(chip_name) {
        if (!this.parent.setting_filter_enabled) return chip_name;

        for (let input_rule of this.parent.setting_filter_rules.split("\n")) {
            let [is_rename, rule, value] = this.parse_rename_rule(input_rule);
            if (!is_rename || rule == undefined) continue;
            if (!value) continue;

            if (rule.indexOf(":") > -1) continue;
            if (this.check_rule_matches(rule, chip_name) && value) {
                return value;
            }
        }

        return chip_name;
    },

    get_sensor_displayname: function(chip_name, sensor_name) {
        if (!this.parent.setting_filter_enabled) return sensor_name;

        for (let input_rule of this.parent.setting_filter_rules.split("\n")) {
            let [is_rename, rule, value] = this.parse_rename_rule(input_rule);
            if (!is_rename || rule == undefined) continue;
            if (!value) continue;

            // Detect chip rules
            let index = rule.indexOf(":");
            if (index < 0) continue;

            let chip_part = rule.slice(0, index);
            if (!this.check_rule_matches(chip_part, chip_name)) continue;

            let sensor_part = rule.slice(index + 1);
            if (!this.check_rule_matches(sensor_part, sensor_name)) continue;
            return value;
        }

        return sensor_name;
    },

    parse_rename_rule: function(rule) {
        let is_rename = false;
        let value = undefined;
        rule = rule.trim();

        let index = rule.indexOf("=");
        if (rule[0] == "$" && index > -1) {
            value = rule.slice(index + 1);
            rule = rule.slice(1, index);
            is_rename = true;
        } else {
            rule = undefined;
        }

        return [is_rename, rule, value];
    },

    /* Rules are processed in the order they are written, and while it's
     * probably easier to use a catch-all '*' as the very last entry - you also
     * have the option to explicitly list the ones you want. Sensors are
     * processed separately, but naturally won't be included if the chip isn't
     * considered to be enabled. Negative matches can be added with '!' at the
     * start, this would remove any chips matched (as long as it is encountered
     * BEFORE any catch-all statements).
     */
    is_chip_enabled: function(chip_name) {
        if (!this.parent.setting_filter_enabled) return true;

        for (let input_rule of this.parent.setting_filter_rules.split("\n")) {
            let [is_negative, rule] = this.parse_rule(input_rule);
            if (!rule) continue;

            // Skip sensor rules
            if (rule.indexOf(":") > -1) continue;

            if (this.check_rule_matches(rule, chip_name)) {
                if (is_negative) {
                    return false;
                }
                return true;
            }
        }

        return false;
    },

    /* Functions in the same manner as is_chip_enabled, except now we're
     * matching sensor rules specified with the format: chip_rule:sensor_rule
     *
     * The main difference is that we can't match sensors to chips already
     * ruled out earlier in is_chip_enabled. Note that with the use of a
     * negative sensor statement, there's an implicit 'chip_name:*' in the
     * way they are processed (this keeps the other sensors from disappearing
     * when attempting to remove a specific sensor).
     */
    is_sensor_enabled: function(chip_name, sensor_name) {
        if (!this.parent.setting_filter_enabled) return true;
        let matched_chip = false;

        for (let input_rule of this.parent.setting_filter_rules.split("\n")) {
            let [is_negative, rule] = this.parse_rule(input_rule);
            if (!rule) continue;

            // Match all sensors
            if (rule == "*:*") return true;

            // Detect chip rules
            let index = rule.indexOf(":");
            if (index < 0) continue;

            let chip_part = rule.slice(0, index);
            let sensor_part = rule.slice(index + 1);

            // Don't want to apply a negative rule all over the place
            if (is_negative && chip_part == "*") continue;

            // Skip if we can't match the chip
            if (!this.check_rule_matches(chip_part, chip_name)) continue;
            matched_chip = true;

            if (this.check_rule_matches(sensor_part, sensor_name)) {
                if (is_negative) {
                    return false;
                }
                return true;
            }
        }
        
        if (matched_chip) return true; // does this work?
        return false;
    },

    parse_rule: function(rule) {
        let negative = false;
        rule = rule.trim();

        // Rule is there to explicitly remove something
        if (rule[0] == "!") {
            rule = rule.slice(1);
            negative = true;
        }

        // Filter commented lines
        if ([ "$", ";", "#" ].includes(rule[0])) {
            rule = undefined;
        }

        return [negative, rule];
    },

    check_rule_matches: function(rule, name) {
        // Match all
        if (rule == "*") return true;

        // Match one
        if (rule == name) return true;

        // Match string starting with
        let index = rule.indexOf("*");
        if (index > -1 && name.startsWith(rule.slice(0, index))) return true;

        return false;
    },

    render_blank: function() {
        return new St.Label({ text: "" });
    },

    render_fan: function(chip_name, sensor_name, details) {
        let description = details.input + " RPM";
        return this.render_sensor(chip_name, "fans", sensor_name, details.input, description, "fan");
    },

    render_temperature: function(chip_name, sensor_name, details) {
        let description = details.input;
        if (description != 0) {
            description = details.input.toFixed(1) + "°C";
        } else {
            description = "-";
        }

        return this.render_sensor(chip_name, "temps", sensor_name, details.input, description, "temperature_medium");
    },

    render_voltage: function(chip_name, sensor_name, details) {
        let description = details.input;
        if (description != 0) {
            description = details.input.toFixed(1);
        }
        description = description + "V";

        return this.render_sensor(chip_name, "volts", sensor_name, details.input, description, "volt");
    },

    render_sensor: function(chip_name, sensor_type, sensor_name, sensor_value, description, icon_name) {
        let is_active = this.get_sensor_active(chip_name, sensor_type, sensor_name, sensor_value);

        let box = new St.BoxLayout( { vertical: false, y_align: St.Align.MIDDLE } );
        box.add_actor( this.get_sensor_icon(is_active, icon_name) );

        let text_box = new St.BoxLayout({ vertical: true });
        text_box.add(new St.Label({ text: sensor_name + ": ", style_class: "sensor_name", style: this.get_key_style(is_active) }), { expand: true });
        text_box.add(new St.Label({ text: description, style_class: "sensor_value", style: this.get_value_style(is_active) }), { expand: true });
        box.add(text_box);

        return box;
    },

    get_sensor_active: function(chip_name, sensor_type, sensor_name, sensor_value) {
        let key = "sensors." + chip_name + "." + sensor_name;

        let previous = this.parent.facts.get(key);
        if (previous == undefined) {
            this.parent.facts.set(key, sensor_value, this.parent.read_sensors_expiration);
            return false;
        }

        if (this.check_difference_exceeded(key, sensor_type, sensor_name, sensor_value, previous)) {
            return true;
        }

        return false;
    },

    check_difference_exceeded: function(key, sensor_type, sensor_name, sensor_value, previous) {
        const key_duration = key + ".sticky";
        if (sensor_value === previous) return this.parent.facts.is_valid(key_duration, true);

        let limit = this.get_sensor_changed_threshold(sensor_type);
        if (limit < 0) return false;

        this.parent.facts.set(key, sensor_value, this.parent.read_sensors_expiration);
        const difference = Math.abs(sensor_value - previous);
        if (difference > limit) {
            this.parent.facts.set(key_duration, sensor_value, this.parent.sensor_changed_duration);
            this.parent.log_debug(sensor_name + ": " + previous + " -> " + sensor_value + " (" + difference.toFixed(1) + ")");
            return true;
        }

        return this.parent.facts.is_valid(key_duration, true);
    },

    get_sensor_changed_threshold: function(sensor_type) {
        switch (sensor_type) {
            case "fans":
                return this.parent.threshold_changed_fans;
            case "temps":
                return this.parent.threshold_changed_temps;
            case "volts":
                return this.parent.threshold_changed_volts;
        }

        return -1;
    },

    get_sensor_icon: function(is_active, icon_name) {
        let path_segments = [ this.parent.metadata.path, "themes" ];
        path_segments.push(this.parent.get_themeable("theme_icons"));

        if (is_active) path_segments.push("active_" + icon_name + ".svg");
        else  path_segments.push("inactive_" + icon_name + ".svg");
        let path = GLib.build_filenamev(path_segments);

        return new St.Icon({
            gicon: new Gio.FileIcon({
                    file: Gio.file_new_for_path(path)
            }),
            icon_size: this.parent.setting_icon_size,
            icon_type: St.IconType.SYMBOLIC,
            style_class: "sensor_icon"
        });
    },

    get_key_style: function(is_active) {
        if (is_active) return this.get_text_style("theme_font_color_active");
        return this.get_text_style("theme_font_color_key");
    },

    get_value_style: function(is_active) {
        if (is_active) return this.get_text_style("theme_font_color_active");
        return this.get_text_style("theme_font_color_normal");
    },

    get_text_style: function(themeable) {
        let result = this.parent.get_themeable(themeable);
        if (result) return "color: " + result + ";\n";
        return undefined;
    },

    render_header: function(title, container) {
        if (!this.parent.suppress_header) {
            container.add(new St.Label({ text: title, style_class: "label-title", style: this.get_text_style("theme_font_color_header") }), { expand: true });
        }
    },

    render_text: function(description, container) {
        container.add(new St.Label({ text: description, style: this.get_text_style("theme_font_color") }), { expand: true });
        return container;
    }
}



function main(metadata, desklet_id) {
    return new SensorsDesklet(metadata, desklet_id);
}