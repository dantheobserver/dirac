/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 */
WebInspector.ScopeChainSidebarPane = function()
{
    WebInspector.SidebarPane.call(this, WebInspector.UIString("Scope"));
    this._expandController = new WebInspector.ObjectPropertiesSectionExpandController();
}

WebInspector.ScopeChainSidebarPane._pathSymbol = Symbol("path");

WebInspector.ScopeChainSidebarPane.prototype = {
    /**
     * @param {?WebInspector.DebuggerModel.CallFrame} callFrame
     */
    update: function(callFrame)
    {
        this.element.removeChildren();

        if (!callFrame) {
            var infoElement = createElement("div");
            infoElement.className = "info";
            infoElement.textContent = WebInspector.UIString("Not Paused");
            this.element.appendChild(infoElement);
            return;
        }

        var foundLocalScope = false;
        var scopeChain = callFrame.scopeChain();
        for (var i = 0; i < scopeChain.length; ++i) {
            var scope = scopeChain[i];
            var title = null;
            var emptyPlaceholder = null;
            var extraProperties = [];

            switch (scope.type()) {
            case DebuggerAgent.ScopeType.Local:
                foundLocalScope = true;
                title = WebInspector.UIString("Local");
                emptyPlaceholder = WebInspector.UIString("No Variables");
                var thisObject = callFrame.thisObject();
                if (thisObject)
                    extraProperties.push(new WebInspector.RemoteObjectProperty("this", thisObject));
                if (i == 0) {
                    var details = callFrame.debuggerModel.debuggerPausedDetails();
                    var exception = details.exception();
                    if (exception)
                        extraProperties.push(new WebInspector.RemoteObjectProperty(WebInspector.UIString.capitalize("Exception"), exception, undefined, undefined, undefined, undefined, undefined, true));
                    var returnValue = callFrame.returnValue();
                    if (returnValue)
                        extraProperties.push(new WebInspector.RemoteObjectProperty(WebInspector.UIString.capitalize("Return ^value"), returnValue, undefined, undefined, undefined, undefined, undefined, true));
                }
                break;
            case DebuggerAgent.ScopeType.Closure:
                var scopeName = scope.name();
                if (scopeName)
                    title = WebInspector.UIString("Closure (%s)", WebInspector.beautifyFunctionName(scopeName));
                else
                    title = WebInspector.UIString("Closure");
                emptyPlaceholder = WebInspector.UIString("No Variables");
                break;
            case DebuggerAgent.ScopeType.Catch:
                title = WebInspector.UIString("Catch");
                break;
            case DebuggerAgent.ScopeType.Block:
                title = WebInspector.UIString("Block");
                break;
            case DebuggerAgent.ScopeType.Script:
                title = WebInspector.UIString("Script");
                break;
            case DebuggerAgent.ScopeType.With:
                title = WebInspector.UIString("With Block");
                break;
            case DebuggerAgent.ScopeType.Global:
                title = WebInspector.UIString("Global");
                break;
            }

            var subtitle = scope.description();
            if (!title || title === subtitle)
                subtitle = undefined;

            var titleElement = createElementWithClass("div", "scope-chain-sidebar-pane-section-header");
            titleElement.createChild("div", "scope-chain-sidebar-pane-section-subtitle").textContent = subtitle;
            titleElement.createChild("div", "scope-chain-sidebar-pane-section-title").textContent = title;

            var section = new WebInspector.ObjectPropertiesSection(WebInspector.SourceMapNamesResolver.resolveScopeInObject(scope), titleElement, emptyPlaceholder, true, extraProperties);
            this._expandController.watchSection(title + (subtitle ? ":" + subtitle : ""), section);

            if (scope.type() === DebuggerAgent.ScopeType.Global)
                section.objectTreeElement().collapse();
            else if (!foundLocalScope || scope.type() === DebuggerAgent.ScopeType.Local)
                section.objectTreeElement().expand();

            section.element.classList.add("scope-chain-sidebar-pane-section");
            this.element.appendChild(section.element);
        }
    },

    __proto__: WebInspector.SidebarPane.prototype
}