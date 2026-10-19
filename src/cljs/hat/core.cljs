(ns hat.core
  (:require [reagent.core :as r]
            [re-frame.core :as rf]
            ["react-dom/client" :as rdom-client]
            ["@mantine/core" :refer [MantineProvider]]
            [hat.events]
            [hat.subs]
            [hat.ui.components :as ui]))

(defonce root-ref (atom nil))

(defn root-component []
  (let [phase @(rf/subscribe [:game/phase])]
    [:> MantineProvider {:defaultColorScheme "dark"}
     [:div {:style {:minHeight "100vh"
                    :backgroundColor "#141517"
                    :color "#fff"
                    :fontFamily "Commissioner, sans-serif"}}
      (case phase
        :setup [ui/setup-screen]
        :round-intro [ui/round-intro-screen]
        :round-playing [ui/round-playing-screen]
        :round-review [ui/round-review-screen]
        :game-over [ui/game-over-screen]
        [ui/setup-screen])]]))

(defn ^:dev/after-load after-load! []
  (when-let [root @root-ref]
    (.render root (r/as-element [root-component]))))

(defn ^:export init! []
  (rf/dispatch-sync [:initialize-db])
  (when-let [el (js/document.getElementById "root")]
    (let [root (.createRoot rdom-client el)]
      (reset! root-ref root)
      (.render root (r/as-element [root-component])))))
