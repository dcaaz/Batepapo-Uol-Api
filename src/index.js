import express, { json } from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import dayjs from "dayjs";
import joi from "joi";

const userSchema = joi.object({
    name: joi.string().required()
});
const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
});

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

    const body = req.body;

    const validation = userSchema.validate(body, { abortEarly: false });
    //validando se o body está de acordo com os requisitos passados no userSchema
    //abortEarly false para trazer todos os erros encontrados, se fosse true parava no primeiro erro

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    };

    const nameUsed = await users.findOne({ name: body.name });

    if (nameUsed) {
        return res.status(409).send("Usuario já cadastrado");
    };

    const user = {
        name: body.name,
        lastStatus: Date.now()
    };

    const data = {
        from: body.name,
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

    const body = req.body

    const { user } = req.headers;
    console.log("post user", user);

    const validation = messagesSchema.validate(body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    };

    const from = users.find({ name: user }).toArray();
    const verifyFrom = from.length <= 0 ? true : false;

    if (verifyFrom) {
        return res.sendStatus(422);
    }

    const saveMessage = {
        from: user,
        to: body.to,
        text: body.text,
        type: body.type,
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

    console.log("user", user)

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

    const lastStatus = { $set: { lastStatus: Date.now() } };

    try {
        const participator = await users.find({ name: user }).toArray();
        console.log("participator", participator);

        if (participator.length === 0) {
            return res.sendStatus(404);
        }

        users.updateOne({ name: user }, lastStatus); //atualiza um único documento dentro da coleção com base no filtro.

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