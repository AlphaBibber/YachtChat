import React from 'react';
import './App.css';
import Navigation from "./components/navigation";
import {ReactKeycloakProvider} from '@react-keycloak/web'
import {auth} from "./util/keycloak";


function App() {
    return (
        <ReactKeycloakProvider authClient={auth} initOptions={{onLoad: "check-sso"}}>

            <div className="App">
                <Navigation/>
            </div>
        </ReactKeycloakProvider>
    );
}

export default App;
