/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/lib/domplate",
    "fbtrace/lib/locale",
    "fbtrace/lib/reps",
    "fbtrace/traceOptionsController",
    "fbtrace/tree",
],
function(FBTrace, Domplate, Locale, Reps, TraceOptionsController, Tree) {

// ********************************************************************************************* //
// Constants

var {domplate, FOR, DIV, TR, TD, INPUT, LABEL, TAG} = Domplate;

// ********************************************************************************************* //
// Variables

var timerUpdateCheckbox = -1;

//********************************************************************************************** //
var OptionTab = domplate(Tree,
{
    rowTag:
        FOR("mb", "$member|getMemberAndSubMembers",
            TAG("$mb|getMemberTag", {"member": "$mb"})
        ),

    memberTag:
        TR({"class": "memberRow $member.open", $hasChildren: "$member.value|hasChildren",
            _repObject: "$member", level: "$member.level", "_zzzz": "$member.label", "zzzz": "$member.value.id"},
            TD({"class": "memberLabelCell",
                style: "padding-left: $member.indent\\px; width:1%; white-space: nowrap", _zzzz: "$member.value.id", "zzzz": "$member.value.id"},
                DIV({"class": "memberLabel $member.type\\Label"},
                    INPUT({type: "checkbox",
                        "onchange": "$onOptionChange",
                        "onclick": "$onOptionClicked",
                        "_checked": "$member.value.checked",
                        "id": "$member.value.id",
                    }),
                    LABEL({for: "$member.value.id"}, "$member.name")
                )
            )
        ),

    render: function(parentNode, prefDomain)
    {
        var optionsControllerInitialized = !!this.optionsController;
        this.doc = parentNode.ownerDocument;
        // Customize layout of options.
        if (!optionsControllerInitialized)
            this.initOptionsController(parentNode, prefDomain);

        var members = this.optionsController.getOptionsTree();
        FBTrace.sysout("render", parentNode);
        this.tag.replace({object: members}, parentNode);

        // If the optionsController was not initialized before calling render,
        // add the observer.
        if (!optionsControllerInitialized)
            this.optionsController.addObserver();
    },

    getMembers: function(object, level)
    {
        level = level || 0;

        FBTrace.sysout("\ngetMembers" , Array.slice(arguments));
        var members = object.children.map(function(child)
        {
            return this.createMember("dom", child.label, child, level + 1);
        }, this);
        // First put the items with children at the top, then sort alphabetically.
        members.sort(({value: a}, {value: b}) =>
        {
            if (this.hasChildren(a) ^ this.hasChildren(b))
                return this.hasChildren(b) ? 1 : -1;
            return b.label < a.label ? 1 : -1;
        });
        FBTrace.sysout("\nmembers = ", members);

        return members;
    },

    getMemberTag: function()
    {
        return this.memberTag;
    },

    getMemberAndSubMembers: function(member)
    {
        var res = [member];
        FBTrace.sysout("getMemberAndSubMembers", member);
        if (member.value.expanded && this.hasChildren(member.value))
        {
            res = res.concat(this.getMembers(member.value, member.level + 1));
            member.open = "opened";
        }
        FBTrace.sysout("getMemberAndSubMembers; result", res);
        return res;
    },

    initOptionsController: function(parentNode, prefDomain)
    {
        // updateCheckbox is triggered when an option (among the ones we see in "about:config")
        // is updated.
        // Note that when a checkbox get checked, the option is first updated, then updateCheckbox
        // is triggered.
        this.optionsController = new TraceOptionsController(prefDomain,
        function updateCheckbox(optionName, optionValue)
        {
            optionValue = !!optionValue;
            var doc = parentNode.ownerDocument;
            var checkbox = doc.getElementById(optionName);

            if (checkbox)
            {
                var rep = Reps.getRepObject(checkbox);
                FBTrace.sysout("rep", rep);
                rep.value.checked = checkbox.checked = optionValue;
                var parentOption = rep.value.parent;
                var parentOptionNode;
                // Also update the parent checkboxes.
                do
                {
                    parentOptionNode = doc.getElementById(parentOption.id);
                    // parentRep.value.checked is a getter that returns true if all the children are
                    // checked.
                    parentOptionNode.checked = parentOption.checked;

                    parentOption = parentOption.parent;
                } while (parentOption && !parentOption.isRoot);
            }
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

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Method Overrides

    toggleRow: function(row)
    {
        var ret = Tree.toggleRow.call(this, row);
        var member = Reps.getRepObject(row);
        member.value.expanded = row.classList.contains("opened");
        FBTrace.sysout("toggleRow; member.value.expanded = " + member.value.expanded);
        return ret;
    },

    hasChildren: function(object)
    {
        return !!(object.children && object.children.length);
    },

    getItemTooltip: function(menuitem)
    {
        var tooltip = Locale.$STR("tracing.option." + menuitem.label + "_Description");
        return tooltip || "";
    },

    onOptionClicked: function(ev)
    {
        // Prevent the label or the checkbox to expand the item.
        ev.stopPropagation();
    },

    onOptionChange: function(ev)
    {
        var target = ev.target;

        var member = Reps.getRepObject(target);
        FBTrace.sysout("member = ", member);
        member.value.command();
        return false;
    },

});

// ********************************************************************************************* //
// Registration

return OptionTab;

});
