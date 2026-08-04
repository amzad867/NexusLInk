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


setInterval(() => {

    wss.clients.forEach((client) => {

        if(client.readyState === 1){

            client.ping();

        }

    });

}, 7000);

wss.on("connection", (ws) => {

    console.log("Device Connected");


    ws.on("message", (data) => {

        let message = JSON.parse(data);

        console.log(message);


        if(message.type === "register"){

            devices[message.deviceId] = ws;

            console.log(
                "Registered:",
                message.deviceId
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

        if(message.type === "pair"){

    let tablet = devices[message.tabletID];

    if(tablet){

        ws.send(JSON.stringify({

            type:"pair_success",

            tabletID:message.tabletID

        }));


        tablet.send(JSON.stringify({

            type:"pair_request",

            phoneID:message.phoneID

        }));

    }else{

        ws.send(JSON.stringify({

            type:"pair_failed",

            message:"Tablet not found"

        }));

    }

}

    });


    ws.on("close", () => {

        console.log("Device Disconnected");

    });


});
