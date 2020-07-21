const express = require('express');
const app = express()
const port = 1717
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const shortid = require('shortid')
const cors = require('cors')
app.use(cors())

const bodyParser = require('body-parser');

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));


const defaultData = require('./defaultData')

app.use(express.json())

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults(defaultData).write()

//Get запросы


app.get('/list', (req, res) => {
    const list = db.get('list')
    res.send(list)
})


app.get('/list/:id', (req, res) => {
    const id = req.params.id
    const item = db.get('list').find({ id })
    if (!item) res.status(400).send('Bad Request')
    res.send(item)
})

app.get('/data', (req, res) => {
    const users = db.get('users')
    const token = req.get('X-Auth')
    const isAuth = db.get('users').find({ token }).value()
    if (!isAuth) return error(res, 403, 'Access is denied')
    res.send(users)
})

app.get('/profile', (req, res) => {
    const token = req.get('X-Auth')
    const profile = db.get('users').find({ token }).value()
    if (!profile) return error(res, 403, 'Access is denied')
    res.send(profile)
})

app.get('/users-list', (req, res) => {
    const users = db.get('users')
    if (!users) return error(res, 403, 'Access is denied')
    res.send(users)
})

// Post запросы

app.post('/add', (req, res) => {
    // if (!req.body.text) return error(res, 400, 'text attribute is required')

    const id = shortid.generate()
    const addedItem = { id, ...req.body }

    db.get('list').push(addedItem).write()
    res.send(addedItem)
})

app.post('/login', (req, res) => {
    const { username, password } = req.body
    if (!username) return error(res, 400, 'username attribute is required')
    if (!password) return error(res, 400, 'password attribute is required')

    const user = db.get('users').find({ data: { username, password } }).value()
    if (!user) return error(res, 403, 'incorrect login data')
    res.send({ user })
})

app.post('/signin', (req, res) => {
    const id = shortid.generate()
    const { firstname, lastname, username, password, mail, phone, isAdmin, image, favorites} = req.body
    if (!firstname) return error(res, 400, 'firstname attribute is required')
    if (!lastname) return error(res, 400, 'lastname attribute is required')
    if (!username) return error(res, 400, 'username attribute is required')
    if (!password) return error(res, 400, 'password attribute is required')
    if (!mail) return error(res, 400, 'mail attribute is required')
    if (!phone) return error(res, 400, 'phone attribute is required')

    const existed = db.get('users').find({ data: { username } }).value()
    if (existed) return error(res, 400, 'user with this username already exists')

    if (!password) return error(res, 400, 'password attribute is required')
    const data = { firstname, lastname, username, password, phone, mail, image, isAdmin, id, favorites}

    db.get('users').push({ data, token: `token_${shortid.generate()}` }).write()
    const user = db.get('users').find({ data: { username, password } }).value()
    res.send({ user })
})


// Put запросы

app.put('/edit/:id', (req, res) => {
    const { id } = req.params
    const item = db.get('list').find({ id })

    if (!item.value()) error(res, 404, `Item with id (${id}) not found`)

    item.assign(req.body).write()
    res.send(item)
})

app.put('/edit-profile/:id', (req, res) => {
    const { id } = req.params
    // нашли юзера по id
    const user = db.get('users').find({ data: { id } })
    if (!user) return error(res, 404, 'user not found')
    // у этого же юзера нашли объект дата и сделали assign к нему
    user.get('data').assign({ image: req.body.image }).write()
    res.send(user)
})

app.put('/edit-profile-info/:id', (req, res) => {
    const { id } = req.params
    const {lastname, firstname, mail, phone} = req.body
    const user = db.get('users').find({ data: { id } })
    if (!user) return error(res, 404, 'user not found')
    user.get('data').assign({ lastname, firstname, mail, phone }).write()
    res.send(user)
})

app.put('/favorites/:id', (req, res) => {
    const { id } = req.params
    // нашли юзера по id
    const user = db.get('users').find({ data: { id } })
    if (!user) return error(res, 404, 'user not found')
    // у этого же юзера нашли объект дата где нашли объект favoritesList и сделали пуш к нему
    user.get('data').get('favoritesList').push(req.body.idList).write()
    res.send(user)
})

// Delete запросы

app.delete('/delete/:id', (req, res) => {
    const { id } = req.params
    const item = db.get('list').find({ id })

    if (!item.value()) error(res, 404, `Item with id (${id}) not found`)

    db.get('list').remove({ id }).write()
    res.status(200).json('Successful DELETE').end()
})


app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

