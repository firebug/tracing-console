/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/tree",
    "fbtrace/lib/domplate",
],
function(FBTrace, Tree, Domplate) {
with (Domplate) {

// ********************************************************************************************* //
// PropertyTree Implementation

var PropertyTree = domplate(Tree,
{
    getMembers: function(object, level)
    {
        if (!level)
            level = 0;

        var members = [];
        try
        {
            // Special case for Set, Map and Array instances
            if (typeof (object.forEach) == "function")
            {
                var self = this;
                object.forEach(function(value, key)
                {
                    try
                    {
                        members.push(self.createMember("dom", String(key), value, level));
                    }
                    catch (e)
                    {
                    }
                });
            }
            else
            {
                var props = getProperties(object);
                for (var i = 0; i < props.length; i++)
                {
                    var p = props[i];
                    try
                    {
                        var customTag = null;
                        var obj = object[p];
                        if (p === "stack")
                        {
                            obj = this.parseStackValueStr(obj);
                            customTag = this.lastStackFileName;
                        }
                        else if (obj instanceof StackEntry)
                        {
                            customTag = this.frameFileName;
                        }

                        members.push(this.createMember("dom", p, obj, level, customTag));
                    }
                    catch (e)
                    {
                    }
                }
            }
        }
        catch (err)
        {
            FBTrace.sysout("Exception", err);
        }

        return members;
    },

    hasMembers: function(value)
    {
        if (!value)
            return false;

        try
        {
            // Special case for Set, Map and Array instances
            if (typeof value.forEach == "function")
            {
                var ret = false;
                value.forEach(function()
                {
                    ret = true;
                });
                return ret;
            }

            var type = typeof value;
            if (type === "object")
                return getProperties(value).length > 0;
            else if (type === "function")
                return functionHasProperties(value);
            else
                return type === "string" && value.length > 50;
        }
        catch (exc)
        {
            return false;
        }
    },

    frameFileName:
        A({ "class": "stackFileLink", onclick: "$onStackFileClicked" },
            "$member.name"
        ),

    lastStackFileName:
        A({ "class": "stackFileLink", onclick: "$onStackFileClicked" },
            "$object|getLastStackFile"
        ),

    getLastStackFile: function (stack)
    {
        for (var i in stack)
            return i;
    },

    parseStackValueStr: function (stackValue)
    {
        if (typeof stackValue !== "string")
            return stackValue;

        // Each frame in stack is separated by a newline.
        var frames = stackValue.replace(/\n+$/, "").split("\n");
        // Reverse the array to form a stack(LIFO).
        frames = frames.reverse();

        var stack = new Stack();
        for (var i = 0; i < frames.length; i++)
        {
            // Each function call into the stack is separated by (->) sign.
            var urls = frames[i].split("->").reverse();
            var lastUrlInfo = this.parseStackUrl(urls[0]);
            var propertyName = lastUrlInfo.url + ":" + lastUrlInfo.lineNumber;
            stack[propertyName] = new StackEntry();
            for (var j = 0; j < urls.length; j++)
            {
                var fileName = urls[j];
                stack[propertyName][fileName] = urls[j];
            }
        }
        return stack;
    },

    parseStackUrl: function (url)
    {
        var urlInfo = {
            url: url,
            lineNumber: 1
        };

        // Stack frmae urls begins with a function name before at(@) sign and
        // followed by line number and column index. More info:
        // https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Error/Stack
        var stackUrlPattern = /^([^@]*@+)*(.+)\:(\d+)\:\d+$/;
        if (stackUrlPattern.test(url))
        {
            urlInfo.url = url.replace(stackUrlPattern, "$2");
            urlInfo.lineNumber = url.replace(stackUrlPattern, "$3");
        }
        return urlInfo;
    },

    onStackFileClicked: function (event)
    {
        var targetValue = event.target.innerHTML;
        // file name are followed by a colon(:) and line number.
        var url = targetValue.substr(0, targetValue.lastIndexOf(":"));
        var lineNumber = targetValue.substr(targetValue.lastIndexOf(":") + 1);

        var winType = "FBTraceConsole-SourceView";
        window.openDialog("chrome://global/content/viewSource.xul",
            winType, "all,dialog=no",
            url, null, null, lineNumber, false);
    },

});

// ********************************************************************************************* //
// Helpers

// Create a list of all properties of an object, except those from Object.prototype.
function getProperties(obj)
{
    var props = [];
    var cur = obj;
    var alreadySeen = new Set();
    while (cur && (cur === obj || !isObjectPrototype(cur)))
    {
        Object.getOwnPropertyNames(cur).forEach(function(name)
        {
            if (!alreadySeen.has(name))
            {
                alreadySeen.add(name);
                props.push(name);
            }
        });
        cur = Object.getPrototypeOf(cur);
    }
    return props;
}

function functionHasProperties(fun)
{
    for (var prop in fun)
        return true;
    return fun.prototype && getProperties(fun.prototype).length > 0;
}

function isObjectPrototype(obj)
{
    // Use duck-typing because the object probably comes from a different global.
    return !Object.getPrototypeOf(obj) && "hasOwnProperty" in obj;
}

// Helper types for showing stacks in nicer ways.
// Constructors are deleted so as to not show up in the tree view.
function Stack() {}
function StackEntry() {}
delete Stack.prototype.constructor;
delete StackEntry.prototype.constructor;

// ********************************************************************************************* //
// Registration

return PropertyTree;

// ********************************************************************************************* //
}});
