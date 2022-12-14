import './App.css';
import { React, useState, useEffect } from 'react';
import axios from 'axios';
import "nes.css/css/nes.min.css";
import { GameOnDisplay } from './components/GameOnDisplay';
import { GameOffDisplay } from './components/GameOffDisplay'
import { SidePanel } from './components/SidePanel';
import ReactHowler from 'react-howler';
import happyTune from './resources/happyTune.wav'


const baseUrl = 'https://tlkuno.pythonanywhere.com'

function App() {
  /* State variables for front end manipulation */
  const [input, setInput] = useState("")
  const [loadRequest, setLoadRequest] = useState("")
  const [userName, setUserName] = useState("")
  const [musicPlaying, setMusicPlaying] = useState(false)

  /* State Variables set by Server */
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadGames, setLoadGames] = useState([])
  const [gameState, setGameState] = useState({
    command: "",
    identifier: "",
    userIp: null,
    isPlaying: false,
    history: [],
    location: "",
    offMsg: "Uh Oh! Looks like something went wrong. Try re-loading your page.",
    output: "",
  })


  // on first page render, get the IP address of user
  useEffect(() => {
    const getIp = async () => {
      const res = await axios.get('https://geolocation-db.com/json/')
      const updatedItems = {
        "userIp": res.data.IPv4,
      }
      setGameState(gameState => ({
        ...gameState,
        ...updatedItems
      }))
    }
    getIp()
  }, []);

  // Once an IP address is found, ping the server with start command
  // Until it returns and sets the offMsg
  // While loop is so that if server is "sleeping", will ping again
  useEffect(() => {
    const startURL = baseUrl + '/start'
    axios.get(startURL, { params: { ip_address: gameState.userIp } })
      .then(function (response) {
        const updatedItems = {
          "offMsg": response.data.output
        }
        setLoadGames(response.data.loadGames)
        setGameState(gameState => ({
          ...gameState,
          ...updatedItems
        }))
      })

  }, [gameState.userIp])

  // Every time new output is returned, update the interaction display
  useEffect(() => {
    const newHistory = gameState.history.slice()
    // display a command if there was one
    if (gameState.command !== "") {
      newHistory.push({ 'type': 'user', 'content': gameState.command })
      document.getElementById('main_input').value = '';
    }
    // display the output if there was output
    if (gameState.output !== "") {
      newHistory.push({ 'type': 'bot', 'content': gameState.output })
    }
    // update history
    const updatedItems = {
      "history": newHistory,
      "command": "",
      "output": "",
    }
    setGameState(gameState => ({
      ...gameState,
      ...updatedItems
    }))
    setInput("")
  }, [gameState.output])


  // if a new offMsg is set, switch to game off display
  useEffect(() => {
    const updatedItems = {
      "command": "",
      "identifier": "",
      "history": [],
      "location": "",
      "output": "",
    }
    setGameState(gameState => ({
      ...gameState,
      ...updatedItems
    }))
    setIsPlaying(false)
  }, [gameState.offMsg])

  // To start a new game, ping the server /new
  // Response data will allow you to set initial gameState
  function newGame(e) {
    e.preventDefault()
    if (userName === "") {
      alert("Please enter a Username")
    } else if (loadGames.indexOf(userName) > -1) {
      alert("You already have a game with this Username")
    } else if (/^[a-zA-Z]+$/.test(userName)) {
      const newURL = baseUrl + '/new'
      axios.get(newURL, { params: { userName: userName, ip_address: gameState.userIp } })
        .then(function (response) {
          const updatedItems = {
            "identifier": response.data.identifier,
            "history": [],
            "location": response.data.location,
            "output": response.data.output,
          }
          setGameState(gameState => ({
            ...gameState,
            ...updatedItems
          }))
          setUserName("")
        })
        .then(() => {
          setIsPlaying(true)
          setMusicPlaying(true)
        }  
          )
    } else {
      alert("Whoops! Invalid Username. Username may only contain letters.")
    }
  }
  // To save the game, ping server /save
  // Will receive output string indicating outcome (succes/error)
  function saveGame(e) {
    e.preventDefault()
    const saveURL = baseUrl + '/save'
    axios.get(saveURL, { params: { identifier: gameState.identifier } })
      .then(function (response) {
        const updatedItems = {}
        updatedItems["output"] = response.data.output
        setGameState(gameState => ({
          ...gameState,
          ...updatedItems
        }))
      })
  }

  // To load a game, ping server /load
  // Response data will allow you to set the gameState
  // from the previously saved game's status 
  // toggle isPlaying to True
  function loadGame(e) {
    e.preventDefault()
    const loadURL = baseUrl + '/load'
    const identifier = loadRequest + "-" + gameState.userIp
    axios.get(loadURL, { params: { identifier: identifier, "ip_address": gameState.userIp } })
      .then(function (response) {
        setUserName(response.data.userName)
        const updatedItems = response.data
        updatedItems["history"] = []
        updatedItems["input"] = ""
        setGameState(gameState => ({
          ...gameState,
          ...updatedItems
        }))
      })
      .then(
        setIsPlaying(true)
      )
  }

  // To quit the game, ping the server /quit
  // Reset the gameState to original status
  // Update the available load games
  function quitGame(e) {
    e.preventDefault()
    const quitURL = baseUrl + '/quit'

    axios.get(quitURL, { params: { identifier: gameState.identifier, ip_address: gameState.userIp }})
      .then(function (response) {
        setInput("")
        setLoadGames(response.data.loadGames)
        const updatedItems = {
          "command": "",
          "identifier": "",
          "history": [],
          "location": "",
          "offMsg": response.data.output,
          "output": "",
        }
        setGameState(gameState => ({
          ...gameState,
          ...updatedItems
        }))
      })
      .then( () => {
        setIsPlaying(false)
        setMusicPlaying(false)})

  }

  // When the user leaves the page, ping server /quit
  // so it can perform clean up functions
  window.onbeforeunload = () => {
    // no clean up require if an identifier has not been set ()
    if (gameState.identifier === "") { return }
    const quitURL = baseUrl + '/quit'
    axios.get(quitURL, { params: { identifier: gameState.identifier } })
  };

  // each time a users presses enter to send a command
  // if the command is not an empty string, ping the server /
  // response data is used to update the interaction history and location
  function handleCommand(e) {
    e.preventDefault()
    // do nothing if the user did not enter a command
    if (input === "") {
      return
    }
    // otherwise, send a request containing the command to the server
    else {
      axios.get(baseUrl, { params: { command: input, identifier: gameState.identifier } })
        .then(function (response) {
          const updatedItems = response.data
          updatedItems["command"]= input;
          setGameState(gameState => ({
            ...gameState,
            ...updatedItems
          }))
        })
    }
  }

  return (
    <div className="App">
      <ReactHowler src={happyTune} loop={true} playing={musicPlaying} volume={0.3}/>
      <main className='main-content'>
        {isPlaying ?
          <GameOnDisplay
          formSubmit={e => handleCommand(e)}
          onChange={e => setInput(e.target.value)}
          history={gameState.history} 
          loadGames={loadGames}
          />
          :
          <GameOffDisplay
          offMsg={gameState.offMsg}
          />
        }
        <SidePanel
          newGameFunction={e => newGame(e)}
          saveFunction={e => saveGame(e)}
          loadFunction={e => loadGame(e)}
          loadGames={loadGames}
          loadRequest={loadRequest}
          onLoadRequestChange={e => setLoadRequest(e.target.value)}
          quitFunction={e => quitGame(e)}
          userName={userName}
          onUsernameChange={e => setUserName(e.target.value)}
          isPlaying={isPlaying}
          location={gameState.location}
        />
      </main>
        <div className="footer">created by: <br /><mark className='purple-word'>Alex Meyers</mark>, <mark className='green-word'>Armon Tavakoulnia</mark>, & <mark className='pink-word'>Taylor Kuno</mark></div>
    </div>
  );
};

export default App;