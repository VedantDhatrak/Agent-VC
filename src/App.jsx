import React, { useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import './index.css';

import { CallCard } from './components/CallCard';
import { ActiveCallInterface } from './components/ActiveCallInterface';

function App() {
  const [connectionDetails, setConnectionDetails] = useState(null);

  const handleStartCall = (url, token) => {
    setConnectionDetails({ url, token });
  };

  const handleEndCall = () => {
    setConnectionDetails(null);
  };

  return (
    <div className="app-container">
      {!connectionDetails ? (
        <CallCard onStartCall={handleStartCall} />
      ) : (
        <LiveKitRoom
          serverUrl={connectionDetails.url}
          token={connectionDetails.token}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleEndCall}
        >
          <ActiveCallInterface onEndCall={handleEndCall} />
        </LiveKitRoom>
      )}
    </div>
  );
}

export default App;
