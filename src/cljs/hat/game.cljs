(ns hat.game
  (:require [hat.scoring :as scoring]))

(defn generate-id []
  (str "id_" (subs (.toString (js/Math.random) 36) 2 9)))


(defn create-team [id name p1-name p2-name]
  {:id (or id (generate-id))
   :name name
   :players [{:id (generate-id) :name p1-name}
             {:id (generate-id) :name p2-name}]
   :rounds-played 0})

(def default-settings
  {:round-duration-sec 60
   :allow-skip false
   :word-count 20
   :difficulty-level 0.5
   :sound-enabled true
   :enable-review true
   :game-format :single})

(defn initial-state []
  {:phase :setup
   :settings default-settings
   :teams [(create-team "t1" "Команда 1" "Игрок 1" "Игрок 2")
           (create-team "t2" "Команда 2" "Игрок 3" "Игрок 4")]
   :dictionary []
   :hat []
   :words-pool []
   :current-stage-index 1
   :current-word nil
   :word-shown-at nil
   :time-remaining-sec 0
   :current-team-index 0
   :history []
   :current-modifier nil})

(defn get-current-roles [team roles-mode]
  (let [p1 (first (:players team))
        p2 (second (:players team))
        alternate? (= roles-mode :alternate)
        rounds (:rounds-played team 0)]
    (if (and alternate? (odd? rounds))
      {:describer p2 :guesser p1}
      {:describer p1 :guesser p2})))

(defn- build-word-record [state result]
  (let [team (nth (:teams state) (:current-team-index state))
        roles (get-current-roles team (get-in state [:settings :roles-mode] :alternate))
        word (:current-word state)
        shown-at (or (:word-shown-at state) (.now js/Date))]
    {:word (:word word)
     :difficulty (:difficulty word :easy)
     :team-id (:id team)
     :describer-id (:id (:describer roles))
     :guesser-id (:id (:guesser roles))
     :result result
     :time-ms (- (.now js/Date) shown-at)
     :round-index (:rounds-played team)
     :stage-index (get state :current-stage-index 1)}))

(defn- resolve-word [state result]
  (if-not (:current-word state)
    state
    (let [record (build-word-record state result)
          history (conj (:history state) record)
          hat (:hat state)]
      (if (empty? hat)
        (-> state
            (assoc :history history
                   :current-word nil
                   :word-shown-at nil)
            (assoc :phase :round-end))
        (let [next-word (first hat)
              rest-hat (vec (rest hat))]
          (assoc state
                 :history history
                 :hat rest-hat
                 :current-word next-word
                 :word-shown-at (.now js/Date)))))))

(defn step-game
  "Pure state machine reducer for the game."
  [state [event-type payload]]
  (case event-type
    :set-round-duration
    (assoc-in state [:settings :round-duration-sec] payload)

    :set-allow-skip
    (assoc-in state [:settings :allow-skip] payload)

    :set-word-count
    (assoc-in state [:settings :word-count] payload)

    :start-game
    (let [words (or (:words payload) (:hat state))
          count (min (count words) (get-in state [:settings :word-count]))
          shuffled (vec (take count (shuffle words)))]
      (assoc state
             :phase :round-intro
             :hat shuffled
             :words-pool shuffled
             :current-stage-index 1
             :current-team-index 0
             :history []
             :current-word nil
             :word-shown-at nil))

    :start-round
    (let [hat (:hat state)
          [word & rest-hat] hat]
      (assoc state
             :phase :round-playing
             :current-word word
             :hat (vec rest-hat)
             :word-shown-at (.now js/Date)
             :time-remaining-sec (get-in state [:settings :round-duration-sec] 60)))

    :tick
    (let [remaining (dec (:time-remaining-sec state))]
      (if (<= remaining 0)
        (-> state
            (assoc :time-remaining-sec 0)
            (step-game [:timeout nil]))
        (assoc state :time-remaining-sec remaining)))

    :word-guessed
    (resolve-word state :guessed)

    :word-skipped
    (if (get-in state [:settings :allow-skip])
      (resolve-word state :skipped)
      state)

    :word-foul
    (resolve-word state :foul)

    :timeout
    (let [curr (:current-word state)
          record (when curr (build-word-record state :timeout))
          history (if record (conj (:history state) record) (:history state))
          hat (if curr (conj (:hat state) curr) (:hat state))]
      (-> state
          (assoc :history history
                 :hat (vec hat)
                 :current-word nil
                 :word-shown-at nil
                 :phase :round-end)
          (step-game [:end-round nil])))

    :end-round
    (let [curr-idx (:current-team-index state)
          updated-teams (vec (map-indexed
                              (fn [idx team]
                                (if (= idx curr-idx)
                                  (update team :rounds-played inc)
                                  team))
                              (:teams state)))
          next-team-idx (mod (inc curr-idx) (count updated-teams))
          enable-review? (get-in state [:settings :enable-review] true)
          hat-empty? (empty? (:hat state))]
      (cond
        (and hat-empty? (not enable-review?))
        (assoc state :phase :game-over :teams updated-teams :current-team-index next-team-idx)

        (not enable-review?)
        (assoc state :phase :round-intro :teams updated-teams :current-team-index next-team-idx)

        :else
        (assoc state :phase :round-review :teams updated-teams :current-team-index next-team-idx)))

    :confirm-review
    (if (empty? (:hat state))
      (assoc state :phase :game-over)
      (assoc state :phase :round-intro))

    :exit-game
    (assoc (initial-state)
           :teams (mapv #(assoc % :rounds-played 0) (:teams state))
           :settings (:settings state))

    ;; Fallback
    state))
