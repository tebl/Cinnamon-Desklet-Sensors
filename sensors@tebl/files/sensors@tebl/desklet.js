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

const icons = { update: "\u27F3", degrees_c: "\u2103" };

// const DESKLET_UUID = "sensors@tebl";
const DESKLET_UUID = "devtest-sensors@tebl";
const HOME_DIR = GLib.get_home_dir();
const DESKLET_DIR = HOME_DIR + "/.local/share/cinnamon/desklets/" + DESKLET_UUID;
const FORCE_DEBUG = Gio.file_new_for_path(DESKLET_DIR + "/DEBUG").query_exists(null);

function SensorsDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

SensorsDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
        this.log_debug("Initializing");
        this.setHeader(metadata.name);

        this.video_blacklisted = [];
        this.video_expected = [];
        this.extra_modules = [];

        this.facts = new FactStore();
        this.facts_reset();

        this.load_settings();
        this.on_data_changed();
    },

    load_settings: function() {
        this.settings = new Settings.DeskletSettings(this, this.metadata.uuid, this.id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "delay", "setting_delay", this.on_settings_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "configuration_delay", "configuration_delay", this.on_settings_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "show_updated", "setting_show_updated", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "show_actual_updated", "setting_show_actual_updated", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "reserve_status", "setting_reserve_status", this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "set_width", "setting_set_width", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "setting_width", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "set_height", "setting_set_height", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "setting_height", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'hide-decorations', 'hide_decorations', this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font", "setting_font", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "font-color", "setting_font_color", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "background-color", "setting_background_color", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "background-transparency", "setting_background_transparency", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "icon-theme", "setting_icon_theme", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "icon-size", "setting_icon_size", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "border-width", "setting_border_width", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "border-color", "setting_border_color", this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "filter_enabled", "setting_filter_enabled", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "filter_rules", "setting_filter_rules", this.on_display_changed);
    
        this.settings.bindProperty(Settings.BindingDirection.IN, "suppress_header", "suppress_header", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "sensors_per_row", "sensors_per_row", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "sensor_type_per_row", "sensor_type_per_row", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "color_sensor_normal", "color_sensor_normal", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "color_sensor_changed", "color_sensor_changed", this.on_display_changed);
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

        this.settings.bindProperty(Settings.BindingDirection.IN, "enable_debug", "enable_debug", this.on_display_changed);
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

    on_display_changed: function() {
        this.set_display();
        this.toggle_decorations();
        this.render();
    },

    set_display: function() {
        try {
            let font_properties = this.get_css_font(this.setting_font);
            if (this.main_box) {
                this.main_box.style = 
                    (font_properties.names.length === 0 ? "" : ("font-family: " + font_properties.names.join(", ") + ";\n")) + 
                    (font_properties.size === "" ? "" : ("font-size: " + font_properties.size + "px;\n")) +
                    (font_properties.style === "" ? "" : ("font-style: " + font_properties.style + ";\n")) +
                    (font_properties.weight === "" ? "" : ("font-weight: " + font_properties.weight + ";\n")) +
                    "color: " + this.setting_font_color + ";\n" +
                    "background-color: " + this.get_css_color(this.setting_background_color, this.setting_background_transparency) + ";\n" +
                    "border-width: " + this.setting_border_width + "px;\n" +
                    "border-color: " + this.get_css_color(this.setting_border_color, this.setting_background_transparency) + ";\n" +
                    "border-radius: 10pt;\n" +
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
                this.set_error("Uncaught error");
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
                this.facts.set_error("sensors.devices", true, this.read_sensors_expiration);
            }
        } catch (error) {
            this.log_error("Failed read_sensors: " + error);
            this.set_error("Error processing sensors", this.read_sensors_expiration);
            this.facts.set_error("sensors.devices", true, this.read_sensors_expiration);
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

        const list = new DataView(this.id, this);
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
            fact = this.facts.get("last_updated");
            if (fact) {
                if (!this.setting_show_actual_updated) fact = new Date();
                label.text = "Updated " + fact.toLocaleTimeString();

                parent.add(label);
                return;
            }
        }

        if (this.setting_reserve_status) {
            parent.add(label);
        }
    },

    log_debug: function(msg) {
        if (FORCE_DEBUG || this.enable_debug) {
            global.log(DESKLET_UUID + " [" + this.id + "] DEBUG " + msg);
        }
    },

    log_debug_object: function(object) {
        this.log_debug(JSON.stringify(object));
    },

    log_info: function(msg) {
        global.log(DESKLET_UUID + " [" + this.id + "] " + msg);
    },

    log_error: function(msg) {
        global.logError(DESKLET_UUID + " [" + this.id + "] " + msg);
    },

    status_default_expiration: 10,
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

    status_level_error: 0,
    set_error: function(message, options = {}, expiration = this.status_default_expiration) {
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

    get: function(key, direct = false) {
        if (this.is_valid(key, direct)) {
            return this.facts[key].value;
        }
        return undefined;
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
            this.parent.set_message("No sensors to display...", { clear_on: "sensor_data" });
            return container;
        } else {
            this.parent.facts.set("sensor_data", true, this.parent.setting_delay);
        }

        let chip_keys = Object.keys(should_render).sort();
        for (const chip_name of chip_keys) {
            let chip = devices[chip_name];
            this.render_header(chip_name, container);

            let table_row = 0;
            let table_col = 0;
            let table = new St.Table( {homogeneous: true} );

            // Fans
            for (const sensor_name of should_render[chip_name].fans.sort()) {
                let sensor_details = chip.fans[sensor_name];
                table.add(this.render_fan(chip_name, sensor_name, sensor_details), { row: table_row, col: table_col });
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
            for (const sensor_name of should_render[chip_name].temps.sort()) {
                let sensor_details = chip.temps[sensor_name];
                table.add(this.render_temperature(chip_name, sensor_name, sensor_details), { row: table_row, col: table_col });
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
            for (const sensor_name of should_render[chip_name].volts.sort()) {
                let sensor_details = chip.volts[sensor_name];
                table.add(this.render_voltage(chip_name, sensor_name, sensor_details), { row: table_row, col: table_col });

                table_col++;
                if (table_col == this.parent.sensors_per_row) {
                    table_col = 0;
                    table_row++;
                }
            }

            // // Fill out the rest of the table
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
            let sensors = { fans: [], temps: [], volts: [] };
            let sensor_count = 0;

            if (this.parent.include_fans) {
                for (const sensor_name of Object.keys(chip.fans).sort()) {
                    if (!this.is_sensor_enabled(chip_name, sensor_name)) continue;
                    let sensor = chip.fans[sensor_name];

                    if ((sensor.input == 0 && this.parent.include_zero_fans) || sensor.input > 0) {
                        sensor_count++;
                        sensors.fans.push(sensor_name);
                    }
                }
            }

            if (this.parent.include_temps) {
                for (const sensor_name of Object.keys(chip.temps).sort()) {
                    if (!this.is_sensor_enabled(chip_name, sensor_name)) continue;
                    let sensor = chip.temps[sensor_name];

                    if ((sensor.input == 0 && this.parent.include_zero_temps) || sensor.input > 0) {
                        sensor_count++;
                        sensors.temps.push(sensor_name);
                    }
                }
            }

            if (this.parent.include_volts) {
                for (const sensor_name of Object.keys(chip.volts).sort()) {
                    if (!this.is_sensor_enabled(chip_name, sensor_name)) continue;
                    let sensor = chip.volts[sensor_name];

                    if ((sensor.input == 0 && this.parent.include_zero_volts) || sensor.input > 0) {
                        sensor_count++;
                        sensors.volts.push(sensor_name);
                    }
                }
            }


            if (sensor_count > 0) {
                result[chip_name] = sensors;
            }
        }
        return result;
    },

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
                // this.parent.log_error(rule + " matches " + chip_name + "," + sensor_name + "")
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
        if ([ ";", "#" ].includes(rule[0])) {
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

    render_text: function(description) {
        return new St.Label({ text: description });
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
            description = details.input.toFixed(1) + icons.degrees_c;
        } else {
            description = "-";
        }

        return this.render_sensor(chip_name, "temps", sensor_name, details.input, description, "temperature-medium");
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
        let box = new St.BoxLayout( { vertical: false, y_align: St.Align.MIDDLE } );

        let path = GLib.build_filenamev([ DESKLET_DIR, "img", this.parent.setting_icon_theme, icon_name + ".svg" ]);
        let icon = Gio.file_new_for_path( path );
        let gicon = new Gio.FileIcon({ file: icon });
        box.add_actor(
            new St.Icon({
                gicon: gicon, icon_size: this.parent.setting_icon_size, icon_type: St.IconType.SYMBOLIC, style_class: "sensor_icon"
            })
        );

        let style = this.get_sensor_style(chip_name, sensor_type, sensor_name, sensor_value);

        let text_box = new St.BoxLayout({ vertical: true });
        text_box.add(new St.Label({ text: sensor_name + ": ", style_class: "sensor_name" }), { expand: true });
        text_box.add(new St.Label({ text: description, style_class: "sensor_value", style: style }), { expand: true });
        box.add(text_box);

        return box;
    },

    get_sensor_style: function(chip_name, sensor_type, sensor_name, sensor_value) {
        let key = "sensors." + chip_name + "." + sensor_name;

        let previous = this.parent.facts.get(key);
        if (previous == undefined) {
            this.parent.facts.set(key, sensor_value, this.parent.read_sensors_expiration);
            return "color: " + this.parent.color_sensor_normal;
        }

        if (this.check_difference_exceeded(key, sensor_type, sensor_name, sensor_value, previous)) {
            return "color: " + this.parent.color_sensor_changed;
        }

        return "color: " + this.parent.color_sensor_normal;
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

    render_header: function(title, container) {
        if (!this.parent.suppress_header) {
            container.add(new St.Label({ text: title, style_class: "label-title" }), { expand: true });
        }
    }
}



function main(metadata, desklet_id) {
    return new SensorsDesklet(metadata, desklet_id);
}