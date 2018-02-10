// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Protocol.TargetDispatcher}
 */
SDK.ChildTargetManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._targetInfos = new Map();

    /** @type {!Map<string, !SDK.ChildConnection>} */
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true});

    if (!parentTarget.parentTarget()) {
      this._targetAgent.setDiscoverTargets(true);
      this._targetAgent.setRemoteLocations([{host: 'localhost', port: 9229}]);
    }
  }

  /**
   * @param {function({target: !SDK.Target, waitingForDebugger: boolean})=} attachCallback
   */
  static install(attachCallback) {
    SDK.ChildTargetManager._attachCallback = attachCallback;
    SDK.SDKModel.register(SDK.ChildTargetManager, SDK.Target.Capability.Target, true);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false});
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true});
  }

  /**
   * @override
   */
  dispose() {
    for (var sessionId of this._childConnections.keys())
      this.detachedFromTarget(sessionId, undefined);
  }

  /**
   * @param {string} type
   * @return {number}
   */
  _capabilitiesForType(type) {
    if (type === 'worker')
      return SDK.Target.Capability.JS | SDK.Target.Capability.Log | SDK.Target.Capability.Network;
    if (type === 'service_worker')
      return SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target;
    if (type === 'iframe') {
      return SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.JS |
          SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target |
          SDK.Target.Capability.Tracing | SDK.Target.Capability.Emulation | SDK.Target.Capability.Input;
    }
    return 0;
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetInfoChanged(targetInfo) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
    this._targetInfos.delete(targetId);
    this._fireAvailableTargetsChanged();
  }

  _fireAvailableTargetsChanged() {
    SDK.targetManager.dispatchEventToListeners(
        SDK.TargetManager.Events.AvailableTargetsChanged, this._targetInfos.valuesArray());
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(sessionId, targetInfo, waitingForDebugger) {
    var targetName = '';
    if (targetInfo.type !== 'iframe') {
      var parsedURL = targetInfo.url.asParsedURL();
      targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() :
                               '#' + (++SDK.ChildTargetManager._lastAnonymousTargetId);
    }
    var target = this._targetManager.createTarget(
        targetInfo.targetId, targetName, this._capabilitiesForType(targetInfo.type),
        this._createChildConnection.bind(this, this._targetAgent, sessionId), this._parentTarget);

    if (SDK.ChildTargetManager._attachCallback)
      SDK.ChildTargetManager._attachCallback({target, waitingForDebugger});
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string=} childTargetId
   */
  detachedFromTarget(sessionId, childTargetId) {
    this._childConnections.get(sessionId).onDisconnect.call(null, 'target terminated');
    this._childConnections.delete(sessionId);
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string} message
   * @param {string=} childTargetId
   */
  receivedMessageFromTarget(sessionId, message, childTargetId) {
    var connection = this._childConnections.get(sessionId);
    if (connection)
      connection.onMessage.call(null, message);
  }

  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} sessionId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createChildConnection(agent, sessionId, params) {
    var connection = new SDK.ChildConnection(agent, sessionId, params);
    this._childConnections.set(sessionId, connection);
    return connection;
  }
};

SDK.ChildTargetManager._lastAnonymousTargetId = 0;

/** @type {function({target: !SDK.Target, waitingForDebugger: boolean})|undefined} */
SDK.ChildTargetManager._attachCallback;