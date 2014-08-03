/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/lib/domplate",
    "fbtrace/lib/locale",
    "fbtrace/lib/reps",
    "fbtrace/commonBaseUI",
    "fbtrace/traceOptionsController",
    "fbtrace/tree",
],
function(FBTrace, Domplate, Locale, Reps, CommonBaseUI, TraceOptionsController, Tree) {

// ********************************************************************************************* //
// Constants

var {domplate, BUTTON, FOR, TAG, UL, LI, DIV, TR, TD, INPUT, LABEL} = Domplate;

// ********************************************************************************************* //
// Variables

var timerUpdateCheckbox = -1;

//********************************************************************************************** //
var OptionTab = domplate(Tree,
{
    rowTag:
        TR({"class": "memberRow $member.open", $hasChildren: "$member|hasChildren",
            _repObject: "$member", level: "$member.level"},
            TD({"class": "memberLabelCell",
                style: "padding-left: $member.indent\\px; width:1%; white-space: nowrap"},
                DIV({"class": "memberLabel $member.type\\Label"},
                    INPUT({type: "checkbox",
                        "onchange": "$onOptionChange",
                        "onclick": "$onOptionClicked",
                        "checked": "$member|isChecked",
                        "id": "$member.value.pref",
                    }),
                    LABEL({for: "$member.value.pref"}, "$member.name")
                )
            )
        ),

    /*listPropTag: UL({"class": "optionList"},
        FOR("member", "$members|memberIterator",
            TAG("$member|renderMember", {"member": "$member"})
        )
    ),

    parentTag: LI(
        DIV({"class": "optionParent closed $member.selected"}, "$member.key"),
        TAG("$listPropTag", {members: "$member.value"})
    ),

    leafTag: LI("$member.value.label"),



        /*FOR("menuitem", "$menuitems",
            BUTTON(
                {
                    "class": "traceOption",
                    "id": "$menuitem.pref",
                    "type": "",
                    "onclick": "$menuitem.command",
                    "title": "$menuitem|getItemTooltip",
                    "checked": "$menuitem.checked",
                }, "$menuitem.label"
            )
        ),*/

    render: function(parentNode, prefDomain)
    {
        var optionsControllerInitialized = !!this.optionsController;
        // Customize layout of options.
        if (!optionsControllerInitialized)
            this.initOptionsController(parentNode, prefDomain);

        var menuitems = this.optionsController.getOptionsMenuItems();
        var members = getOptionsTree(menuitems);
        dump("\nrender" + Array.slice(arguments).join(",") + "\n");
        this.tag.replace({object: members}, parentNode);

        // If the optionsController was not initialized before calling render,
        // add the observer.
        if (!optionsControllerInitialized)
            this.optionsController.addObserver();
    },

    renderMember: function(member)
    {
        dump("\nrenderMember" + JSON.stringify(Array.slice(arguments)) + "\n");
        return member.key.endsWith("/") ?
            this.parentTag :
            this.leafTag;
    },

    getMembers: function(object, level)
    {
        level = level || 0;

        dump("\nmemberIterator" + JSON.stringify(Array.slice(arguments)) + "\n");
        var members = [];
        for (var key in object)
            members.push(this.createMember("dom", key, object[key], level));
        return members;
    },

    hasChildren: function(member)
    {
        return member.name.endsWith("/");
    },

    isChecked: function(member)
    {
        if (!member.name.endsWith("/"))
            return member.name.checked;
    },

    initOptionsController: function(parentNode, prefDomain)
    {
        this.optionsController = new TraceOptionsController(prefDomain,
        function updateCheckbox(optionName, optionValue)
        {
            optionValue = !!optionValue;
            var checkbox = parentNode.ownerDocument.getElementById(optionName);

            if (checkbox)
                checkbox.checked = optionValue;
            else if (timerUpdateCheckbox === -1)
            {
                FBTrace.sysout("traceModule onPrefChange no checkbox with name " + optionName +
                    " in parentNode; regenerate options panel", parentNode);

                timerUpdateCheckbox = setTimeout(() => {
                    timerUpdateCheckbox = -1;
                    OptionTab.render(parentNode, prefDomain);
                });
            }
        });
    },

    getItemTooltip: function(menuitem)
    {
        var tooltip = Locale.$STR("tracing.option." + menuitem.label + "_Description");
        return tooltip || "";
    },

    onOptionClicked: function(ev)
    {
        ev.stopPropagation();
    },

    onOptionChange: function(ev)
    {
        var target = ev.target;
        var optionName = target.id;
        var member = Reps.getRepObject(target);
        FBTrace.sysout("member = ", member);

        if (!member.name.endsWith("/"))
            member.value.command();
        else
            executeMenuItemCommandsRecursively(member.value);
    },

});

// ********************************************************************************************* //
// Helpers

function getOptionsTree(menuitems)
{
    var tree = {};
    for (var menuitem of menuitems)
    {
        var option = menuitem.label;
        var curIndexOf = 0;
        var parent = tree;
        while ((curIndexOf = option.indexOf("/", curIndexOf + 1)) !== -1)
        {
            var key = option.substr(0, curIndexOf + 1);

            if (!parent[key])
                parent[key] = {};

            if (curIndexOf === option.lastIndexOf("/"))
                parent[key][option] = menuitem;
            else
                parent = parent[key];
        }
    }
    return tree;
}

function executeMenuItemCommandsRecursively(parent)
{
    for (var key in parent)
    {
        if (key.endsWith("/"))
            executeMenuItemCommandsRecursively(parent[key]);
        else
            parent[key].command();
    }
}

// ********************************************************************************************* //
// Registration

return OptionTab;

});
