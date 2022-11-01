import './App.css';
import { React, useState, useEffect } from 'react';
import axios from 'axios';
import "nes.css/css/nes.min.css";
import { MainInput } from './components/MainInput';
import { InteractionDisplay } from './components/InteractionDisplay';
import { SidePanel } from './components/SidePanel';


const baseUrl = 'https://tlkuno.pythonanywhere.com'

function App() {

  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(null);
  const [history, setHistory] = useState([]);
  const [numInteractions, setNumInteractions] = useState(0);
  const [confirmMsg, setConfirmMsg] = useState(null)

  useEffect(() => {
    if (output !== null) {
      interact();
    }
  }, [numInteractions]);

  useEffect(() => {
    if (confirmMsg !== null) {
    const newHistory = history.slice()
    // if (newHistory.length > 8) { newHistory.splice(0, 2) } limit the number of interactions
    newHistory.push(
      { 'type': 'bot', 'content': confirmMsg })
    setHistory(newHistory)
    }
  }, [confirmMsg]);


  function newGame(e) {
    e.preventDefault()
    const newURL = baseUrl + '/new'
    axios.post(newURL)
      .then(function (response) {
        setConfirmMsg(response.data.intro)
      })
  }

  function saveGame(e) {
    e.preventDefault()
    const saveURL = baseUrl + '/save'
    axios.post(saveURL)
      .then(function (response) {
        setConfirmMsg(response.data.confirmation)
      })
  }

  function loadGame(e) {
    e.preventDefault()
    const loadURL = baseUrl + '/load'
    axios.get(loadURL)
      .then(function (response) {
        setConfirmMsg(response.data.confirmation)
      })
  }

  function interact() {
    const newHistory = history.slice()
    // if (newHistory.length > 8) { newHistory.splice(0, 2) } limit the number of interactions
    newHistory.push(
      { 'type': 'user', 'content': command },
      { 'type': 'bot', 'content': output })
    setHistory(newHistory)
    document.getElementById('main_input').value = '';
  }

  function handleClick(e) {
    e.preventDefault()
    axios.get(baseUrl, { params: { command: command } }
    )
      .then(function (response) {
        setNumInteractions(numInteractions + 1)
        setOutput(response.data.output)
      })
  }

  return (
    <div className="App">
      <main className='main-content'>
        <SidePanel
          newGameFunction={e => newGame(e)}
          saveFunction={e => saveGame(e)}
          loadFunction={e => loadGame(e)} />
        <div className='game-display'>
          <InteractionDisplay history={history} />
          <form onSubmit={e => handleClick(e)}>
            <MainInput
              onChange={e => setCommand(e.target.value)}
            />
          </form>
        </div>
      </main>
    </div>
  );
};

export default App;
