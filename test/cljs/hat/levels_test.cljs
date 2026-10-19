(ns hat.levels-test
  (:require [cljs.test :refer [deftest is testing]]
            [hat.levels :as levels]))

(deftest levels-test
  (testing "calculates level 1 for 0 XP"
    (let [lvl (levels/get-level-from-xp 0)]
      (is (= 1 (:level lvl)))
      (is (= 0 (:progress-percent lvl)))
      (is (= 150 (:next-level-xp lvl)))))

  (testing "calculates level 2 for 200 XP"
    (let [lvl (levels/get-level-from-xp 200)]
      (is (= 2 (:level lvl)))
      (is (= 150 (:current-level-min-xp lvl)))
      (is (= 400 (:next-level-xp lvl)))
      (is (= 50 (:xp-into-level lvl)))
      (is (= 20 (:progress-percent lvl)))))

  (testing "calculates level 10 for 8000+ XP"
    (let [lvl (levels/get-level-from-xp 8000)]
      (is (= 10 (:level lvl)))
      (is (= 0 (:progress-percent lvl)))))

  (testing "calculates level 11 for 10500 XP"
    (let [lvl (levels/get-level-from-xp 10500)]
      (is (= 11 (:level lvl)))
      (is (= 0 (:progress-percent lvl)))))

  (testing "calculates game XP breakdown correctly"
    (let [history [{:result :guessed :guesser-id "u1" :describer-id "u2" :time-ms 2500 :team-id "t1"}
                   {:result :guessed :guesser-id "u1" :describer-id "u2" :time-ms 4000 :team-id "t1"}
                   {:result :foul :guesser-id "u1" :describer-id "u2" :time-ms 1000 :team-id "t1"}]
          xp (levels/calculate-game-xp history "u1" true "t1")]
      (is (= 50 (:participation-xp xp)))
      (is (= 100 (:victory-xp xp)))
      (is (= 20 (:words-xp xp)))
      (is (= 5 (:fast-words-bonus-xp xp)))
      (is (= 0 (:clean-game-bonus-xp xp)))
      (is (= 175 (:total-xp xp)))))

  (testing "calculates total player XP including achievements"
    (let [participations [{:is_winner true
                           :team_name "t1"
                           :games {:history_data [{:result :guessed :guesser-id "u1" :describer-id "u2" :time-ms 2000 :team-id "t1"}]}}]
          achievements [{:id "lightning" :unlocked true}
                        {:id "champion" :unlocked false}]
          result (levels/calculate-total-player-xp participations "u1" achievements)]
      (is (= 195 (:games-xp result)))
      (is (= 100 (:achievements-xp result)))
      (is (= 295 (:total-xp result))))))
