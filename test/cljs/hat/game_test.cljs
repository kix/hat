(ns hat.game-test
  (:require [cljs.test :refer [deftest is testing]]
            [hat.game :as game]))

(deftest game-reducer-test
  (testing "initial state has setup phase"
    (let [s (game/initial-state)]
      (is (= :setup (:phase s)))
      (is (= 2 (count (:teams s))))))

  (testing "start-game transitions to :round-intro"
    (let [s (game/initial-state)
          words [{:word "слово1"} {:word "слово2"}]
          s2 (game/step-game s [:start-game {:words words}])]
      (is (= :round-intro (:phase s2)))
      (is (= 2 (count (:hat s2))))))

  (testing "start-round draws first word and sets :round-playing"
    (let [s (-> (game/initial-state)
                (game/step-game [:start-game {:words [{:word "слово1"} {:word "слово2"}]}])
                (game/step-game [:start-round nil]))]
      (is (= :round-playing (:phase s)))
      (is (some? (:current-word s)))
      (is (= 1 (count (:hat s))))
      (is (= 60 (:time-remaining-sec s)))))

  (testing "guessing all words transitions to :round-end or :round-review"
    (let [s (-> (game/initial-state)
                (game/step-game [:start-game {:words [{:word "слово1"}]}])
                (game/step-game [:start-round nil])
                (game/step-game [:word-guessed nil]))]
      (is (= :round-end (:phase s)))
      (is (= 1 (count (:history s))))
      (is (= :guessed (:result (first (:history s)))))))

  (testing "timeout returns current word to hat"
    (let [s (-> (game/initial-state)
                (game/step-game [:start-game {:words [{:word "слово1"} {:word "слово2"}]}])
                (game/step-game [:start-round nil])
                (game/step-game [:timeout nil]))]
      (is (= :round-review (:phase s)))
      (is (= 2 (count (:hat s))))
      (is (= 1 (count (:history s))))
      (is (= :timeout (:result (first (:history s))))))))
