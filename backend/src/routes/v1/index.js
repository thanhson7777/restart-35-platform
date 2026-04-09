import express from 'express'

const Router = express.Router()

Router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to API version 1.0.0'
  })
})


export const APIS_V1 = Router
