(ns dirac.automation.devtools
  (:require [devtools.core :as devtools]
            [devtools.prefs :as devtools-prefs]
            [dirac.automation.logging :refer [error info log warn]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [oops.core :refer [oapply ocall oget oset!]]))

(defn init-devtools! [& [config]]
  (devtools-prefs/set-pref! :dont-detect-custom-formatters true)
  (when-let [devtools-prefs (:devtools-prefs config)]                                                                         ; override devtools prefs
    (log "devtools override: set prefs " devtools-prefs)
    (devtools-prefs/merge-prefs! devtools-prefs))
  (if-not (:do-not-install-devtools config)                                                                                   ; override devtools features/installation
    (let [features-to-enable (cond-> []
                               (not (:do-not-enable-custom-formatters config)) (conj :formatters)
                               ; disable support for :hints for now
                               ; sync http request interferes with test transcripts
                               ; "JS.wrn> hints.cljs:55 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/."
                               ;(not (:do-not-enable-sanity-hints config)) (conj :hints)
                               (not (:do-not-enable-async config)) (conj :async))]
      (devtools/install! features-to-enable))
    (log "devtools override: do not install")))
