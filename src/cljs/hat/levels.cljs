(ns hat.levels)

(def level-thresholds
  [{:level 1  :min-xp 0    :title-key "levels.rank1"  :badge-color "gray"   :emoji "🧢"}
   {:level 2  :min-xp 150  :title-key "levels.rank2"  :badge-color "blue"   :emoji "🎩"}
   {:level 3  :min-xp 400  :title-key "levels.rank3"  :badge-color "cyan"   :emoji "🎓"}
   {:level 4  :min-xp 800  :title-key "levels.rank4"  :badge-color "teal"   :emoji "🧠"}
   {:level 5  :min-xp 1400 :title-key "levels.rank5"  :badge-color "yellow" :emoji "⚡"}
   {:level 6  :min-xp 2200 :title-key "levels.rank6"  :badge-color "grape"  :emoji "🔮"}
   {:level 7  :min-xp 3200 :title-key "levels.rank7"  :badge-color "orange" :emoji "🏆"}
   {:level 8  :min-xp 4500 :title-key "levels.rank8"  :badge-color "red"    :emoji "👑"}
   {:level 9  :min-xp 6000 :title-key "levels.rank9"  :badge-color "pink"   :emoji "🌟"}
   {:level 10 :min-xp 8000 :title-key "levels.rank10" :badge-color "violet" :emoji "⚜️"}])

(defn get-level-from-xp [total-xp]
  (let [xp (max 0 (int (js/Math.floor total-xp)))
        max-threshold (last level-thresholds)]
    (if (>= xp (:min-xp max-threshold))
      (let [extra-xp (- xp (:min-xp max-threshold))
            additional-levels (int (js/Math.floor (/ extra-xp 2500)))
            lvl (+ (:level max-threshold) additional-levels)
            lvl-min-xp (+ (:min-xp max-threshold) (* additional-levels 2500))
            lvl-next-xp (+ lvl-min-xp 2500)]
        {:level lvl
         :total-xp xp
         :title-key (:title-key max-threshold)
         :badge-color (:badge-color max-threshold)
         :emoji (:emoji max-threshold)
         :current-level-min-xp lvl-min-xp
         :next-level-xp lvl-next-xp
         :xp-into-level (- xp lvl-min-xp)
         :xp-for-next-level 2500
         :progress-percent (min 100 (int (js/Math.round (* (/ (- xp lvl-min-xp) 2500) 100))))})
      (let [idx (loop [i (dec (count level-thresholds))]
                  (if (or (<= i 0) (>= xp (:min-xp (nth level-thresholds i))))
                    i
                    (recur (dec i))))
            current-threshold (nth level-thresholds idx)
            next-threshold (get level-thresholds (inc idx))
            next-min-xp (or (:min-xp next-threshold) (+ (:min-xp current-threshold) 2000))
            xp-into-level (- xp (:min-xp current-threshold))
            xp-for-next-level (- next-min-xp (:min-xp current-threshold))
            progress-percent (if (pos? xp-for-next-level)
                               (min 100 (max 0 (int (js/Math.round (* (/ xp-into-level xp-for-next-level) 100)))))
                               100)]
        {:level (:level current-threshold)
         :total-xp xp
         :title-key (:title-key current-threshold)
         :badge-color (:badge-color current-threshold)
         :emoji (:emoji current-threshold)
         :current-level-min-xp (:min-xp current-threshold)
         :next-level-xp next-min-xp
         :xp-into-level xp-into-level
         :xp-for-next-level xp-for-next-level
         :progress-percent progress-percent}))))

(defn calculate-game-xp
  ([history]
   (calculate-game-xp history nil false nil))
  ([history user-id is-winner? team-id]
   (let [participation-xp 50
         victory-xp (if is-winner? 100 0)
         words (if user-id
                 (filter (fn [rec]
                           (and (= (:result rec) :guessed)
                                (or (= (:guesser-id rec) user-id)
                                    (= (:describer-id rec) user-id))))
                         history)
                 (filter #(= (:result %) :guessed) history))
         words-count (count words)
         fast-words-count (count (filter #(and (:time-ms %) (< (:time-ms %) 3000)) words))
         words-xp (* words-count 10)
         fast-words-bonus-xp (* fast-words-count 5)
         fouls (if (and is-winner? team-id)
                 (count (filter #(and (= (:team-id %) team-id) (= (:result %) :foul)) history))
                 1)
         clean-game-bonus-xp (if (and is-winner? team-id (zero? fouls)) 30 0)
         total-xp (+ participation-xp victory-xp words-xp fast-words-bonus-xp clean-game-bonus-xp)]
     {:total-xp total-xp
      :participation-xp participation-xp
      :victory-xp victory-xp
      :words-xp words-xp
      :fast-words-bonus-xp fast-words-bonus-xp
      :clean-game-bonus-xp clean-game-bonus-xp
      :words-count words-count
      :fast-words-count fast-words-count})))

(def achievement-xp-rewards
  {"lightning" 100
   "erudite" 150
   "ironNerves" 150
   "champion" 250
   "telepath" 200
   "veteran" 250
   "perfectDuo" 150
   "cleanGame" 150
   "streakMaster" 150
   "partyAnimal" 100
   "customHat" 100
   "worldTraveler" 100})

(defn calculate-total-player-xp
  [participations user-id achievements]
  (let [games-xp (reduce
                  (fn [sum part]
                    (let [history (get-in part [:games :history-data] (get-in part [:games :history_data] []))
                          is-winner? (boolean (:is_winner part))
                          team-id (or (:team_name part) (:team-name part))
                          breakdown (calculate-game-xp history user-id is-winner? team-id)]
                      (+ sum (:total-xp breakdown))))
                  0
                  participations)
        achievements-xp (reduce
                         (fn [sum ach]
                           (if (and (:unlocked ach) (get achievement-xp-rewards (:id ach)))
                             (+ sum (get achievement-xp-rewards (:id ach)))
                             sum))
                         0
                         achievements)]
    {:total-xp (+ games-xp achievements-xp)
     :games-xp games-xp
     :achievements-xp achievements-xp}))

