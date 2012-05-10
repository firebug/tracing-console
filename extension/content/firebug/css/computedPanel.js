/* See license.txt for terms of usage */

define([
    "firebug/lib/object",
    "firebug/firebug",
    "firebug/lib/domplate",
    "firebug/lib/locale",
    "firebug/lib/events",
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/lib/xml",
    "firebug/lib/url",
    "firebug/chrome/menu",
    "firebug/lib/string",
    "firebug/css/cssReps"
],
function(Obj, Firebug, Domplate, Locale, Events, Css, Dom, Xml, Url, Menu, Str) {

with (Domplate) {

// ********************************************************************************************* //
// CSS Computed panel (HTML side panel)

function CSSComputedPanel() {}

CSSComputedPanel.prototype = Obj.extend(Firebug.Panel,
{
    template: domplate(
    {
        computedStylesTag:
            DIV({"class": "a11yCSSView", role: "list", "aria-label":
                Locale.$STR("aria.labels.computed styles")}),

        groupedStylesTag:
            FOR("group", "$groups",
                DIV({"class": "computedStylesGroup", $opened: "$group.opened", role: "list",
                        $hidden: "$group.props|hasNoStyles", _repObject: "$group"},
                    H1({"class": "cssComputedHeader groupHeader focusRow", role: "listitem"},
                        IMG({"class": "twisty", role: "presentation"}),
                        SPAN({"class": "cssComputedLabel"}, "$group.title")
                    ),
                    TAG("$stylesTag", {props: "$group.props"})
                )
            ),

        stylesTag:
            TABLE({"class": "computedStyleTable", role: "list"},
                TBODY({role: "presentation"},
                    FOR("prop", "$props",
                        TR({"class": "focusRow computedStyleRow computedStyle", role: "listitem",
                                _repObject: "$prop"},
                            TD({"class": "stylePropName", role: "presentation"},
                                "$prop.property"
                            ),
                            TD({role: "presentation"},
                                SPAN({"class": "stylePropValue"}, "$prop.value"))
                        )
                    )
                )
            ),

        hasNoStyles: function(props)
        {
            return props.length == 0;
        }
    }),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    updateComputedView: function(element)
    {
        function isUnwantedProp(propName)
        {
            return !Firebug.showMozillaSpecificStyles && Str.hasPrefix(propName, "-moz")
        }

        var win = element.ownerDocument.defaultView;
        var computedStyle = win.getComputedStyle(element);

        var props = [];
        for (var i = 0; i < computedStyle.length; ++i)
        {
            var prop = Firebug.CSSModule.getPropertyInfo(computedStyle, computedStyle[i]);

            if (isUnwantedProp(prop.property))
                continue;

            props.push(prop);
        }

        var parentNode = this.template.computedStylesTag.replace({}, this.panelNode);

        if (Firebug.computedStylesDisplay == "alphabetical")
        {
            this.sortProperties(props);

            FBTrace.sysout("props", props);
            var result = this.template.stylesTag.replace({props: props}, parentNode);
            FBTrace.sysout("result", result);
        }
        else
        {
            var groups = [];
            for (var groupName in styleGroups)
            {
                var title = Locale.$STR("StyleGroup-" + groupName);
                var group = {name: groupName, title: title, props: []};

                var groupProps = styleGroups[groupName];
                for (var i = 0; i < groupProps.length; ++i)
                {
                    var propName = groupProps[i];
                    if (isUnwantedProp(propName))
                        continue;

                    var prop = Firebug.CSSModule.getPropertyInfo(computedStyle, propName);

                    group.props.push(prop);

                    for (var j = 0; j < props.length; ++j)
                    {
                        if (props[j].property == propName)
                        {
                            props.splice(j, 1);
                            break;
                        }
                    }
                }

                group.opened = this.groupOpened[groupName];

                groups.push(group);
            }

            if (props.length > 0)
            {
                var group = groups[groups.length-1];
                for (var i = 0; i < props.length; ++i)
                {
                    var propName = props[i].property;
                    if (isUnwantedProp(propName))
                        continue;

                    var prop = Firebug.CSSModule.getPropertyInfo(computedStyle, propName);

                    group.props.push(prop);
                }

                group.opened = this.groupOpened[group.name];
            }

            var result = this.template.groupedStylesTag.replace({groups: groups}, parentNode);
        }

        Events.dispatch(this.fbListeners, "onCSSRulesAdded", [this, result]);
    },

    toggleGroup: function(node)
    {
        var groupNode = Dom.getAncestorByClass(node, "computedStylesGroup");
        var group = Firebug.getRepObject(groupNode);

        Css.toggleClass(groupNode, "opened");
        this.groupOpened[group.name] = Css.hasClass(groupNode, "opened");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Events

    onClick: function(event)
    {
        if (!Events.isLeftClick(event))
            return;

        var cssComputedHeader = Dom.getAncestorByClass(event.target, "cssComputedHeader");
        if (cssComputedHeader)
        {
            this.toggleGroup(event.target);
            return;
        }

        var computedStyle = Dom.getAncestorByClass(event.target, "computedStyle");
        if (computedStyle && Css.hasClass(computedStyle, "hasSelectors"))
        {
            this.toggleStyle(event.target);
            return;
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // extends Panel

    name: "computed",
    parentPanel: "html",
    order: 1,

    initialize: function()
    {
        this.groupOpened = [];
        for (var groupName in styleGroups)
        {
            var title = Locale.$STR("StyleGroup-" + groupName);
            this.groupOpened[title] = true;
        }

        this.onClick = Obj.bind(this.onClick, this);

        // Listen for CSS changes so the Computed panel is properly updated when needed.
        Firebug.CSSModule.addListener(this);

        Firebug.Panel.initialize.apply(this, arguments);
    },

    destroy: function()
    {
        Firebug.CSSModule.removeListener(this);

        Firebug.Panel.destroyNode.apply(this, arguments);
    },

    initializeNode: function(oldPanelNode)
    {
        Events.addEventListener(this.panelNode, "click", this.onClick, false);

        Firebug.Panel.initializeNode.apply(this, arguments);
    },

    destroyNode: function()
    {
        Events.removeEventListener(this.panelNode, "click", this.onClick, false);

        Firebug.Panel.destroyNode.apply(this, arguments);
    },

    supportsObject: function(object, type)
    {
        return object instanceof window.Element ? 1 : 0;
    },

    refresh: function()
    {
        this.updateSelection(this.selection);
    },

    updateSelection: function(element)
    {
        this.updateComputedView(element);
    },

    updateOption: function(name, value)
    {
        if (name == "computedStylesDisplay" || name == "showMozillaSpecificStyles")
            this.refresh();
    },

    getOptionsMenuItems: function()
    {
        return [
            {
                label: "Sort_alphabetically",
                type: "checkbox",
                checked: Firebug.computedStylesDisplay == "alphabetical",
                tooltiptext: "computed.option.tip.Sort_Alphabetically",
                command: Obj.bind(this.toggleDisplay, this)
            },
            Menu.optionMenu("Show_Mozilla_specific_styles",
                "showMozillaSpecificStyles",
                "computed.option.tip.Show_Mozilla_Specific_Styles"),
            "-",
            {
                label: "Refresh",
                command: Obj.bind(this.refresh, this),
                tooltiptext: "panel.tip.Refresh"
            }
        ];
    },

    getContextMenuItems: function(style, target)
    {
        return [
            {
                label: "Refresh",
                command: Obj.bind(this.refresh, this),
                tooltiptext: "panel.tip.Refresh"
            }
        ];
    },

    onMouseDown: function(event)
    {
        if (!Events.isLeftClick(event))
            return;

        var cssComputedHeader = Dom.getAncestorByClass(event.target, "cssComputedHeader");
        if (cssComputedHeader)
            this.toggleNode(event);
    },

    toggleNode: function(event)
    {
        var group = Dom.getAncestorByClass(event.target, "computedStylesGroup");
        var groupName = group.getElementsByClassName("cssComputedLabel")[0].textContent;

        Css.toggleClass(group, "opened");
        this.groupOpened[groupName] = Css.hasClass(group, "opened");
    },

    toggleDisplay: function()
    {
        var display = Firebug.computedStylesDisplay == "alphabetical" ? "grouped" : "alphabetical";
        Firebug.Options.set("computedStylesDisplay", display);
    },

    sortProperties: function(props)
    {
        props.sort(function(a, b)
        {
            return a.property > b.property ? 1 : -1;
        });
    },

    getStylesheetURL: function(rule, getBaseUri)
    {
        // if the parentStyleSheet.href is null, CSS std says its inline style
        if (rule && rule.parentStyleSheet && rule.parentStyleSheet.href)
            return rule.parentStyleSheet.href;
        else if (getBaseUri)
            return this.selection.ownerDocument.baseURI;
        else
            return this.selection.ownerDocument.location.href;
    },

    showInfoTip: function(infoTip, target, x, y, rangeParent, rangeOffset)
    {
        var propValue = Dom.getAncestorByClass(target, "stylePropValue");
        if (propValue)
        {
            var text = propValue.textContent;
            var prop = Dom.getAncestorByClass(target, "computedStyleRow");
            var propNameNode = prop.getElementsByClassName("stylePropName").item(0);
            var propName = propNameNode.textContent.toLowerCase();
            var cssValue;

            if (propName == "font" || propName == "font-family")
            {
                if (text.charAt(rangeOffset) == ",")
                    return;

                cssValue = Firebug.CSSModule.parseCSSFontFamilyValue(text, rangeOffset, true);
            }
            else
            {
                cssValue = Firebug.CSSModule.parseCSSValue(text, rangeOffset);
            }

            if (!cssValue)
                return false;

            if (cssValue.value == this.infoTipValue)
                return true;

            this.infoTipValue = cssValue.value;

            switch (cssValue.type)
            {
                case "rgb":
                case "hsl":
                case "gradient":
                case "colorKeyword":
                    this.infoTipType = "color";
                    this.infoTipObject = cssValue.value;
                    return FirebugReps.CSS.InfoTip.populateColorInfoTip(infoTip, cssValue.value);

                case "url":
                    if (Css.isImageRule(Xml.getElementSimpleType(Firebug.getRepObject(target)),
                        propNameNode.textContent))
                    {
                        var rule = Firebug.getRepObject(target);
                        var baseURL = this.getStylesheetURL(rule, true);
                        var relURL = Firebug.CSSModule.parseURLValue(cssValue.value);
                        var absURL = Url.isDataURL(relURL) ? relURL : Url.absoluteURL(relURL, baseURL);
                        var repeat = Firebug.CSSModule.parseRepeatValue(text);

                        this.infoTipType = "image";
                        this.infoTipObject = absURL;

                        return FirebugReps.CSS.InfoTip.populateImageInfoTip(infoTip, absURL, repeat);
                    }

                case "fontFamily":
                    return FirebugReps.CSS.InfoTip.populateFontFamilyInfoTip(infoTip, cssValue.value);
            }

            delete this.infoTipType;
            delete this.infoTipValue;
            delete this.infoTipObject;
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Change Listener

    onCSSInsertRule: function(styleSheet, cssText, ruleIndex)
    {
        // Force update, this causes updateSelection to be called.
        // See {@link Firebug.Panel.select}
        this.selection = null;
    },

    onCSSDeleteRule: function(styleSheet, ruleIndex)
    {
        this.selection = null;
    },

    onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue,
        prevPriority, rule, baseText)
    {
        this.selection = null;
    },

    onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, rule, baseText)
    {
        this.selection = null;
    }
});

// ********************************************************************************************* //
// Helpers

const styleGroups =
{
    text: [
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "font-size-adjust",
        "color",
        "text-transform",
        "text-decoration",
        "letter-spacing",
        "word-spacing",
        "line-height",
        "text-align",
        "vertical-align",
        "direction",
        "column-count",
        "column-gap",
        "column-width",
        "-moz-tab-size", // FF4.0
        "-moz-font-feature-settings", // FF4.0
        "-moz-font-language-override", // FF4.0
        "-moz-text-blink", // FF6.0
        "-moz-text-decoration-color", // FF6.0
        "-moz-text-decoration-line", // FF6.0
        "-moz-text-decoration-style", // FF6.0
        "hyphens", // FF 6.0
        "text-overflow" // FF7.0
    ],

    background: [
        "background-color",
        "background-image",
        "background-repeat",
        "background-position",
        "background-attachment",
        "opacity",
        "background-clip",
        "-moz-background-inline-policy",
        "background-origin",
        "background-size",
        "-moz-image-region"
    ],

    box: [
        "width",
        "height",
        "top",
        "right",
        "bottom",
        "left",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "-moz-padding-start",
        "-moz-padding-end",
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
        "border-top-color",
        "-moz-border-top-colors",
        "border-right-color",
        "-moz-border-right-colors",
        "border-bottom-color",
        "-moz-border-bottom-colors",
        "border-left-color",
        "-moz-border-left-colors",
        "border-top-style",
        "border-right-style",
        "border-bottom-style",
        "border-left-style",
        "-moz-border-end",
        "-moz-border-end-color",
        "-moz-border-end-style",
        "-moz-border-end-width",
        "-moz-border-image",
        "-moz-border-start",
        "-moz-border-start-color",
        "-moz-border-start-style",
        "-moz-border-start-width",
        "border-top-left-radius",
        "border-top-right-radius",
        "border-bottom-left-radius",
        "border-bottom-right-radius",
        "-moz-outline-radius-bottomleft",
        "-moz-outline-radius-bottomright",
        "-moz-outline-radius-topleft",
        "-moz-outline-radius-topright",
        "box-shadow",
        "outline-color",
        "outline-offset",
        "outline-top-width",
        "outline-right-width",
        "outline-bottom-width",
        "outline-left-width",
        "outline-top-color",
        "outline-right-color",
        "outline-bottom-color",
        "outline-left-color",
        "outline-top-style",
        "outline-right-style",
        "outline-bottom-style",
        "outline-left-style",
        "-moz-box-align",
        "-moz-box-direction",
        "-moz-box-flex",
        "-moz-box-ordinal-group",
        "-moz-box-orient",
        "-moz-box-pack",
        "-moz-box-sizing",
        "-moz-margin-start",
        "-moz-margin-end"
    ],

    layout: [
        "position",
        "display",
        "visibility",
        "z-index",
        "overflow-x",  // http://www.w3.org/TR/2002/WD-css3-box-20021024/#overflow
        "overflow-y",
        "overflow-clip",
        "-moz-transform",
        "-moz-transform-origin",
        "white-space",
        "clip",
        "float",
        "clear",
        "-moz-appearance",
        "-moz-stack-sizing",
        "-moz-column-count",
        "-moz-column-gap",
        "-moz-column-width",
        "-moz-column-rule",
        "-moz-column-rule-width",
        "-moz-column-rule-style",
        "-moz-column-rule-color",
        "-moz-float-edge",
        "orient"
    ],

    other: [
        "cursor",
        "list-style-image",
        "list-style-position",
        "list-style-type",
        "marker-offset",
        "-moz-user-focus",
        "-moz-user-select",
        "-moz-user-modify",
        "-moz-user-input",
        "-moz-animation", // FF5.0
        "-moz-animation-delay", // FF5.0
        "-moz-animation-direction", // FF5.0
        "-moz-animation-duration", // FF5.0
        "-moz-animation-iteration-count", // FF5.0
        "-moz-animation-name", // FF5.0
        "-moz-animation-play-state", // FF5.0
        "-moz-animation-timing-function", // FF5.0
        "-moz-animation-fill-mode", // FF5.0
        "-moz-transition", // FF4.0
        "-moz-transition-delay", // FF4.0
        "-moz-transition-duration", // FF4.0
        "-moz-transition-property", // FF4.0
        "-moz-transition-timing-function", // FF4.0
        "-moz-force-broken-image-icon",
        "-moz-window-shadow"
    ]
};

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(CSSComputedPanel);

return CSSComputedPanel;

// ********************************************************************************************* //
}});