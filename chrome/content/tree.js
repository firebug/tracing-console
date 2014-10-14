/* See license.txt for terms of usage */

define([
    "fbtrace/lib/events",
    "fbtrace/lib/reps",
    "fbtrace/lib/css",
    "fbtrace/lib/string",
    "fbtrace/lib/object",
    "fbtrace/lib/domplate",
    "fbtrace/lib/dom",
],
function(Events, Reps, Css, Str, Obj, Domplate, Dom) {
with (Domplate) {

// ********************************************************************************************* //
// Domplate helpers - Tree (domplate widget)

/**
 * This object is intended as a domplate widget for displaying hierarchical
 * structure (tree). Specific tree should be derived from this object and
 * getMembers method should be implemented.
 */
var Tree = domplate(Reps.Rep,
{
    tag:
        TABLE({"class": "domTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                FOR("member", "$object|memberIterator",
                    TAG("$member|getRowTag", {member: "$member"}))
            )
        ),

    rowTag:
        TR({"class": "memberRow $member.open $member.type\\Row", $hasChildren: "$member.hasChildren",
            _repObject: "$member", level: "$member.level"},
            TD({"class": "memberLabelCell",
                style: "padding-left: $member.indent\\px; width:1%; white-space: nowrap"},
                DIV({"class": "memberLabel $member.type\\Label"}, "$member.name")
            ),
            TD({"class": "memberValueCell", style: "width: 100%;"},
                TAG("$member.tag", {object: "$member.value", member: "$member"})
            )
        ),

    loop:
        FOR("member", "$members",
            TAG("$member|getRowTag", {member: "$member"})),

    memberIterator: function(object)
    {
        return this.getMembers(object);
    },

    getRowTag: function(member)
    {
        return this.rowTag;
    },

    onClick: function(event)
    {
        if (!Events.isLeftClick(event))
            return;

        var row = Dom.getAncestorByClass(event.target, "memberRow");
        var label = Dom.getAncestorByClass(event.target, "memberLabel");
        if (label && Css.hasClass(row, "hasChildren"))
            this.toggleRow(row);
    },

    toggleRow: function(row, forceOpen)
    {
        if (!row)
            return;

        var member = row.repObject;
        if (!member)
            return;

        var level = this.getRowLevel(row);
        if (forceOpen && Css.hasClass(row, "opened"))
            return;

        // Handle child items expanding and collapsing.
        if (Css.hasClass(row, "opened"))
        {
            Css.removeClass(row, "opened");

            var tbody = row.parentNode;
            for (var firstRow = row.nextSibling; firstRow; firstRow = row.nextSibling)
            {
                if (this.getRowLevel(firstRow) <= level)
                    break;

                tbody.removeChild(firstRow);
            }
        }
        else
        {
            // Do not expand if the member says there are no children.
            if (!member.hasChildren)
                return;

            Css.setClass(row, "opened");

            // Get children object for the next level.
            var members = this.getMembers(member.value, level + 1);

            if (FBTrace.DBG_FBTRACE)
                FBTrace.sysout("DomTree.toggleRow; level: " + level + ", members: " +
                    (members ? members.length : "null"), members);

            // Insert rows if they are immediately available. Otherwise set a spinner
            // and wait for the update.
            if (members && members.length)
            {
                this.loop.insertRows({members: members}, row, this);
            }
        }
    },

    getRowLevel: function(row)
    {
        return parseInt(row.getAttribute("level"), 10);
    },

    getMembers: function(object, level)
    {
        if (!level)
            level = 0;

        if (typeof(object) == "string")
            return [this.createMember("", "", object, level)];

        var members = [];
        for (var p in object)
        {
            var member = this.createMember("", p, object[p], level);
            if (object[p] instanceof Array)
                member.tag = Reps.Nada.tag;
            members.push(member);
        }
        return members;
    },

    hasMembers: function(value)
    {
        var type = typeof value;
        if (type === "function" || type === "object")
            return value && Obj.hasProperties(value);
        else
            return type === "string" && value.length > 50;
    },

    createMember: function(type, name, value, level, customTag)
    {
        var tag = customTag;
        if (!tag) {
            var rep = Reps.getRep(value);
            tag = rep.shortTag ? rep.shortTag : rep.tag;
        }

        var hasChildren = this.hasMembers(value);

        return {
            name: name,
            value: value,
            type: type,
            rowClass: "memberRow-" + type,
            open: "",
            level: level,
            indent: level*16,
            hasChildren: hasChildren,
            tag: tag
        };
    }
});

// ********************************************************************************************* //
// Registration

return Tree;

// ********************************************************************************************* //
}});
