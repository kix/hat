(ns hat.ui.components
  (:require [reagent.core :as r]
            [re-frame.core :as rf]
            ["@mantine/core" :refer [MantineProvider Container Paper Title Text Button Group Stack Badge Card Box ActionIcon Divider]]
            ["@tabler/icons-react" :refer [IconPlayerPlay IconCheck IconX IconPlayerSkipForward IconTrophy IconRotateClockwise IconFlame IconHourglass]]))

;; --- Setup Screen ---
(defn setup-screen []
  (let [teams @(rf/subscribe [:game/teams])
        settings @(rf/subscribe [:game/settings])]
    [:> Container {:size "xs" :py "xl"}
     [:> Paper {:shadow "md" :p "xl" :radius "lg" :withBorder true}
      [:> Stack {:spacing "lg"}
       [:> Group {:justify "center"}
        [:> Title {:order 1 :ta "center"} "🎩 Шляпа"]
        [:> Badge {:color "violet" :size "lg" :variant "light"} "ClojureScript"]]

       [:> Text {:c "dimmed" :size "sm" :ta "center"}
        "Объясняйте слова своей команде за отведенное время!"]

       [:> Divider]

       [:> Title {:order 4} "Команды"]
       [:> Stack {:spacing "sm"}
        (for [[idx team] (map-indexed vector teams)]
          ^{:key (:id team)}
          [:> Card {:withBorder true :p "sm" :radius "md"}
           [:> Group {:justify "space-between"}
            [:> Text {:fw 600} (:name team)]
            [:> Text {:size "xs" :c "dimmed"}
             (str (get-in team [:players 0 :name]) " и " (get-in team [:players 1 :name]))]]])]

       [:> Divider]

       [:> Title {:order 4} "Длительность раунда"]
       [:> Group {:grow true}
        (for [sec [30 60 120]]
          ^{:key sec}
          [:> Button {:variant (if (= (:round-duration-sec settings) sec) "filled" "light")
                      :color "violet"
                      :onClick #(rf/dispatch [:game/step :set-round-duration sec])}
           (str sec " сек")])]

       [:> Button {:size "xl"
                   :color "violet"
                   :radius "md"
                   :fullWidth true
                   :leftSection (r/as-element [:> IconPlayerPlay {:size 24}])
                   :onClick #(rf/dispatch [:game/start-game [{:word "Компьютер"}
                                                            {:word "Функция"}
                                                            {:word "Синтаксис"}
                                                            {:word "Макрос"}
                                                            {:word "Шляпа"}
                                                            {:word "Лисп"}
                                                            {:word "Алгоритм"}
                                                            {:word "Рекурсия"}]])}
        "Начать игру!"]]]]))

