import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const dataUrl = `https://${process.env.REACT_APP_API_HOST}/${process.env.REACT_APP_STAGE}/${process.env.REACT_APP_API_URL}`;

type Actors = Actor[];

type Actor = {
  id: number;
  firstName: string;
  surname: string;
  character: string;
};

function App() {
  const [data, setUserData] = useState<Actors>([]);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    getActorsWithFetch();
  }, []);

  const getActorsWithFetch = async () => {
    try {
      setIsError(false);
      const result = await axios(dataUrl);
      setUserData(result.data);
    } catch (error) {
      setIsError(true);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>GoT Actors</h2>
        <h5>The table below shows some of the characters from Game of Thrones</h5>
      </header>
      <div className="title-container">
        <div className="title-item">Firstname</div>
        <div className="title-item">Surname</div>
        <div className="title-item">Character</div>
      </div>
      {isError && <div className="error-item">Something went wrong..</div>}
      {data.map((actor) => (
        <div className="user-container">
          <div className="info-item">{actor.firstName}</div>
          <div className="info-item">{actor.surname}</div>
          <div className="info-item">{actor.character}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
