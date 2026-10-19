(ns hat.stats-test
  (:require [cljs.test :refer [deftest is testing]]
            [hat.stats :as stats]))

(deftest stats-test
  (testing "sort-teams-by-score"
    (let [teams [{:id "t1" :name "Team 1"}
                 {:id "t2" :name "Team 2"}]
          history [{:team-id "t1" :result :guessed}
                   {:team-id "t2" :result :guessed}
                   {:team-id "t2" :result :guessed}]]
      (is (= ["t2" "t1"] (mapv :id (stats/sort-teams-by-score teams history))))))

  (testing "hardest-word and easiest-word"
    (let [history [{:word "медленно" :result :guessed :time-ms 8000}
                   {:word "быстро" :result :guessed :time-ms 1200}
                   {:word "таймаут" :result :timeout :time-ms 15000}]]
      (is (= "медленно" (:word (stats/hardest-word history))))
      (is (= "быстро" (:word (stats/easiest-word history))))))

  (testing "best-player"
    (let [p1 {:id "p1" :name "Player 1"}
          p2 {:id "p2" :name "Player 2"}
          p3 {:id "p3" :name "Player 3"}
          teams [{:id "t1" :players [p1 p2]}
                 {:id "t2" :players [p3]}]
          history [{:guesser-id "p1" :result :guessed}
                   {:guesser-id "p2" :result :guessed}
                   {:guesser-id "p2" :result :guessed}]]
      (is (= "p2" (get-in (stats/best-player teams history) [:player :id]))))))
