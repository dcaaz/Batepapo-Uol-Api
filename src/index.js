import express, { json } from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import dayjs from "dayjs";

//configs
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); //receber req do cliente no formato json

const mongoClient = new MongoClient("mongodb://localhost:27017"); //porta do mongo

await mongoClient.connect()
const db = mongoClient.db("batePapoUOl");

const users = db.collection("users");
const messages = db.collection("messages");

const time = dayjs().format("HH:mm:ss");

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    if (!name || name === Number || name === "") {
        return res.sendStatus(422); //equivalente a res.status(422).send('OK')
    }

    const user = {
        name,
        lastStatus: Date.now()
    };

    const data = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time
    }

    try { //tudo que é para tentar fazer
        await messages.insertOne(data); // inserindo no mongo
        await users.insertOne(user);
        res.sendStatus(201);
    } catch (err) { //se der errado
        res.sendStatus(500);
    }

});

app.get("/participants", async (req, res) => {
    try {
        const listParticipants = await users.find().toArray();
        res.send(listParticipants);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;

    const { user } = req.headers;

    const types = ("message" || "private_message");
    const from = users.find(atualUser => atualUser.name === user);

    if (!to || !text || !types || !from) {
        return res.sendStatus(422);
    }

    if (!to || !text) {
        return res.sendStatus(422);
    }

    const saveMessage = {
        from: user,
        to,
        text,
        type,
        time
    }

    try {
        await messages.insertOne(saveMessage);
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }

});

app.get("/messages", async (req, res) => {

    const { user } = req.headers;

    let limit = parseInt(req.query.limit);
    limit = (limit > 0) ? limit : 0;

    try {
        const message = await messages
            .find({ $or: [{ "from": user }, { "type": "message" }, { "to": user }, { "to": "Todos" }] })
            .toArray();

        let returned = [];

        for (let i = message.length - limit; i < message.length; i++) {
            returned.push(message[i]);
        };

        res.send(returned);

    } catch (err) {
        res.sendStatus(500);
    }

});

app.post("/status", async (req, res) => {

    const { user } = req.headers;

    console.log("user", user);

    const lastStatus = { $set: { lastStatus: Date.now() } };

    try {
        const participator = await users.find({ name: user }).toArray();

        if (participator.length === 0) {
            return res.sendStatus(404);
        }

        users.updateOne({ name: user }, lastStatus);
        res.sendStatus(200);

    } catch (err) {
        res.status(500).send('Server not running');
    }

});

setInterval(async () => {
    try {
        const arr = await users.find().toArray();

        for (let i = 0; i < arr.length; i++) {
            const checkTime = Date.now() - arr[i].lastStatus;

            if (checkTime >= 10000) {
                const newMessage = {
                    from: arr[i].name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                };
                await messages.insertOne(newMessage);
                await users.deleteOne(arr[i]);
            }
        }
    } catch (err) {
        res.status(500).send('Server not running');
    }

}, 15000);


app.listen(5000, () => {
    console.log("Serving running in port: 5000");
}); //verifica/"escuta" se tem alguma solicitação para acessar a porta