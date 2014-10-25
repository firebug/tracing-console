/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
],
function(FBTrace) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

const WARNING_FLAG = Ci.nsIScriptError.warningFlag;

// ********************************************************************************************* //
// Trace Window Implementation

var TraceErrorListener =
{
    startObserving: function()
    {
        if (this.isObserving)
            return;

        if (consoleService)
            consoleService.registerListener(this);

        this.isObserving = true;
    },

    stopObserving: function()
    {
        if (!this.isObserving)
            return;

        if (consoleService)
            consoleService.unregisterListener(this);

        this.isObserving = false;
    },

    handleErrorWithEmbeddedStack: function(obj)
    {
        // Special case for errors with a stack included in the message. Often
        // these come from DevToolsUtils's makeInfallible.
        try
        {
            var parts = obj.errorMessage.split("\nStack: ");
            if (parts.length !== 2)
                return false;
            var msg = parts[0];
            var stack = parts[1].split("\nLine: ")[0];
            var fakeObj = {
                message: msg,
                stack: stack,
                originalError: obj
            };
            FBTrace.sysout("Console Service ERROR: " + msg, fakeObj);
            return true;
        }
        catch (exc)
        {
            // Avoid double-reporting errors, or infinite error loops.
            return false;
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // extends consoleListener

    observe: function(object)
    {
        // QueryInterface (to access 'flags')
        if (!(object instanceof Ci.nsIScriptError))
            return;

        // Ignore warnings
        if (object.flags & WARNING_FLAG)
            return;

        if (this.handleErrorWithEmbeddedStack(object))
            return;

        var message = (object.message ? object.message : object);
        FBTrace.sysout("Console Service ERROR " + message, object);
    },
};

// ********************************************************************************************* //
// Registration

return TraceErrorListener;

// ********************************************************************************************* //
});
