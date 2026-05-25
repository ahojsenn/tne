This is my backlog

now I try this:
https://github.com/ahojsenn/tne/issues



BACKLOG:
- happenings einbauen, so dass ich für jedes event/Konferenz ein happening erstellen kann
- client Store aufräumen...
- observe: catchup auf der ./ Seite zeigt nach einiger Zeit keine Würfe mehr an
  --> catchup.vue bekommt keine Würfe mehr als event 
  global.io.to('catchup-channel').emit("catchup-event", data) kommt nicht mehr an.
  log: emitting catchup-event to catchup-channel members: undefined
  kann einfach sein, dass das nur im dev-mode aurftritt, weil der server neu gestartet wird...

DONE:
- Bitte speichere auch "Thrown Stuff	Hero Hitlist	Tomato Trolls"
  --> gameLogger.ts speichert jetzt thrownStuffSummary als Spalte D (vor heroSummary/trollSummary) [DONE]
- Bei "game over" eine Zusammenfassung des Spiels in Google Sheets Tabellenblatt "games" speichern:
  event-id, Datum/Uhrzeit, Spielart, Hero-Hitlist (eine Zelle), Troll-Score (eine Zelle).
  Falls das Tabellenblatt "games" nicht existiert, wird es automatisch angelegt. [DONE]
- Autorisierung für die gameconsole einbauen
- Persistenzschicht einbauen, bspw google sheets...
- game score counts differently on client and server
  idea: send the score from the server wo the client wich each throw
  ? game score counting on the server or on the client or both?
  --> scores should be counted on the server and sent to the client
- throw reload shoud set h_m_s (score to zero)
- undstand the difference between socket.io rooms and the sometimes used term 'channel'
- get a better understanding of the socket.io API 
- get a better understanding of the websocket standard
- update the documentation in README.md
- catchup.vue does not need to be a hero... 
- BUG: too many heroes in game, reset hero hit list does not work
  --> the socket.on('disconnect',... created wrongly new heroes
- fix gamescore in gamemode --> it is not counting at all:
   gameMode.isOn was not set