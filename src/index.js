import express, { application } from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json()); //receber req do cliente no formato json
const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() =>{
    db = mongoClient.db("")
}).catch(err => console.log(err));  

app.post("/participants", (req, res) => {

    const { name } = req.body;

    if(!name || name === Number){
        return res.sendStatus(422); //equivalente a res.status(422).send('OK')
    }

    console.log("name", name);

    res.status(201).send("OK");

});

app.get("/participants", (req, res) => {
});

app.post("/messages", (req, res) => {
});

app.get("/messages", (req, res) => {
});

app.post("/status", (req, res) => {
    const {User} = req.header

    if(!User){
        return res.sendStatus(404)
    }

    res.sendStatus(200);
});


app.listen(5000, () => {
    console.log("Serving running in port: 5000");
}); //verifica/"escuta" se tem alguma solicitação para acessar a porta