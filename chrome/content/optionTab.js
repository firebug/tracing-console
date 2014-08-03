/* See license.txt for terms of usage */

define([
    "fbtrace/lib/locale",
    "fbtrace/lib/domplate",
    "fbtrace/commonBaseUI",
    "fbtrace/traceOptionsController",
    "fbtrace/tree",
],
function(Locale, Domplate, CommonBaseUI, TraceOptionsController, Tree) {

// ********************************************************************************************* //
// Constants

var {domplate, FOR, TAG, UL, LI, DIV} = Domplate;

// ********************************************************************************************* //
// Variables

var timerUpdateButtons = -1;

//********************************************************************************************** //
var OptionTab = domplate(Tree,
{
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
            members.push(this.createMember("dom", String(key), object[key], level));
            //members.push({key: i, value: member[i], selected: ""});
        return members;
    },

    initOptionsController: function(parentNode, prefDomain)
    {
        this.optionsController = new TraceOptionsController(prefDomain,
        function updateButton(optionName, optionValue)
        {
            optionValue = !!optionValue;
            var button = parentNode.ownerDocument.getElementById(optionName);

            if (button)
                button.setAttribute("checked", optionValue.toString());
            else if (timerUpdateButtons === -1)
            {
                FBTrace.sysout("traceModule onPrefChange no button with name " + optionName +
                    " in parentNode; regenerate options panel", parentNode);

                timerUpdateButtons = setTimeout(() => {
                    timerUpdateButtons = -1;
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

// ********************************************************************************************* //
// Registration

return OptionTab;

});
