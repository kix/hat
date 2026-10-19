(ns hat.scoring-test
  (:require [cljs.test :refer [deftest is testing]]
            [hat.scoring :as scoring]))

(deftest score-delta-test
  (testing "returns correct deltas"
    (is (= 1 (scoring/score-delta :guessed)))
    (is (= -1 (scoring/score-delta :skipped)))
    (is (= -1 (scoring/score-delta :foul)))
    (is (= 0 (scoring/score-delta :timeout)))))

(deftest team-score-test
  (testing "empty history returns 0"
    (is (= 0 (scoring/team-score [] "team-1"))))

  (testing "sums scores for specific team only"
    (let [history [{:word "яблоко" :result :guessed :team-id "team-1"}
                   {:word "груша" :result :skipped :team-id "team-1"}
                   {:word "банан" :result :guessed :team-id "team-1"}
                   {:word "апельсин" :result :foul :team-id "team-1"}
                   {:word "киви" :result :timeout :team-id "team-1"}
                   {:word "слива" :result :guessed :team-id "team-2"}]]
      (is (= 0 (scoring/team-score history "team-1")))
      (is (= 1 (scoring/team-score history "team-2")))
      (is (= 0 (scoring/team-score history "team-3"))))))

(deftest player-individual-score-test
  (testing "awards +1 to guesser and describer when guessed"
    (let [history [{:word "кот" :result :guessed :team-id "t1" :describer-id "p1" :guesser-id "p2"}]]
      (is (= 1 (scoring/player-individual-score history "p1")))
      (is (= 1 (scoring/player-individual-score history "p2")))
      (is (= 0 (scoring/player-individual-score history "p3")))))

  (testing "deducts -1 from describer when skipped or foul, leaves guesser untouched"
    (let [history [{:word "собака" :result :skipped :team-id "t1" :describer-id "p1" :guesser-id "p2"}
                   {:word "лиса" :result :foul :team-id "t1" :describer-id "p1" :guesser-id "p2"}
                   {:word "волк" :result :timeout :team-id "t1" :describer-id "p1" :guesser-id "p2"}]]
      (is (= -2 (scoring/player-individual-score history "p1")))
      (is (= 0 (scoring/player-individual-score history "p2"))))))

(deftest stage-score-test
  (testing "filters history by stage-index"
    (let [history [{:word "слово 1" :result :guessed :team-id "t1" :describer-id "p1" :guesser-id "p2" :stage-index 1}
                   {:word "слово 2" :result :guessed :team-id "t1" :describer-id "p1" :guesser-id "p2" :stage-index 2}
                   {:word "слово 3" :result :skipped :team-id "t1" :describer-id "p1" :guesser-id "p2" :stage-index 2}]]
      (is (= 1 (scoring/team-stage-score history "t1" 1)))
      (is (= 0 (scoring/team-stage-score history "t1" 2)))
      (is (= 0 (scoring/team-stage-score history "t1" 3)))
      (is (= 1 (scoring/player-individual-stage-score history "p1" 1)))
      (is (= 0 (scoring/player-individual-stage-score history "p1" 2)))))

  (testing "defaults stage-index to 1 when missing"
    (let [history [{:word "слово" :result :guessed :team-id "t1" :describer-id "p1" :guesser-id "p2"}]]
      (is (= 1 (scoring/team-stage-score history "t1" 1)))
      (is (= 0 (scoring/team-stage-score history "t1" 2))))))
