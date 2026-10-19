(ns hat.events
  (:require [re-frame.core :as rf]
            [hat.game :as game]))

;; Database initialization
(rf/reg-event-db
 :initialize-db
 (fn [_ _]
   {:game (game/initial-state)
    :theme "dark"}))

;; Forward game actions to pure game reducer
(rf/reg-event-db
 :game/step
 (fn [db [_ event-type payload]]
   (update db :game #(game/step-game % [event-type payload]))))

(rf/reg-event-fx
 :game/start-round
 (fn [{:keys [db]} _]
   {:db (update db :game #(game/step-game % [:start-round nil]))
    :fx [[:dispatch [:game/schedule-tick]]]}))

(rf/reg-fx
 :interval
 (fn [{:keys [action id ms]}]
   (case action
     :start
     (let [interval-id (js/setInterval #(rf/dispatch [:game/tick]) ms)]
       (js/window.sessionStorage.setItem "game_timer_id" (str interval-id)))
     :stop
     (let [stored (js/window.sessionStorage.getItem "game_timer_id")]
       (when stored
         (js/clearInterval (js/parseInt stored 10))
         (js/window.sessionStorage.removeItem "game_timer_id"))))))

(rf/reg-event-db
 :game/tick
 (fn [db _]
   (if (= (get-in db [:game :phase]) :round-playing)
     (update db :game #(game/step-game % [:tick nil]))
     db)))

;; Shortcuts
(rf/reg-event-db :game/guess-word (fn [db _] (update db :game #(game/step-game % [:word-guessed nil]))))
(rf/reg-event-db :game/skip-word (fn [db _] (update db :game #(game/step-game % [:word-skipped nil]))))
(rf/reg-event-db :game/foul-word (fn [db _] (update db :game #(game/step-game % [:word-foul nil]))))
(rf/reg-event-db :game/confirm-review (fn [db _] (update db :game #(game/step-game % [:confirm-review nil]))))
(rf/reg-event-db :game/exit-game (fn [db _] (update db :game #(game/step-game % [:exit-game nil]))))
(rf/reg-event-db :game/start-game (fn [db [_ words]] (update db :game #(game/step-game % [:start-game {:words words}]))))

(rf/reg-event-db
 :set-theme
 (fn [db [_ theme]]
   (assoc db :theme theme)))