;; --- Round Intro Screen ---
(defn round-intro-screen []
  (let [team @(rf/subscribe [:game/current-team])
        hat-count @(rf/subscribe [:game/hat-count])
        scores @(rf/subscribe [:game/team-scores])]
    [:> Container {:size "xs" :py "xl"}
     [:> Paper {:shadow "lg" :p "xl" :radius "lg" :withBorder true}
      [:> Stack {:spacing "lg" :align "center"}
       [:> Badge {:color "violet" :size "xl" :variant "filled"} "Следующий раунд"]
       [:> Title {:order 2 :ta "center"} (:name team)]

       [:> Group {:justify "center"}
        [:> Badge {:color "gray" :size "lg"}
         (str "Счёт: " (get scores (:id team) 0) " очков")]]

       [:> Card {:withBorder true :p "md" :radius "md" :w "100%"}
        [:> Stack {:spacing "xs" :align "center"}
         [:> Text {:size "sm" :c "dimmed"} "Роли в этом раунде:"]
         [:> Text {:fw 600} (str "Загадывает: " (get-in team [:players 0 :name]))]
         [:> Text {:fw 600} (str "Отгадывает: " (get-in team [:players 1 :name]))]]]

       [:> Group {:spacing "xs"}
        [:> Text {:c "dimmed" :size "sm"} "Осталось слов в шляпе:"]
        [:> Badge {:color "teal" :variant "light" :size "lg"} (str hat-count)]]

       [:> Button {:size "xl"
                   :color "green"
                   :radius "md"
                   :fullWidth true
                   :leftSection (r/as-element [:> IconPlayerPlay {:size 24}])
                   :onClick #(rf/dispatch [:game/start-round])}
        "Погнали!"]]]]))

;; --- Round Playing Screen ---
(defn round-playing-screen []
  (let [current-word @(rf/subscribe [:game/current-word])
        time-left @(rf/subscribe [:game/time-remaining])
        team @(rf/subscribe [:game/current-team])
        hat-count @(rf/subscribe [:game/hat-count])]
    [:> Container {:size "xs" :py "xl"}
     [:> Stack {:spacing "xl"}
      [:> Group {:justify "space-between"}
       [:> Badge {:color "violet" :size "lg"} (:name team)]
       [:> Badge {:color (if (<= time-left 10) "red" "teal") :size "xl" :variant "filled"}
        (str "⏱ " time-left "с")]
       [:> Badge {:color "gray" :size "lg"} (str "В шляпе: " hat-count)]]

      [:> Paper {:shadow "xl"
                 :p "3rem"
                 :radius "xl"
                 :withBorder true
                 :style {:minHeight "220px"
                         :display "flex"
                         :alignItems "center"
                         :justifyContent "center"
                         :background "linear-gradient(135deg, rgba(130, 80, 220, 0.15), rgba(40, 160, 220, 0.15))"}}
       [:> Title {:order 1 :ta "center" :style {:fontSize "2.5rem" :letterSpacing "1px"}}
        (or (:word current-word) "—")]]

      [:> Group {:grow true :spacing "md"}
       [:> Button {:size "xl"
                   :color "red"
                   :variant "light"
                   :leftSection (r/as-element [:> IconX {:size 22}])
                   :onClick #(rf/dispatch [:game/foul-word])}
        "Нарушение"]

       [:> Button {:size "xl"
                   :color "orange"
                   :variant "light"
                   :leftSection (r/as-element [:> IconPlayerSkipForward {:size 22}])
                   :onClick #(rf/dispatch [:game/skip-word])}
        "Пас"]

       [:> Button {:size "xl"
                   :color "green"
                   :variant "filled"
                   :leftSection (r/as-element [:> IconCheck {:size 24}])
                   :onClick #(rf/dispatch [:game/guess-word])}
        "Угадано!"]]]]))

;; --- Round Review Screen ---
(defn round-review-screen []
  (let [history @(rf/subscribe [:game/history])
        team @(rf/subscribe [:game/current-team])
        hat-count @(rf/subscribe [:game/hat-count])]
    [:> Container {:size "xs" :py "xl"}
     [:> Paper {:shadow "lg" :p "xl" :radius "lg" :withBorder true}
      [:> Stack {:spacing "lg"}
       [:> Title {:order 2 :ta "center"} "Итоги раунда"]
       [:> Text {:c "dimmed" :size "sm" :ta "center"}
        (str "Команда: " (:name team))]

       [:> Divider]

       [:> Stack {:spacing "xs"}
        (for [[idx rec] (map-indexed vector (reverse (take 10 history)))]
          ^{:key idx}
          [:> Card {:withBorder true :p "xs" :radius "sm"}
           [:> Group {:justify "space-between"}
            [:> Text {:fw 500} (:word rec)]
            [:> Badge {:color (case (:result rec)
                                :guessed "green"
                                :skipped "orange"
                                :foul "red"
                                "gray")}
             (name (:result rec))]]])]

       [:> Button {:size "lg"
                   :color "violet"
                   :fullWidth true
                   :onClick #(rf/dispatch [:game/confirm-review])}
        (if (zero? hat-count) "Посмотреть результаты" "Следующий раунд")]]]]))

;; --- Game Over Screen ---
(defn game-over-screen []
  (let [leaderboard @(rf/subscribe [:game/leaderboard])
        history @(rf/subscribe [:game/history])
        winner (first leaderboard)]
    [:> Container {:size "xs" :py "xl"}
     [:> Paper {:shadow "xl" :p "xl" :radius "xl" :withBorder true}
      [:> Stack {:spacing "xl" :align "center"}
       [:> Badge {:color "yellow" :size "xl" :variant "filled" :leftSection (r/as-element [:> IconTrophy {:size 18}])}
        "Игра завершена!"]

       [:> Title {:order 1 :ta "center"}
        (str "🏆 " (:name winner))]
       [:> Text {:size "lg" :c "dimmed" :ta "center"} "Победители игры!"]

       [:> Divider {:w "100%"}]

       [:> Title {:order 4} "Таблица результатов"]
       [:> Stack {:spacing "sm" :w "100%"}
        (for [[idx team] (map-indexed vector leaderboard)]
          ^{:key (:id team)}
          [:> Card {:withBorder true :p "sm" :radius "md"}
           [:> Group {:justify "space-between"}
            [:> Group
             [:> Badge {:color (if (zero? idx) "yellow" "gray") :circle true} (str (inc idx))]
             [:> Text {:fw 600} (:name team)]]
            [:> Badge {:color "violet" :size "lg"}
             (str (get-in team [:rounds-played]) " раундов")]]])]

       [:> Button {:size "xl"
                   :color "violet"
                   :radius "md"
                   :fullWidth true
                   :leftSection (r/as-element [:> IconRotateClockwise {:size 22}])
                   :onClick #(rf/dispatch [:game/exit-game])}
        "Сыграть ещё раз"]]]]))
