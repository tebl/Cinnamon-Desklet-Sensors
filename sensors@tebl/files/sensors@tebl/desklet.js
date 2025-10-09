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

const icons = { box_checked: "\u2611", box_crossed: "\u2612", box_empty: "\u2610", update: "\u27F3", degrees: "\u2103" };

const DESKLET_UUID = "gpu-modules@teblify";
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

        this.settings.bindProperty(Settings.BindingDirection.IN, "enable_debug", "enable_debug", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_version", "enable_version", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_loadavg", "enable_loadavg", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_ram", "enable_ram", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_modules", "enable_modules", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_module_report", "enable_module_report", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "video_blacklisted", "setting_video_blacklisted", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "video_expected", "setting_video_expected", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "extra_modules_required", "setting_extra_modules", this.on_settings_changed);

        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_amd", "enable_amd", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_amd_gpu", "enable_amd_gpu", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_amd_ram", "enable_amd_ram", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_amd_temperature", "enable_amd_temperature", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_nvidia", "enable_nvidia", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_nvidia_driver", "enable_nvidia_driver", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_nvidia_gpu", "enable_nvidia_gpu", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_nvidia_ram", "enable_nvidia_ram", this.on_display_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "enable_nvidia_temperature", "enable_nvidia_temperature", this.on_display_changed);

        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_proc_loadavg_expiration", "read_proc_loadavg_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_proc_meminfo_expiration", "read_proc_meminfo_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_proc_modules_expiration", "read_proc_modules_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_proc_version_expiration", "read_proc_version_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_nvidia_count_expiration", "read_nvidia_count_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "get_nvidia_query_expiration", "get_nvidia_query_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_amd_count_expiration", "read_amd_count_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "get_amd_name_expiration", "get_amd_name_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "get_amd_query_expiration", "get_amd_query_expiration", this.on_settings_changed);
        // this.settings.bindProperty(Settings.BindingDirection.IN, "read_amd_temperature_expiration", "read_amd_temperature_expiration", this.on_settings_changed);

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
            this.toggle_decorations();
        } catch (error) {
            this.log_error(error);
        }

        let x = -1;
        let y = -1;
        if (this.setting_set_width) x = this.setting_width;
        if (this.setting_set_height) y = this.setting_height;
        this.main_box.set_size(x, y);
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

                // this.read_proc_loadavg();
                // this.read_proc_version();
                // this.read_proc_modules();
                // this.read_proc_meminfo();
                // this.read_nvidia_count();
                // this.read_nvidia_update();
                // this.read_amd_count();
                // this.read_amd_names();
                // this.read_amd_update();
                // this.read_amd_temperature();
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
        // if (!this.enable_modules) return;
        // if (!this.enable_nvidia) return;
        // if (!this.facts.get("video.nvidia_modeset")) return;
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
                            // desklet_instance.log_error(data);
                            // for (const entry of data) {
                            // let devices = {};
                            desklet_instance.parse_sensors(data);
                            // }

                            // desklet_instance.facts.set("nvidia.devices", devices, desklet_instance.read_nvidia_count_expiration);
                        }
                        GLib.source_remove(tag_watch_std_out);
                        channel.shutdown(true);
                    }
                );
            }
        } catch (error) {
            this.log_error("Failed read_nvidia_count: " + error);
            this.set_error("Error Nvidia GPU");
        }
    },

    parse_sensors: function(data) {
        this.log_error(data);
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
        this.facts.set("status", { level: 0, message: message }, this.status_expiration);
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
        this.facts = {};
        this.grace_period = grace_period;
    },

    reset: function() {
        this.facts = {};
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
        let expiration = Date.now();
        if (retention > 0) expiration = expiration + (retention * 1000);

        this.facts[key] = {
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

        this.render_line("test", "test", container);

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

    render_module: function(module, details, container) {
        let box = new St.BoxLayout( { vertical: false } );

        box.add(this.create_cell_icon(module, details), {
            expand: false
        });
        box.add(this.create_cell_name(module, details), {
            expand: true
        });

        container.add(box, { });
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