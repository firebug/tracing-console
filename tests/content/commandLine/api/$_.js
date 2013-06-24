function runTest()
{
    FBTest.sysout("$_.START");

    FBTest.openNewTab(basePath + "commandLine/api/$_.html", function(win)
    {
        FBTest.openFirebug();

        FBTest.enableConsolePanel(function(win)
        {
            var taskList = new FBTest.TaskList();

            taskList.push(FBTest.executeCommandAndVerify, "1+1",
                "2", "span", "objectBox objectBox-number");

            taskList.push(FBTest.executeCommandAndVerify, "$_",
                "2", "span", "objectBox objectBox-number");

            taskList.run(function() {
                FBTest.testDone("$_.DONE");
            });
        });
    });
}
