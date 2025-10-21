# Sensors Desklet

When building up a new stationary computer I needed a way to observe system temperatures, voltages and fan RPMs. While there are plenty of applications available that will provide that information in a far more detailed manner, I wanted something that would simply live on the desktop and only light when there are relevant changes. The information is provided by *lm_sensors*, a package that needs to be installed and functioning for the Desklet to display anything relevant.

![Screenshot](/sensors@tebl/screenshot.png)

### Who is it for?

* People who want to have sensors-information available at a glance without running a dedicated application.

### Customization

You can use the themes provided, or create your own by selecting "Custom" instead of one of the provided themes. This allows you to customize colors, fonts etc.

### Usage

The desklet should function by itself from the point that it is added, but without configuration it would more sensors than you'd actually want. For that reason, it is recommended that you start by right-clicking on hit to configure it. On the filter-tab you can set up rules to specifiy which sensors you're interested in, more on that below.

#### Filter rules
The desklet by default updates every second by default, this takes care of rendering the screen as well as evaluating which information gathering tasks are currently pending. This includes tasks such as actually running the sensors-command to gather sensor telemetry, but how often we do so is configurable in the tuning-section so that you can individually set how often such processes will be run.

Within the filter-section, you can opt to filter out certain types of sensors - *lm_sensors* to the best of my knowledge, includes sensors for temperature, fan speed and voltage. You will however find that *lm_sensors* include sensors from many sources, not all of them relevant - and you'll want the ability to perform some filtering. A simplified scheme for this has been included, and here's what the default ruleset may look like:
```
# Chip rules:
!ignored_chip*
*

# Sensor rules:
!other_chip:faulty_sensor*
*:*
```
While initially a bit confusing, the format becomes a bit clearer once you realize that there's two sets of lists - the first one only applies to what *lm_sensors* consider a *chip* (for us old Windows-dwellers it's what we would have referred to as a driver), the second lists rules that apply to specific sensors. A rule matching such a *chip* can either be written out to match the complete name, or only the first part of it by the use of a single asterisk ('*'). When writing a rule to match a specific sensor we first need to match the chip it applies to, therefore the rule has two sections with a colon (':') between the two. Both sections of the rule follow the same format.

Any rule can also negate certain entries by adding an exclamation point ('!') to the start of it, this allows you to remove specific *chips* you're not interested in. This also is relevant for sensors so that you can remove malfunctioning sensors. A common cause of such sensors is due to a hardware controller supporting the existance of such a sensor, but the actual physical sensor does not exist. Note that while a sensors can't be matched in any way if the chip isn't matched for inclusion. 

As for actually writing the rules, you can write them to include everything by adding a catch-all as the last rule for *chips* and *sensors*, '*' or '*:*' respectively. You would then add negation matches above that, filtering out everything you do not want - one by one. On the plus-side, this allows any newly supported sensors to be picked up by the desklet as these become available. Alternatively you opt out of that, only explicitly including *chips* as needed - you'll also need to add relevant sensor rules for it.

Included below is the ruleset I'm currently using with a common *AMD B650 AM5* motherboard:
```
# Chip rules:
!nvme*
!amd*
!k10*
!mt7921*
!r8169*
*

# Sensor rules:
!nct*:Pump Fan
!nct*:System Fan #5
!nct*:System Fan #6
!nct*:PCIe*
!amd*:vdd*
*:*
```

#### Sensor changes
While *lm_sensors* include terms such as *maximum*, *minimum*, *alarm* etc I don't really know how relevant these are for an average desktop user, so I'm ignoring them. Instead the desklet tries to watch sensors in order to determine which of them appear to be changing between changes in the sensor data, such sensors will be highlighted on the desklet. As there is naturally some inaccuracies in the values returned for a sensor, a sensor needs to have changed **more** than the configured threshold in order to be counted as changing.

Finding the *sweet spot* between what you'd consider *relevant* or just plain *noise* will take some tuning. The recommended way is to set the threshold slider to a low level before gradually turning it up until it stops highlighting on small fluctuations.

#### A warning about lm_sensors
While *lm_sensors* is a package that is available and depended upon by most distributions, it's a project that has absolutely zero active developers. This haven't changed for 5 years by the time of writing this. So why is everyone using it?

Because it works, and currently there's **no real alternative**.

Why shouldn't everyone use it? Because it's not updated. As a result of that, it doesn't support any new hardware that've been sold since the last developer left the project. On the other hand there are still people writing code so that *lm_sensors* can work with that hardware.

For my "AMD AM5 B650"-motherboard mentioned elsewhere, a quick search pointed to the fact that my specific MSI-branded motherboard uses the *Nuvoton 6687-R*, requiring the installation of and extra kernel module - [NCT6687D](https://github.com/Fred78290/nct6687d). This is how I solved this particular problem for my machine, beyond offering my experience with that machine I can't offer you any additional assistance on how to setup *lm_sensors* relating to your specific hardware.

### What can be improved?

* No attempt at translation have been made.
* Use icons instead of unicode symbols because some fonts likes to make them tiny compared to the text.+

