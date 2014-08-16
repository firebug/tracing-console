/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/lib/object",
    "fbtrace/lib/options",
],
function(FBTrace, Obj, Options) {

// ********************************************************************************************* //
// Constants

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var PrefService = Cc["@mozilla.org/preferences-service;1"];
var prefs = PrefService.getService(Ci.nsIPrefBranch);
var prefService = PrefService.getService(Ci.nsIPrefService);

var reDBG = /extensions\.([^\.]*)\.(DBG_.*)/;

// ********************************************************************************************* //
// TraceOptionsController Implementation

//  getOptionsMenuItems to create View, onPrefChangeHandler for View update
//  base for trace viewers like tracePanel and traceConsole
//  binds  to the branch 'prefDomain' of prefs
var TraceOptionsController = function(prefDomain, onPrefChangeHandler)
{
    this.prefDomain = prefDomain;

    var scope = {};
    Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
    this.traceService = scope.traceConsoleService;

    this.addObserver = function()
    {
        prefs.setBoolPref("browser.dom.window.dump.enabled", true);
        this.observer = { observe: Obj.bind(this.observe, this) };
        prefs.addObserver(prefDomain, this.observer, false);
    };

    this.removeObserver = function()
    {
        prefs.removeObserver( prefDomain, this.observer, false);
    };

    // nsIObserver
    this.observe = function(subject, topic, data)
    {
        if (topic == "nsPref:changed")
        {
            var m = reDBG.exec(data);
            if (m)
            {
                var changedPrefDomain = "extensions." + m[1];
                if (changedPrefDomain == prefDomain)
                {
                    var optionName = data.substr(prefDomain.length+1); // skip dot
                    var optionValue = Options.get(m[2]);
                    if (this.prefEventToUserEvent)
                        this.prefEventToUserEvent(optionName, optionValue);
                }
            }
            else
            {
                if (typeof(FBTrace) != "undefined" && FBTrace.DBG_OPTIONS)
                    FBTrace.sysout("traceModule.observe : "+data+"\n");
            }
        }
    };

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // UI

    this.getOptionsMenuItems = function()  // Firebug menu items from option map
    {
        var optionMap = this.traceService.getTracer(prefDomain);
        var items = [];
        for (var p in optionMap)
        {
            var m = p.indexOf("DBG_");
            if (m != 0)
                continue;

            try
            {
                var prefValue = Options.get(p);
                var key = p.substr(4);
                items.push({
                    label: getMenuItemLabel(key),
                    key: key,
                    nol10n: true,
                    type: "checkbox",
                    checked: prefValue,
                    pref: p,
                    id: p,
                    command: this.togglePref.bind(this, p)
                });
            }
            catch (err)
            {
                if (FBTrace.DBG_ERRORS)
                {
                    FBTrace.sysout("traceModule.getOptionsMenuItems could not create item for " +
                        p + " in prefDomain " + this.prefDomain + ", " + err, err);
                }
                // if the option doesn't exist in this prefDomain, just continue...
            }
        }

        return items;
    };

    this.getOptionsTree = function()
    {
        var menuitems = this.getOptionsMenuItems();
        var root = {children: [], isRoot: true};

        function parentCommand()
        {
            var wasChecked = this.checked;
            for (var child of this.children)
            {
                // Toggle the children only if the parent had the same value before
                // the user toggled it.
                if (child.checked === wasChecked)
                    child.command();
            }
        }

        for (var menuitem of menuitems)
        {
            var option = menuitem.key;
            var curIndexOf = 0;
            var parent = root;
            var childParent = parent;
            while ((curIndexOf = option.indexOf("/", curIndexOf + 1)) !== -1)
            {
                var key = option.substr(0, curIndexOf + 1);
                childParent = parent.children.find((x) => x.key === key);

                if (!childParent)
                {
                    childParent = {
                        label: getMenuItemLabel(key),
                        key: key,
                        children: [],
                        get checked()
                        {
                            return this.children.every((child) => child.checked);
                        },
                        command: parentCommand,
                        get expanded()
                        {
                            return Options.get("expanded." + this.key) || false;
                        },
                        set expanded(value)
                        {
                            return Options.set("expanded." + this.key, !!value);
                        },
                        id: key,
                        parent: parent
                    };
                    parent.children.push(childParent);
                }

                parent = childParent;
            }
            menuitem.parent = childParent;
            childParent.children.push(menuitem);
        }
        return root;
    };

    // use as an event listener on UI control
    this.togglePref = function(pref)
    {
        var value = Options.get(pref);
        var newValue = !value;

        Options.set(pref, newValue);
        prefService.savePrefFile(null);

        if (FBTrace.DBG_OPTIONS)
        {
            FBTrace.sysout("traceConsole.setOption: new value "+ this.prefDomain+"."+
                pref+ " = " + newValue);
        }
    };

    if (onPrefChangeHandler)
    {
        this.prefEventToUserEvent = onPrefChangeHandler;
    }
    else
    {
        this.prefEventToUserEvent = function(optionName, optionValue)
        {
            FBTrace.sysout("TraceOptionsController owner needs to implement prefEventToUser Event",
                {name: optionName, value: optionValue});
        };
    }

    this.clearOptions = function()
    {
        var optionMap = this.traceService.getTracer(prefDomain);
        for (var p in optionMap)
        {
            var m = p.indexOf("DBG_");
            if (m != 0)
                continue;

            Options.set(p, false);
        }
        prefService.savePrefFile(null);
    };
};

// ********************************************************************************************* //
// Helpers

function getMenuItemLabel(key)
{
    return key.match(/([^\/]*)\/?$/)[1];
}

// ********************************************************************************************* //
// Registration

return TraceOptionsController;

// ********************************************************************************************* //
});
