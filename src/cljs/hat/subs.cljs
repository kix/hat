(ns hat.subs
  (:require [re-frame.core :as rf]
            [hat.scoring :as scoring]
            [hat.stats :as stats]))

(rf/reg-sub
 :game
 (fn [db _]
   (:game db)))

(rf/reg-sub
 :game/phase
 :<- [:game]
 (fn [game _]
   (:phase game)))

(rf/reg-sub
 :game/settings
 :<- [:game]
 (fn [game _]
   (:settings game)))

(rf/reg-sub
 :game/teams
 :<- [:game]
 (fn [game _]
   (:teams game)))

(rf/reg-sub
 :game/current-team-index
 :<- [:game]
 (fn [game _]
   (:current-team-index game 0)))

(rf/reg-sub
 :game/current-team
 :<- [:game/teams]
 :<- [:game/current-team-index]
 (fn [[teams idx] _]
   (get teams idx (first teams))))

(rf/reg-sub
 :game/hat-count
 :<- [:game]
 (fn [game _]
   (count (:hat game))))

(rf/reg-sub
 :game/current-word
 :<- [:game]
 (fn [game _]
   (:current-word game)))

(rf/reg-sub
 :game/time-remaining
 :<- [:game]
 (fn [game _]
   (:time-remaining-sec game 0)))

(rf/reg-sub
 :game/history
 :<- [:game]
 (fn [game _]
   (:history game [])))

(rf/reg-sub
 :game/leaderboard
 :<- [:game/teams]
 :<- [:game/history]
 (fn [[teams history] _]
   (stats/sort-teams-by-score teams history)))

(rf/reg-sub
 :game/team-scores
 :<- [:game/teams]
 :<- [:game/history]
 (fn [[teams history] _]
   (into {} (map (fn [t] [(:id t) (scoring/team-score history (:id t))]) teams))))

(rf/reg-sub
 :theme
 (fn [db _]
   (:theme db "dark")))
