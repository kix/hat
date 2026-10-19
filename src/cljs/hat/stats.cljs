(ns hat.stats
  (:require [hat.scoring :as scoring]))

(defn sort-teams-by-score
  "Sorts teams descending by their total score in history."
  [teams history]
  (sort-by #(scoring/team-score history (:id %)) > teams))

(defn individual-leaderboard
  "Computes individual player statistics sorted by score, guessed, and explained."
  [players history]
  (let [stats (map
               (fn [player]
                 (let [p-id (:id player)
                       guessed (count (filter #(and (= (:guesser-id %) p-id) (= (:result %) :guessed)) history))
                       explained (count (filter #(and (= (:describer-id %) p-id) (= (:result %) :guessed)) history))
                       fouls (count (filter #(and (= (:describer-id %) p-id) (= (:result %) :foul)) history))
                       skips (count (filter #(and (= (:describer-id %) p-id) (= (:result %) :skipped)) history))
                       score (- (+ guessed explained) (+ fouls skips))]
                   {:player player
                    :score score
                    :guessed guessed
                    :explained explained
                    :fouls fouls
                    :skips skips}))
               players)]
    (sort-by (juxt (comp - :score)
                   (comp - :guessed)
                   (comp - :explained))
             stats)))

(defn hardest-word
  "Returns the guessed word with the longest guessing time."
  [history]
  (let [guessed (filter #(= (:result %) :guessed) history)]
    (when (seq guessed)
      (apply max-key (fn [rec] (or (:time-ms rec) 0)) guessed))))

(defn easiest-word
  "Returns the guessed word with the shortest guessing time."
  [history]
  (let [guessed (filter #(= (:result %) :guessed) history)]
    (when (seq guessed)
      (apply min-key (fn [rec] (or (:time-ms rec) 0)) guessed))))

(defn best-player
  "Finds the player across all teams who guessed the most words."
  [teams history]
  (let [candidates (for [team teams
                         player (:players team)
                         :let [guessed (count (filter #(and (= (:result %) :guessed)
                                                            (= (:guesser-id %) (:id player)))
                                                      history))]
                         :when (pos? guessed)]
                     {:team team
                      :player player
                      :guessed-count guessed})]
    (when (seq candidates)
      (apply max-key :guessed-count candidates))))
