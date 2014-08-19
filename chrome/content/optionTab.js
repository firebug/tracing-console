/* See license.txt for terms of usage */

define([
    "fbtrace/trace",
    "fbtrace/lib/dom",
    "fbtrace/lib/domplate",
    "fbtrace/lib/locale",
    "fbtrace/lib/reps",
    "fbtrace/traceOptionsController",
    "fbtrace/tree",
],
function(FBTrace, Dom, Domplate, Locale, Reps, TraceOptionsController, Tree) {

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
        TR({"class": "memberRow $member.open", $hasChildren: "$member.value|hasChildren",
            _repObject: "$member", level: "$member.level"},
            TD({"class": "memberLabelCell",
                style: "padding-left: $member.indent\\px; width:1%; white-space: nowrap"},
                DIV({"class": "memberLabel $member.type\\Label"},
                    INPUT({type: "checkbox",
                        "onchange": "$onOptionChange",
                        "onclick": "$onOptionClicked",
                        "_checked": "$member.value.checked",
                        "_indeterminate": "$member.value.indeterminateChecked",
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

        // this.membersToExpand = this.optionsController.getMembersIdToExpand();

        var root = this.optionsController.getOptionsTree();
        this.tag.replace({object: root}, parentNode);

        this.expandMembersRecursively(root);

        // If the optionsController was not initialized before calling render,
        // add the observer.
        if (!optionsControllerInitialized)
            this.optionsController.addObserver();
    },

    /**
     * Go through the parent members and expand the items whose value "expanded" property
     * is set to true. Called at the initialization of the optionTab to restore the
     * collapsed / expanded state of the items.
     *
     * @param {item or root} parent The parent in which we go through the members.
     */
    expandMembersRecursively: function(parent)
    {
        for (let item of parent.children)
        {
            // item.expanded is a property that query the corresponding option in about:config
            // @see traceOptionsController.js
            if (item.expanded)
            {
                this.expandMember(item);
                // Call the function recursively, so sub-items can be expanded.
                this.expandMembersRecursively(item);
            }
        }
    },

    /**
     * Expand a member. Called at the initialization of the Options tab.
     * @see OptionTab.expandMembersRecursively
     *
     */
    expandMember: function(item)
    {
        var checkbox = this.doc.getElementById(item.id);
        var row = Dom.getAncestorByClass(checkbox, "memberRow");
        FBTrace.sysout("expanding ", row);
        if (row)
            this.toggleRow(row);
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
                    // parentRep.value.checked and parentRep.value.indeterminateChecked
                    // are getters that returns true if respectively all /any the children are
                    // checked.
                    parentOptionNode.checked = parentOption.checked;
                    parentOptionNode.indeterminate = !parentOptionNode.checked &&
                        parentOption.indeterminateChecked;

                    parentOption = parentOption.parent;
                } while (parentOption && !parentOption.isRoot);
            }
            else if (timerUpdateCheckbox === -1)
            {
                if (FBTrace.DBG_TRACE)
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
        // Setting expanded to true or false updates the option value in about:config.
        // @see traceOptionsController.js
        member.value.expanded = row.classList.contains("opened");
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
