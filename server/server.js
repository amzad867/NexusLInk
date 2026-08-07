const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();

const PORT = process.env.PORT || 3000;


app.get("/", (req, res) => {
    res.send("Nexus Link Server Running");
});


const server = app.listen(PORT, () => {

    console.log(
        "Server running on port " + PORT
    );

});


const wss = new WebSocketServer({
    server
});


let devices = {};


wss.on("connection", (ws) => {


    console.log("Device Connected");



    ws.on("message", (data) => {


        try {


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


        } catch(error){


            console.log(
                "Message Error:",
                error.message
            );


        }


    });




    ws.on("close", (code, reason) => {


        console.log(
            "Device Disconnected:",
            code,
            reason.toString()
        );


    });



});
