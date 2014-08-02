/* See license.txt for terms of usage */

define([
    "fbtrace/lib/locale",
    "fbtrace/commonBaseUI",
    "fbtrace/lib/domplate",
    "fbtrace/traceOptionsController",
],
function(Locale, CommonBaseUI, Domplate, TraceOptionsController) {

// ********************************************************************************************* //
// Constants

var {domplate, FOR, BUTTON} = Domplate;

// ********************************************************************************************* //
// Variables

var timerUpdateButtons = -1;

//********************************************************************************************** //

var OptionTab = domplate(
{
    tag:
        FOR("menuitem", "$menuitems",
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
        ),

    render: function(parentNode, prefDomain)
    {
        var optionsControllerInitialized = !!this.optionsController;
        // Customize layout of options.
        if (!optionsControllerInitialized)
            this.initOptionsController(parentNode, prefDomain);

        var menuitems = this.optionsController.getOptionsMenuItems();
        this.tag.replace({menuitems: menuitems}, parentNode);

        // If the optionsController was not initialized before calling render,
        // add the observer.
        if (!optionsControllerInitialized)
            this.optionsController.addObserver();
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

return OptionTab;

});
