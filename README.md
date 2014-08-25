Tracing Console
===============

Tracing console helps Firefox extension developers to debug their extensions.
It allows to display various logs created at runtime as well as inspect
live JS objects passed into the logs.

License
-------
Tracing Console is free and open source software distributed under the
[BSD License](https://github.com/firebug/firebug.next/blob/master/license.txt).

Install
-------

1. Clone this repository in <yourPath>
2. Add a file named fbtrace@getfirebug.com in `<devProfileFolder>/extensions` only containing `<yourPath>`
3. Run Firefox with your dev profile and that should be it.

[Read More](https://developer.mozilla.org/en-US/docs/Mozilla/Multiple_Firefox_Profiles) about Firefox profiles

Using Tracing Console
---------------------
Use the following code to get reference to the console:

    Components.utils.import("resource://fbtrace/firebug-trace-service.js");
    var FBTrace = traceConsoleService.getTracer(<your-extension-id>);

An example:

    var FBTrace = traceConsoleService.getTracer("extensions.firebug");


Further Resources
-----------------

* https://getfirebug.com/wiki/index.php/FBTrace
