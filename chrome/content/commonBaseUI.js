/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/globalTab",
    "fbtrace/optionTab",
    "fbtrace/lib/menu",
    "fbtrace/lib/css",
    "fbtrace/lib/locale",
    "fbtrace/lib/options",
    "fbtrace/messageTemplate",
    "fbtrace/panelTemplate",
],
function(FBTrace, GlobalTab, OptionTab, Menu, Css, Locale, Options, MessageTemplate, PanelTemplate) {

// ********************************************************************************************* //
// Constants

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

// ********************************************************************************************* //
// CommonBaseUI

var CommonBaseUI = {

    destroy: function()
    {
        this.optionsController.removeObserver();
    },

    initializeContent: function(parentNode, outputNodes, prefDomain, callback)
    {
        var doc = parentNode.ownerDocument;

        // Create basic layout for trace console content.
        var rep = PanelTemplate;
        rep.tag.replace({}, parentNode, rep);

        // This IFRAME is the container for all logs.
        var logTabIframe = parentNode.getElementsByClassName("traceInfoLogsFrame").item(0);

        logTabIframe.addEventListener("load", function(event)
        {
            var frameDoc = logTabIframe.contentWindow.document;

            var rootNode = frameDoc.getElementById("traceLogContent");
            outputNodes.setScrollingNode(rootNode);

            var logNode = MessageTemplate.createTable(rootNode);

            function recalcLayout() {
               logTabIframe.style.height = (doc.defaultView.innerHeight - 30) + "px";
            }

            doc.defaultView.addEventListener("resize", function(event) {
               recalcLayout();
            }, true);

            recalcLayout();

            callback(logNode);
        }, true);

        // Initialize content for Options tab (a button for each DBG_ option).
        var optionsBody = parentNode.getElementsByClassName("traceInfoOptionsText").item(0);

        // Customize layout of options.
        var tabular = Options.get("fbtrace.tabularOptionsLayout");
        optionsBody.setAttribute("tabular", tabular);


        OptionTab.render(optionsBody, prefDomain);

        try
        {
            // Initialize global options
            var globalBody = parentNode.querySelector(".traceInfoGlobalText");
            if (globalBody)
                GlobalTab.render(globalBody);
        }
        catch (e)
        {
            window.dump("FBTrace; globalOptions EXCEPTION " + e + "\n");
        }

        // Select default tab.
        rep.selectTabByName(parentNode, "Logs");
    },
};

// ********************************************************************************************* //
// Registration

return CommonBaseUI;

// ********************************************************************************************* //
});
