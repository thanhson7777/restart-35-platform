import ReactDOM from 'react-dom/client'
import App from '~/App.jsx'
import { Provider } from 'react-redux'
import { store } from '~/redux/store'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { injectStore } from './utils/authorizeAxios'
import './index.css'

const persistor = persistStore(store)
injectStore(store)

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate persistor={persistor} >
      <BrowserRouter basename='/'>
        <App />
      </BrowserRouter>
    </PersistGate>
  </Provider>
)