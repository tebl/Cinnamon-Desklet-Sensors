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
        this.settings.bindProperty(Settings.BindingDirection.IN, "border-width", "setting_border_width", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "border-color", "setting_border_color", this.on_display_changed);

        this.settings.bindProperty(Settings.BindingDirection.IN, "sensors_per_row", "sensors_per_row", this.on_display_changed);
        this.settings.bindProperty(Settings.BindingDirection.IN, "sensor_type_per_row", "sensor_type_per_row", this.on_display_changed);

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

    // format_memory_sizes: [
    //     [ "KB", 1024 ],
    //     [ "MB", 1024*1024 ],
    //     [ "GB", 1024*1024*1024 ],
    //     [ "TB", 1024*1024*1024*1024 ]
    // ],
    // format_memory_usage: function(bytes_used, bytes_total) {
    //     let set_unit = "B";
    //     let set_divider = "1";

    //     for (const [test_unit, test_divider] of this.format_memory_sizes) {
    //         if ((bytes_total/test_divider) > 1) {
    //             set_unit = test_unit;
    //             set_divider = test_divider;
    //         }
    //     }

    //     let percent = Math.round((bytes_used * 100) / bytes_total);
    //     return percent + "% (" + this.format_memory_unit(bytes_used, set_unit, set_divider) + "/" + this.format_memory_unit(bytes_total, set_unit, set_divider, true) + ")";
    // },

    // format_memory_unit: function(value, set_unit, set_divider, squash_point_zero = false) {
    //     let number = value / set_divider;
    //     let decimals = 1;
    //     if ((Math.round(number) * set_divider) == value && squash_point_zero) decimals = 0;
    //     return number.toFixed(decimals) + " " + set_unit;
    // },

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

        this.status_label(this.main_box);
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

    status_label: function(parent) {
        const label = new St.Label({
            text: "",
            style_class: "label-status"
        });

        let fact = this.facts.get("status", true);
        if (fact) {
            label.text = fact.message;
            if (fact.level < 10) {
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

    status_expiration: 10,
    set_error: function(message, expiration = this.status_expiration) {
        this.facts.set("status", { level: 0, message: message }, expiration);
    },

    set_message: function(message, expiration = this.status_expiration) {
        let fact = this.facts.get("status", true);
        if (!fact || fact.level < level) {
            this.facts.set("status", { level: 10, message: message }, expiration);
        }
    },

    facts_reset: function(delay_seconds = 0) {
        this.facts.reset();
        if (delay_seconds) {
            this.facts.set("delay_loading", delay_seconds, delay_seconds);
        }
        this.set_message("loading...", 5);
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
        if (devices) {
            for (const chip_name of Object.keys(devices)) {
                let chip = devices[chip_name];
                this.render_header(chip_name, container);

                let table_row = 0;
                let table_col = 0;

                let table = new St.Table( {homogeneous: true} );
                for (const sensor_name of Object.keys(chip.fans).sort()) {
                    table.add(this.render_fan(sensor_name, chip.fans[sensor_name]), { row: table_row, col: table_col });

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
                

                for (const sensor_name of Object.keys(chip.temps).sort()) {
                    table.add(this.render_temperature(sensor_name, chip.temps[sensor_name]), { row: table_row, col: table_col });

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


                for (const sensor_name of Object.keys(chip.volts).sort()) {
                    table.add(this.render_voltage(sensor_name, chip.volts[sensor_name]), { row: table_row, col: table_col });

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
        }

        return container;
    },

    render_fact: function(description, key, container) {
        let value = this.parent.facts.get(key);
        if (value) {
            this.render_line(description, value, container);
        }
    },

    render_line: function(description, value, container) {
        let box = new St.BoxLayout( { vertical: false } );

        box.add(new St.Label({ text: description + ": ", style_class: "fact-description" }), { expand: false });
        box.add(new St.Label({ text: value, style_class: "fact-value" }), { expand: true });

        container.add(box, { });
    },

    render_blank: function() {
        return new St.Label({ text: "" });
    },

    render_fan: function(sensor_name, details) {
        return this.render_sensor(sensor_name, details.input + " RPM", "fan");
    },

    render_temperature: function(sensor_name, details) {
        let value = details.input;
        if (value != 0) {
            value = details.input.toFixed(1) + icons.degrees_c;
        } else {
            value = "-";
        }

        return this.render_sensor(sensor_name, value, "temperature-medium");
    },

    render_voltage: function(sensor_name, details) {
        let value = details.input;
        if (value != 0) {
            value = details.input.toFixed(1);
        }

        return this.render_sensor(sensor_name, value + "V", "volt");
    },

    render_sensor: function(sensor_name, sensor_value, icon_name) {
        let box = new St.BoxLayout( { vertical: false, y_align: St.Align.MIDDLE } );

        let path = GLib.build_filenamev([ DESKLET_DIR, "img", icon_name + ".svg" ]);
        let icon = Gio.file_new_for_path( path );
        let gicon = new Gio.FileIcon({ file: icon });
        box.add_actor(
            new St.Icon({
                gicon: gicon, icon_size: 32, icon_type: St.IconType.SYMBOLIC, style: "margin-right: 10px"
            })
        );

        let text_box = new St.BoxLayout({ vertical: true });
        text_box.add(new St.Label({ text: sensor_name + ": ", style_class: "sensor_name" }), { expand: true });
        text_box.add(new St.Label({ text: sensor_value, style_class: "sensor_value" }), { expand: true });
        box.add(text_box);

        return box;
    },

    create_cell_icon: function(module, details) {
        let label = new St.Label({
            style_class: "label-icon",
            style: "margin-left: 10px;"
        });

        switch (details.status) {
            case "OK": 
                label.text = icons.box_checked; 
                break;
            case "BLOCK": 
                label.text = icons.box_crossed; 
                break;
            case "FOUND":
                label.text = icons.box_empty;
                break;
            case "MISSING":
            default:
                label.text = icons.box_crossed;
                break;
        }

        return label;
    },

    create_cell_name: function(module, details) {
        return new St.Label({
            text: module,
            style_class: "label-modules-" + module.replace('_', '-')
        });
    },

    render_header: function(title, container) {
        let box = new St.BoxLayout( { vertical: false } );

        box.add(new St.Label({ text: title, style_class: "label-title" }), { expand: true });

        container.add(box, { });
    }
}



function main(metadata, desklet_id) {
    return new SensorsDesklet(metadata, desklet_id);
}