/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/lib/array",
],
function(FBTrace, Arr) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const WARNING_FLAG = Ci.nsIScriptError.warningFlag;

// ********************************************************************************************* //
// Trace Window Implementation

var TraceDevToolsListener =
{
    startObserving: function(traceConsole)
    {
        if (this.isObserving)
            return;

        Services.obs.addObserver(this, "console-api-log-event", false);

        this.traceConsole = traceConsole;

        this.isObserving = true;
    },

    stopObserving: function()
    {
        if (!this.isObserving)
            return;

        Services.obs.removeObserver(this, "console-api-log-event", false);

        this.isObserving = false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // extends consoleListener

    observe: function(object, topic, data)
    {
        var message = object.wrappedJSObject;

        // Only messages sent through sendConsoleAPIMessage() see: Console.jsm
        // are logged to the tracing console.
        if (message.ID != "jsm") {
            return;
        }

        var stack = [{
            fileName: message.filename,
            lineNumber: message.lineNumber,
            funcName: message.functionName
        }];

        var args = Arr.cloneArray(message.arguments);
        var text = args.shift();

        var messageInfo = {
            type: "", // extensions.firebug
            stack: stack,
            obj: args.length == 0 ? args[0] : args,
            time: message.timeStamp
        };

        try
        {
            var subject = {wrappedJSObject: messageInfo};
            this.traceConsole.observe(subject, "firebug-trace-on-message",
                "JSM " + message.level + ": " + text);
        }
        catch (err)
        {
            // XXX Bug 906593 - Exceptions in this function currently aren't
            // reported, because of some XPConnect weirdness, so report them manually
        }
    }
};

// ********************************************************************************************* //
// Registration

return TraceDevToolsListener;

// ********************************************************************************************* //
});
