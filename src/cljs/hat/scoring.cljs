(ns hat.scoring)

(defn score-delta
  "Returns the score delta for a given word outcome."
  [result]
  (case result
    :guessed 1
    (:skipped :foul) -1
    :timeout 0
    0))

(defn team-score
  "Calculates total score for a team from the game history."
  [history team-id]
  (reduce
   (fn [sum record]
     (if (= (:team-id record) team-id)
       (+ sum (score-delta (:result record)))
       sum))
   0
   history))

(defn player-individual-score
  "Calculates total individual score for a player."
  [history player-id]
  (reduce
   (fn [score {:keys [guesser-id describer-id result]}]
     (let [g-score (if (and (= guesser-id player-id) (= result :guessed)) 1 0)
           d-score (if (= describer-id player-id)
                     (case result
                       :guessed 1
                       (:skipped :foul) -1
                       0)
                     0)]
       (+ score g-score d-score)))
   0
   history))

(defn team-stage-score
  "Calculates team score for a specific game stage (1, 2, or 3)."
  [history team-id stage-index]
  (team-score
   (filter #(= (get % :stage-index 1) stage-index) history)
   team-id))

(defn player-individual-stage-score
  "Calculates player individual score for a specific game stage."
  [history player-id stage-index]
  (player-individual-score
   (filter #(= (get % :stage-index 1) stage-index) history)
   player-id))
