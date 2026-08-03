const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Nexus Link Server Running");
});


const server = app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});


const wss = new WebSocketServer({
    server
});


let devices = {};


wss.on("connection", (ws) => {

    console.log("Device Connected");


    ws.on("message", (data) => {

        let message = JSON.parse(data);

        console.log(message);


        if(message.type === "register"){

            devices[message.deviceID] = ws;

            console.log(
                "Registered:",
                message.deviceID
            );

        }


        if(message.type === "send"){

            let target = devices[message.target];

            if(target){

                target.send(
                    JSON.stringify(message)
                );

            }

        }


    });


    ws.on("close", () => {

        console.log("Device Disconnected");

    });


});
